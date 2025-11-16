// main/ipc/ipc-sync.js
/**
 * IPC Handler — Sincronização
 *
 * DOWNLOAD:
 *   - eventos
 *   - usuários
 *   - inscrições
 *
 * UPLOAD:
 *   - usuários criados offline
 *   - inscrições locais
 *   - presenças locais
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const { getAuthToken } = require("./ipc-auth");
const api = require("../services/api");
const db = require("../db/db");

const logger = createLogger("ipc-sync");


/* ---------------------------------------------------
   FUNÇÃO: Registrar todos os IPCs deste módulo
---------------------------------------------------- */
function registerSyncHandlers() {

  /* ---------------------------------------------------
     IPC: SINCRONIZAR DOWNLOAD
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
        api.getAllUsers(token),     // rota admin
        api.getAllInscricoes(token) // rota admin
      ]);

      // 2) Inicia transação
      tx = db.transactionStart();

      // 3) SALVAR EVENTOS
      const stmtEvt = db.prepare(`
        INSERT OR REPLACE INTO eventos (id_server, nome, data, descricao)
        VALUES (?, ?, ?, ?)
      `);

      for (const evt of eventos) {
        stmtEvt.run([
          evt.id,
          evt.nome,
          evt.data_evento,
          evt.descricao || null
        ]);
      }
      stmtEvt.finalize();

      // 4) SALVAR USUÁRIOS
      const stmtUser = db.prepare(`
        INSERT INTO usuarios (server_id, nome, email, sincronizado)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(server_id) DO UPDATE
        SET nome = excluded.nome, email = excluded.email
      `);

      for (const user of usuarios) {
        stmtUser.run([
          user.id,
          user.full_name || user.username,
          user.email
        ]);
      }
      stmtUser.finalize();

      // 5) SALVAR INSCRIÇÕES
      const stmtIns = db.prepare(`
        INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, sincronizado)
        SELECT ?, u.id_local, ?, 1
        FROM usuarios u WHERE u.server_id = ?
        ON CONFLICT(server_id) DO NOTHING
      `);

      for (const insc of inscricoes) {
        stmtIns.run([
          insc.id,
          insc.evento_id,
          insc.usuario_id
        ]);
      }
      stmtIns.finalize();

      // 6) Commit
      db.transactionCommit(tx);

      logger.info("sync_download_success", {
        eventos: eventos.length,
        usuarios: usuarios.length,
        inscricoes: inscricoes.length
      });

      return {
        success: true,
        message: `Sincronização concluída.`,
        eventos: eventos.length,
        usuarios: usuarios.length,
        inscricoes: inscricoes.length
      };

    } catch (err) {
      logger.error("sync_download_error", { error: err.message });
      if (tx) db.transactionRollback(tx);

      return {
        success: false,
        message: err.message || "Falha ao sincronizar."
      };
    }
  });


  /* ---------------------------------------------------
     IPC: SINCRONIZAR UPLOAD
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
      tx = db.transactionStart();

      // 1) UPLOAD DE USUÁRIOS CRIADOS OFFLINE
      const usuarios = db.all(`
        SELECT * FROM usuarios WHERE sincronizado = 0
      `);

      for (const usr of usuarios) {
        const res = await api.registerUser(token, usr);
        db.run(
          `UPDATE usuarios SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
          [res.id, usr.id_local]
        );
        usersSynced++;
      }

      // 2) UPLOAD DE INSCRIÇÕES LOCAIS
      const inscricoes = db.all(`
        SELECT i.id_local, i.evento_id_server, u.server_id as usuario_server_id
        FROM inscricoes i
        JOIN usuarios u ON u.id_local = i.usuario_id_local
        WHERE i.sincronizado = 0 AND u.server_id IS NOT NULL
      `);

      for (const ins of inscricoes) {
        const created = await api.createInscricaoAdmin(token, ins);
        db.run(
          `UPDATE inscricoes SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
          [created.id, ins.id_local]
        );
        subsSynced++;
      }

      // 3) UPLOAD DE PRESENÇAS LOCAIS
      const presencas = db.all(`
        SELECT p.id_local, i.server_id as inscricao_server_id
        FROM presencas p
        JOIN inscricoes i ON p.inscricao_id_local = i.id_local
        WHERE p.sincronizado = 0 AND i.server_id IS NOT NULL
      `);

      for (const pres of presencas) {
        await api.registerPresenca(token, pres.inscricao_server_id);
        db.run(
          `UPDATE presencas SET sincronizado = 1 WHERE id_local = ?`,
          [pres.id_local]
        );
        checksSynced++;
      }

      db.transactionCommit(tx);

      logger.info("sync_upload_success", {
        users: usersSynced,
        inscricoes: subsSynced,
        presencas: checksSynced
      });

      return {
        success: true,
        message: `Upload OK`,
        usersSynced,
        subsSynced,
        checksSynced,
      };

    } catch (err) {
      if (tx) db.transactionRollback(tx);
      logger.error("sync_upload_error", { error: err.message });

      return {
        success: false,
        message: err.response?.data?.detail || err.message
      };
    }
  });

}

module.exports = registerSyncHandlers;