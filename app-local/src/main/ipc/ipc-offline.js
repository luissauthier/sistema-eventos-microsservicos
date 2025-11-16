// main/ipc/ipc-offline.js
/**
 * IPC Handler — Operações Offline
 *
 * Este módulo controla TODAS as operações locais feitas com SQLite:
 *   - criar usuário local
 *   - criar inscrição local
 *   - registrar presença local
 *   - consultar dados locais
 *
 * Nenhum conhecimento de API externa.
 * Nenhuma dependência de token.
 * Totalmente isolado do fluxo online.
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const db = require("../db/db");

const logger = createLogger("ipc-offline");


function registerOfflineHandlers() {


  /* ---------------------------------------------------
     OFFLINE 1 — Criar Usuário Local
  ---------------------------------------------------- */
  ipcMain.handle("cadastrar-usuario-local", async (event, usuario) => {
    const { nome, email, senha } = usuario;

    logger.info("local_user_create_attempt", { email });

    if (!nome || !email || !senha) {
      return { success: false, message: "Dados insuficientes." };
    }

    try {
      const result = db.run(
        `INSERT INTO usuarios (nome, email, senha, sincronizado)
         VALUES (?, ?, ?, 0)`,
        [nome, email, senha]
      );

      logger.info("local_user_created", {
        id_local: result.lastInsertRowid,
        email
      });

      return { success: true, id_local: result.lastInsertRowid };

    } catch (err) {
      logger.error("local_user_create_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });



  /* ---------------------------------------------------
     OFFLINE 2 — Criar Inscrição Local
  ---------------------------------------------------- */
  ipcMain.handle("inscrever-local", async (event, inscricao) => {
    const { usuario_id_local, evento_id_server } = inscricao;

    logger.info("local_inscricao_create_attempt", {
      usuario_id_local,
      evento_id_server
    });

    if (!usuario_id_local || !evento_id_server) {
      return { success: false, message: "Dados insuficientes." };
    }

    try {
      const result = db.run(
        `INSERT INTO inscricoes (usuario_id_local, evento_id_server, sincronizado)
         VALUES (?, ?, 0)`,
        [usuario_id_local, evento_id_server]
      );

      logger.info("local_inscricao_created", {
        id_local: result.lastInsertRowid,
        usuario_id_local,
        evento_id_server
      });

      return { success: true, id_local: result.lastInsertRowid };

    } catch (err) {
      logger.error("local_inscricao_create_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });



  /* ---------------------------------------------------
     OFFLINE 3 — Registrar Presença Local
  ---------------------------------------------------- */
  ipcMain.handle("registrar-presenca-local", async (event, inscricaoIdLocal) => {
    logger.info("local_presenca_attempt", { inscricaoIdLocal });

    if (!inscricaoIdLocal) {
      return { success: false, message: "ID de inscrição inválido." };
    }

    try {
      const result = db.run(
        `INSERT INTO presencas (inscricao_id_local, sincronizado)
         VALUES (?, 0)`,
        [inscricaoIdLocal]
      );

      logger.info("local_presenca_registered", {
        id_local: result.lastInsertRowid,
        inscricaoIdLocal
      });

      return { success: true, id_local: result.lastInsertRowid };

    } catch (err) {
      logger.error("local_presenca_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });



  /* ---------------------------------------------------
     OFFLINE 4 — Buscar Dados Locais
  ---------------------------------------------------- */
  ipcMain.handle("buscar-dados-locais", async () => {
    logger.info("local_data_query");

    try {
      const eventos = db.all(`SELECT * FROM eventos ORDER BY data`);
      const presencas = db.all(`SELECT * FROM presencas`);

      const inscricoes = db.all(`
        SELECT
          i.id_local,
          i.server_id,
          i.evento_id_server,
          u.nome AS nome_usuario,
          u.email AS email_usuario,
          e.nome AS nome_evento,
          i.sincronizado
        FROM inscricoes i
        JOIN usuarios u ON u.id_local = i.usuario_id_local
        JOIN eventos e ON e.id_server = i.evento_id_server
        ORDER BY i.id_local DESC
      `);

      logger.info("local_data_query_success", {
        eventos: eventos.length,
        inscricoes: inscricoes.length,
        presencas: presencas.length,
      });

      return {
        success: true,
        eventos,
        inscricoes,
        presencas,
      };

    } catch (err) {
      logger.error("local_data_query_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });

}


module.exports = registerOfflineHandlers;