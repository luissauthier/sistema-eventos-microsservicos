// main/ipc/ipc-sync.js
/**
 * IPC Handler — Sincronização
 *
 * Responsável por coordenar o fluxo de dados entre API e SQLite.
 * Usa transações manuais para garantir integridade.
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const { getAuthToken } = require("./ipc-auth");
const api = require("../services/api");

const logger = createLogger("ipc-sync");

// Recebe a instância do DB (Injeção de Dependência)
module.exports = function registerSyncHandlers(db) {

  /* ---------------------------------------------------
     IPC: SINCRONIZAR DOWNLOAD (API -> Local)
  ---------------------------------------------------- */
  ipcMain.handle("sincronizar-download", async () => {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: "Não autenticado." };
    }

    logger.info("sync_download_started");

    let tx;
    try {
      // 1) Buscar dados da API
      const [eventos, usuarios, inscricoes] = await Promise.all([
        api.getEventos(token),
        api.getAllUsers(token),
        api.getAllInscricoes(token)
      ]);

      // 2) Inicia transação
      tx = await db.transactionStart();

      // 3) SALVAR EVENTOS
      // Prepara o statement uma vez (performance)
      const stmtEvt = db.prepare(`
        INSERT OR REPLACE INTO eventos (id_server, nome, data_evento, descricao)
        VALUES (?, ?, ?, ?)
      `);

      for (const evt of eventos) {
        await stmtEvt.run([
          evt.id,
          evt.nome,
          evt.data_evento,
          evt.descricao || null
        ]);
      }
      await stmtEvt.finalize();

      // 4) SALVAR USUÁRIOS
      const stmtUser = db.prepare(`
        INSERT INTO usuarios (server_id, nome, email, sincronizado)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(server_id) DO UPDATE
        SET nome = excluded.nome, email = excluded.email, sincronizado = 1
      `);

      for (const user of usuarios) {
        await stmtUser.run([
          user.id,
          user.full_name || user.username,
          user.email
        ]);
      }
      await stmtUser.finalize();

      // 5) SALVAR INSCRIÇÕES
      // Precisamos buscar o ID local do usuário para vincular corretamente
      const stmtIns = db.prepare(`
        INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, sincronizado)
        SELECT ?, u.id_local, ?, 1
        FROM usuarios u WHERE u.server_id = ?
        ON CONFLICT(server_id) DO NOTHING
      `);

      for (const insc of inscricoes) {
        await stmtIns.run([
          insc.id,
          insc.evento_id, // evento_id_server
          insc.usuario_id // usuario_server_id (usado no WHERE)
        ]);
      }
      await stmtIns.finalize();

      // 6) Commit
      await db.transactionCommit(tx);

      logger.info("sync_download_success", {
        eventos: eventos.length,
        usuarios: usuarios.length,
        inscricoes: inscricoes.length
      });

      return {
        success: true,
        message: `Download concluído.`,
        eventos: eventos.length,
        usuarios: usuarios.length,
        inscricoes: inscricoes.length
      };

    } catch (err) {
      logger.error("sync_download_error", { error: err.message });
      if (tx) await db.transactionRollback(tx);

      return {
        success: false,
        message: err.message || "Falha ao sincronizar (Download)."
      };
    }
  });


  /* ---------------------------------------------------
     IPC: SINCRONIZAR UPLOAD (Local -> API)
  ---------------------------------------------------- */
  ipcMain.handle("sincronizar-upload", async () => {
    const token = getAuthToken();
    if (!token) {
      return { success: false, message: "Não autenticado." };
    }

    logger.info("sync_upload_started");

    let tx;
    let usersSynced = 0, subsSynced = 0, checksSynced = 0;

    try {
      // Nota: Como o upload faz chamadas de API que demoram,
      // não é ideal manter uma transação de banco aberta o tempo todo.
      // Faremos as leituras, envios e updates individualmente ou em blocos.
      
      // 1) UPLOAD DE USUÁRIOS
      const usuarios = await db.all(`SELECT * FROM usuarios WHERE sincronizado = 0`);

      for (const usr of usuarios) {
        // Envia para API
        const res = await api.registerUser(token, {
             nome: usr.nome,
             email: usr.email,
             senha: usr.senha // Senha salva localmente
        });
        
        // Marca como sincronizado
        await db.run(
          `UPDATE usuarios SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
          [res.id, usr.id_local]
        );
        usersSynced++;
      }

      // 2) UPLOAD DE INSCRIÇÕES
      // Precisamos ter certeza que o usuário já tem server_id
      const inscricoes = await db.all(`
        SELECT i.id_local, i.evento_id_server, u.server_id as usuario_server_id
        FROM inscricoes i
        JOIN usuarios u ON u.id_local = i.usuario_id_local
        WHERE i.sincronizado = 0 AND u.server_id IS NOT NULL
      `);

      for (const ins of inscricoes) {
        const created = await api.createInscricaoAdmin(token, {
            evento_id_server: ins.evento_id_server,
            usuario_server_id: ins.usuario_server_id
        });
        
        await db.run(
          `UPDATE inscricoes SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
          [created.id, ins.id_local]
        );
        subsSynced++;
      }

      // 3) UPLOAD DE PRESENÇAS
      const presencas = await db.all(`
        SELECT p.id_local, i.server_id as inscricao_server_id
        FROM presencas p
        JOIN inscricoes i ON p.inscricao_id_local = i.id_local
        WHERE p.sincronizado = 0 AND i.server_id IS NOT NULL
      `);

      for (const pres of presencas) {
        await api.registerPresenca(token, pres.inscricao_server_id);
        
        await db.run(
          `UPDATE presencas SET sincronizado = 1 WHERE id_local = ?`,
          [pres.id_local]
        );
        checksSynced++;
      }

      logger.info("sync_upload_success", {
        users: usersSynced,
        inscricoes: subsSynced,
        presencas: checksSynced
      });

      return {
        success: true,
        message: `Upload concluído.`,
        usersSynced,
        subsSynced,
        checksSynced,
      };

    } catch (err) {
      logger.error("sync_upload_error", { error: err.message });
      // Não fazemos rollback aqui pois os commits foram incrementais (o que subiu, subiu)

      return {
        success: false,
        message: err.response?.data?.detail || err.message || "Erro no upload."
      };
    }
  });

};