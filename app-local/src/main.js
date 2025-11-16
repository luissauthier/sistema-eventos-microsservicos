const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const started = require('electron-squirrel-startup');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios'); // Para chamadas de API reais

// --- Variáveis Globais de API ---
let db; // Conexão DB
let authToken = null; // Token JWT do atendente
const API_URL = 'http://localhost'; // O nosso gateway Nginx

// --- INÍCIO: CÓDIGO DO BANCO DE DADOS ---
// (Baseado no código do Luís)
function initDatabase(appInstance) {
  const dbPath = path.join(appInstance.getPath('userData'), 'eventos-local.db');
  console.log(`Caminho do Banco de Dados: ${dbPath}`);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Erro ao abrir o banco de dados:', err.message);
    else {
      console.log('Conectado ao banco de dados SQLite local.');
      criarTabelas();
    }
  });
}

function criarTabelas() {
  // Esquema de BD local robusto para suportar sincronização
  const sqlTabelas = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id_local INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER UNIQUE, -- ID do servidor
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT, -- Só para registo local, NUNCA sincronizado para cima
      sincronizado INTEGER DEFAULT 0 -- 0 = pendente, 1 = ok
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id_server INTEGER PRIMARY KEY, -- O ID da API
      nome TEXT,
      data TEXT,
      descricao TEXT
    );

    CREATE TABLE IF NOT EXISTS inscricoes (
      id_local INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER UNIQUE, -- ID da API
      usuario_id_local INTEGER NOT NULL,
      evento_id_server INTEGER NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      FOREIGN KEY (usuario_id_local) REFERENCES usuarios (id_local),
      FOREIGN KEY (evento_id_server) REFERENCES eventos (id_server)
    );
    
    CREATE TABLE IF NOT EXISTS presencas (
      id_local INTEGER PRIMARY KEY AUTOINCREMENT,
      inscricao_id_local INTEGER NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      FOREIGN KEY (inscricao_id_local) REFERENCES inscricoes (id_local)
    );
  `;
  
  db.exec(sqlTabelas, (err) => {
    if (err) console.error('Erro ao criar tabelas:', err.message);
    else console.log('Tabelas locais verificadas/criadas com sucesso.');
  });
}
// --- FIM: CÓDIGO DO BANCO DE DADOS ---


// --- Lógica do Electron (Janela) ---
if (started) app.quit();
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  mainWindow.webContents.openDevTools();
};
app.whenReady().then(() => {
  initDatabase(app);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
// --- Fim da Lógica do Electron ---


// ---------------------------------------------------
// --- HANDLERS DA API (Processo Principal) ---
// ---------------------------------------------------

// --- FLUXO ONLINE ---

// ITEM 12 (Modo Online): Login do Atendente
ipcMain.handle('login-api', async (event, { username, password }) => {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await axios.post(`${API_URL}/auth`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    authToken = response.data.access_token;
    
    const userResponse = await axios.get(`${API_URL}/usuarios/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!userResponse.data.is_admin) {
      authToken = null;
      throw new Error('Acesso negado. A aplicação local é apenas para atendentes/admins.');
    }
    
    return { success: true, user: userResponse.data };
  } catch (err) {
    console.error('Erro no login API:', err.message);
    authToken = null;
    return { success: false, message: err.response?.data?.detail || err.message };
  }
});

// ITEM 12 (Modo Online): Sincronizar dados PARA o app local
ipcMain.handle('sincronizar-download', async (event) => {
  if (!authToken) return { success: false, message: 'Não autenticado.' };

  let transactionStarted = false;
  
  try {
    const headers = { 'Authorization': `Bearer ${authToken}` };
    
    // 1. Buscar Eventos, Utilizadores e TODAS as Inscrições
    const [eventsResponse, usersResponse, inscResponse] = await Promise.all([
      axios.get(`${API_URL}/eventos`, { headers }),
      axios.get(`${API_URL}/usuarios`, { headers }), // Requer Admin
      axios.get(`${API_URL}/inscricoes/all`, { headers }) // Requer Admin
    ]);

    await dbRun("BEGIN TRANSACTION");
    transactionStarted = true;
    
    // 2. Salvar Eventos (INSERT OR REPLACE)
    const eventSql = `INSERT OR REPLACE INTO eventos (id_server, nome, data, descricao) VALUES (?, ?, ?, ?)`;
    const eventStmt = db.prepare(eventSql);
    for (const evt of eventsResponse.data) {
      await dbRunPrepared(eventStmt, [evt.id_server, evt.nome, evt.data_evento, evt.descricao]);
    }
    eventStmt.finalize();

    // 3. Salvar Utilizadores (INSERT OR REPLACE)
    const userSql = `
      INSERT INTO usuarios (server_id, nome, email, sincronizado) VALUES (?, ?, ?, 1)
      ON CONFLICT(server_id) DO UPDATE SET nome = excluded.nome, email = excluded.email
    `;
    const userStmt = db.prepare(userSql);
    for (const user of usersResponse.data) {
      await dbRunPrepared(userStmt, [user.id, user.full_name, user.email]);
    }
    userStmt.finalize();
    
    // 4. Salvar Inscrições (INSERT OR REPLACE)
    const inscSql = `
      INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, sincronizado) 
      SELECT ?, u.id_local, ?, 1
      FROM usuarios u WHERE u.server_id = ?
      ON CONFLICT(server_id) DO NOTHING
    `;
    const inscStmt = db.prepare(inscSql);
    for (const insc of inscResponse.data) {
      await dbRunPrepared(inscStmt, [insc.id, insc.evento_id, insc.usuario_id]);
    }
    inscStmt.finalize();
    
    await dbRun("COMMIT");

    console.log('Sincronização (Download) concluída.');
    return { success: true, message: `Sincronizados: ${eventsResponse.data.length} eventos, ${usersResponse.data.length} utilizadores, ${inscResponse.data.length} inscrições.` };
  } catch (err) {
    // Só faz ROLLBACK se a transação tiver começado
    if (transactionStarted) {
      await dbRun("ROLLBACK");
    }
    console.error('Erro na sincronização (Download):', err.stack);
    return { success: false, message: 'Falha ao sincronizar dados. (O seu token pode ter expirado. Tente fazer login novamente.)' };
  }

});

// --- FLUXO OFFLINE (Itens 14, 15, 16) ---

// ITEM 14: Cadastrar utilizador localmente
ipcMain.handle('cadastrar-usuario-local', async (event, usuario) => {
  const { nome, email, senha } = usuario;
  const sql = `INSERT INTO usuarios (nome, email, senha, sincronizado) VALUES (?, ?, ?, 0)`;
  try {
    const result = await dbRun(sql, [nome, email, senha]);
    return { success: true, id: result.lastID }; // Retorna o ID local
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ITEM 15: Inscrever localmente
ipcMain.handle('inscrever-local', async (event, inscricao) => {
  const { usuario_id_local, evento_id_server } = inscricao;
  const sql = `INSERT INTO inscricoes (usuario_id_local, evento_id_server, sincronizado) VALUES (?, ?, 0)`;
  try {
    const result = await dbRun(sql, [usuario_id_local, evento_id_server]);
    return { success: true, id: result.lastID }; // Retorna o ID local
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// ITEM 16: Registar presença localmente
ipcMain.handle('registrar-presenca-local', async (event, inscricaoIdLocal) => {
  const sql = `INSERT INTO presencas (inscricao_id_local, sincronizado) VALUES (?, 0)`;
  try {
    const result = await dbRun(sql, [inscricaoIdLocal]);
    return { success: true, id: result.lastID };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// --- FUNÇÕES DE LEITURA LOCAL ---

ipcMain.handle('buscar-dados-locais', async () => {
  try {
    const eventos = await dbRunAll(`SELECT * FROM eventos ORDER BY data`);
    const inscricoes = await dbRunAll(`
      SELECT i.id_local, i.evento_id_server, u.nome as nome_usuario, e.nome as nome_evento
      FROM inscricoes i
      JOIN usuarios u ON i.usuario_id_local = u.id_local
      JOIN eventos e ON i.evento_id_server = e.id_server
    `);
    const presencas = await dbRunAll(`SELECT * FROM presencas`);
    return { success: true, eventos, inscricoes, presencas };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// --- ITEM 19: Sincronizar (Upload) ---

ipcMain.handle('sincronizar-upload', async () => {
  if (!authToken) return { success: false, message: 'Não autenticado.' };
  
  const headers = { 'Authorization': `Bearer ${authToken}` };
  let usersSynced = 0, subsSynced = 0, checksSynced = 0;

  try {
    await dbRun("BEGIN TRANSACTION");
    
    // 1. Sincronizar UTILIZADORES (Item 14)
    const users = await dbRunAll("SELECT * FROM usuarios WHERE sincronizado = 0");
    for (const user of users) {
      const apiResponse = await axios.post(`${API_URL}/usuarios`, {
        username: user.email,
        password: user.senha,
        full_name: user.nome,
        email: user.email,
        is_admin: false
      }, { headers });
      
      await dbRun(`UPDATE usuarios SET sincronizado = 1, server_id = ? WHERE id_local = ?`, 
        [apiResponse.data.id, user.id_local]);
      usersSynced++;
    }

    // 2. Sincronizar INSCRIÇÕES (Item 15)
    // (Apenas inscrições cujos utilizadores JÁ estão sincronizados)
    const inscricoes = await dbRunAll(`
      SELECT i.id_local, i.evento_id_server, u.server_id as usuario_server_id 
      FROM inscricoes i
      JOIN usuarios u ON i.usuario_id_local = u.id_local
      WHERE i.sincronizado = 0 AND u.server_id IS NOT NULL
    `);
    
    for (const insc of inscricoes) {   
      const apiResponse = await axios.post(`${API_URL}/admin/inscricoes`, {
        evento_id: insc.evento_id_server,
        usuario_id: insc.usuario_server_id // Passa o ID do usuário-alvo
      }, { headers });
      
      await dbRun(`UPDATE inscricoes SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
        [apiResponse.data.id, insc.id_local]);
      subsSynced++;
    }

    const presencas = await dbRunAll(`
        SELECT p.id_local, i.server_id as inscricao_server_id
        FROM presencas p
        JOIN inscricoes i ON p.inscricao_id_local = i.id_local
        WHERE p.sincronizado = 0 AND i.server_id IS NOT NULL
    `);
    
    for (const pres of presencas) {
      // Esta chamada já estava correta. 
      // O atendente (admin) registra a presença.
      await axios.post(`${API_URL}/presencas`, {
        inscricao_id: pres.inscricao_server_id
      }, { headers }); 
      
      await dbRun(`UPDATE presencas SET sincronizado = 1 WHERE id_local = ?`, [pres.id_local]);
      checksSynced++;
    }
    
    await dbRun("COMMIT");
    
    const message = `Sincronização (Upload) concluída: ${usersSynced} utilizadores, ${subsSynced} inscrições, ${checksSynced} presenças.`;
    console.log(message);
    return { success: true, message };

  } catch (err) {
    await dbRun("ROLLBACK");
    console.error('Erro na sincronização (Upload):', err.stack);
    return { success: false, message: err.response?.data?.detail || err.message };
  }
});


// Funções "Helpers" do DB (para usar async/await com sqlite3)
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) { console.error('Erro DB Run:', err.message); reject(err); }
      else resolve(this);
    });
  });
}
function dbRunAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) { console.error('Erro DB All:', err.message); reject(err); }
      else resolve(rows);
    });
  });
}
function dbRunGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) { console.error('Erro DB Get:', err.message); reject(err); }
      else resolve(row);
    });
  });
}