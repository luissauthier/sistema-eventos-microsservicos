import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// --- INÍCIO: CÓDIGO DO BANCO DE DADOS ---
// Importamos os módulos que precisamos aqui
const sqlite3 = require('sqlite3').verbose();
const path_cjs = require('node:path'); // Usamos o 'require' para o path do DB

let db; // Variável para guardar a conexão

/**
 * Inicia o banco de dados.
 * @param {Electron.App} app - A instância principal do app Electron.
 */
function initDatabase(app) {
  // Este é o caminho correto e seguro para salvar dados no Electron
  const dbPath = path_cjs.join(app.getPath('userData'), 'eventos-local.db');
  console.log(`Caminho do Banco de Dados: ${dbPath}`);

  // Conecta ao banco (ou cria o arquivo se ele não existir)
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
      console.log('Conectado ao banco de dados SQLite local.');
      criarTabelas(); // Chama a função para criar as tabelas
    }
  });
}

// Função para criar as tabelas (se não existirem)
function criarTabelas() {
  const sqlTabelas = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT,
      sincronizado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY, -- O ID vem da API
      nome TEXT,
      data TEXT,
      descricao TEXT
    );

    CREATE TABLE IF NOT EXISTS inscricoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id_local INTEGER, -- Chave para o usuário local
      evento_id INTEGER,
      sincronizado INTEGER DEFAULT 0,
      FOREIGN KEY (usuario_id_local) REFERENCES usuarios (id),
      FOREIGN KEY (evento_id) REFERENCES eventos (id)
    );
    
    CREATE TABLE IF NOT EXISTS presencas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscricao_id_local INTEGER, -- Chave para a inscrição local
      sincronizado INTEGER DEFAULT 0,
      FOREIGN KEY (inscricao_id_local) REFERENCES inscricoes (id)
    );
  `;
  
  db.exec(sqlTabelas, (err) => {
    if (err) {
      console.error('Erro ao criar tabelas:', err.message);
    } else {
      console.log('Tabelas locais verificadas/criadas com sucesso.');
    }
  });
}
// --- FIM: CÓDIGO DO BANCO DE DADOS ---


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  initDatabase(app); // <-- Agora funciona, pois a função está neste arquivo
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- OUVINTE PARA O FRONTEND ---
// Espera por uma chamada no canal 'cadastrar-usuario'
ipcMain.handle('cadastrar-usuario', async (event, usuario) => {
  // 'usuario' será o objeto { nome, email, senha } vindo do React
  const { nome, email, senha } = usuario;

  // NOTA: Futuramente, você usará bcrypt aqui para hashear a senha
  const sql = `INSERT INTO usuarios (nome, email, senha, sincronizado) 
               VALUES (?, ?, ?, 0)`;

  // Usamos uma Promise para fazer o 'await' funcionar no frontend
  return new Promise((resolve, reject) => {
    // 'db' é a variável do banco de dados que já criamos
    db.run(sql, [nome, email, senha], function (err) {
      if (err) {
        console.error('Erro ao cadastrar usuário no DB local:', err.message);
        // Rejeita a promise em caso de erro
        reject({ success: false, message: err.message });
      } else {
        console.log(`Usuário cadastrado localmente com ID: ${this.lastID}`);
        // Resolve a promise com sucesso
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

// --- OUVINTE PARA SINCRONIZAÇÃO MOCK ---
// (Cole isto abaixo do handler 'cadastrar-usuario')
ipcMain.handle('sincronizar-eventos-mock', async (event) => {

  // Dados falsos que simulam a API
  const eventosMock = [
    { id: 1, nome: "Hackathon de IA 2025", data: "2025-12-01", descricao: "Evento vindo da API (agora local)." },
    { id: 2, nome: "Workshop de Microsserviços", data: "2025-11-20", descricao: "Aprenda a arquitetura localmente." },
    { id: 3, nome: "Palestra sobre Carreira Dev", data: "2025-11-25", descricao: "Dicas de carreira, agora offline." }
  ];

  console.log('Recebido comando para Sincronização Mock de Eventos...');

  // Usamos uma Promise para garantir que o frontend espere
  return new Promise((resolve, reject) => {
    // 'db.serialize' garante que os comandos rodem em ordem
    db.serialize(() => {
      const sql = `
        INSERT OR IGNORE INTO eventos (id, nome, data, descricao) 
        VALUES (?, ?, ?, ?)
      `;
      const stmt = db.prepare(sql);

      eventosMock.forEach(evt => {
        stmt.run(evt.id, evt.nome, evt.data, evt.descricao, (err) => {
          if (err) {
            console.error('Erro ao inserir evento mock:', err.message);
            reject({ success: false, message: err.message });
            return; // Sai do forEach se der erro
          }
        });
      });

      // Finaliza o 'statement' (muito importante)
      stmt.finalize((err) => {
        if (err) {
          console.error('Erro ao finalizar statement:', err.message);
          reject({ success: false, message: err.message });
        } else {
          console.log('Sincronização mock de eventos concluída.');
          resolve({ success: true, message: `${eventosMock.length} eventos sincronizados (mock)!` });
        }
      });
    });
  });
});

// --- OUVINTE PARA BUSCAR EVENTOS LOCAIS ---
ipcMain.handle('buscar-eventos-locais', async () => {
  const sql = `SELECT * FROM eventos`;

  return new Promise((resolve, reject) => {
    // 'db.all' busca todas as linhas e retorna como um array
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar eventos locais:', err.message);
        reject({ success: false, message: err.message });
      } else {
        console.log(`Eventos locais encontrados: ${rows.length}`);
        resolve({ success: true, data: rows });
      }
    });
  });
});

// --- OUVINTE PARA INSCRIÇÃO LOCAL ---
ipcMain.handle('inscrever-local', async (event, inscricao) => {
  // { usuario_id, evento_id }
  const { usuario_id, evento_id } = inscricao;
  const sql = `INSERT INTO inscricoes (usuario_id_local, evento_id, sincronizado) 
               VALUES (?, ?, 0)`;

  return new Promise((resolve, reject) => {
    // Assumimos que o usuario_id = 1 (o primeiro que você cadastrou)
    db.run(sql, [usuario_id, evento_id], function (err) {
      if (err) {
        console.error('Erro ao salvar inscrição local:', err.message);
        reject({ success: false, message: err.message });
      } else {
        console.log(`Inscrição local salva com ID: ${this.lastID}`);
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

// --- OUVINTE PARA PRESENÇA LOCAL ---
ipcMain.handle('registrar-presenca-local', async (event, inscricaoId) => {

  const sql = `INSERT INTO presencas (inscricao_id_local, sincronizado) 
               VALUES (?, 0)`;

  return new Promise((resolve, reject) => {
    // 'inscricaoId' é o ID da tabela 'inscricoes'
    db.run(sql, [inscricaoId], function (err) {
      if (err) {
        console.error('Erro ao salvar presença local:', err.message);
        reject({ success: false, message: err.message });
      } else {
        console.log(`Presença local salva com ID: ${this.lastID} (para Inscrição ${inscricaoId})`);
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.