// main/ipc/ipc-offline.js
/**
 * IPC Handler — Operações Offline
 *
 * Este módulo controla TODAS as operações locais feitas com SQLite:
 * - criar usuário local
 * - criar inscrição local
 * - registrar presença local
 * - consultar dados locais
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const { generateTempPassword } = require("../../../utils/password-gen");

const logger = createLogger("ipc-offline");

// Recebe a instância do banco (db) como argumento
module.exports = function registerOfflineHandlers(db) {

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
      const result = await db.run(
        `INSERT INTO usuarios (nome, email, senha, sincronizado)
         VALUES (?, ?, ?, 0)`,
        [nome, email, senha]
      );

      logger.info("local_user_created", {
        id_local: result.lastID,
        email
      });

      return { success: true, id_local: result.lastID };

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
      const result = await db.run(
        `INSERT INTO inscricoes (usuario_id_local, evento_id_server, sincronizado)
         VALUES (?, ?, 0)`,
        [usuario_id_local, evento_id_server]
      );

      logger.info("local_inscricao_created", {
        id_local: result.lastID,
        usuario_id_local,
        evento_id_server
      });

      return { success: true, id_local: result.lastID };

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
      const result = await db.run(
        `INSERT INTO presencas (inscricao_id_local, sincronizado)
         VALUES (?, 0)`,
        [inscricaoIdLocal]
      );

      logger.info("local_presenca_registered", {
        id_local: result.lastID,
        inscricaoIdLocal
      });

      return { success: true, id_local: result.lastID };

    } catch (err) {
      logger.error("local_presenca_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });

  /* ---------------------------------------------------
   OFFLINE SUPER — Fluxo Completo de Check-in Rápido
   Cria usuário -> Inscreve -> Marca Presença
   Tudo em uma transação só. Essencial para o Caso 2.
  ---------------------------------------------------- */
  ipcMain.handle("realizar-checkin-rapido", async (event, payload) => {
    const { nome, email, eventoIdServer } = payload; // Senha pode ser gerada auto ou vazia p/ completar depois
    
    logger.info("checkin_rapido_start", { email, eventoIdServer });

    let tx;
    let senhaGerada = null;
    try {
      tx = await db.transactionStart();

      // 1. Criar Usuário (ou buscar se já existe localmente por email)
      // Nota: Se existir, pegamos o ID. Se não, criamos.
      let usuarioIdLocal;
      const usuarioExistente = await db.get("SELECT id_local FROM usuarios WHERE email = ?", [email]);
      
      if (usuarioExistente) {
        usuarioIdLocal = usuarioExistente.id_local;
      } else {
        senhaGerada = generateTempPassword(); 
        const resUser = await db.run(
          `INSERT INTO usuarios (nome, email, senha, sincronizado) VALUES (?, ?, ?, 0)`,
          [nome, email, senhaGerada]
        );
        usuarioIdLocal = resUser.lastID;
      }

      // 2. Criar Inscrição
      // Verifica se já não está inscrito para evitar duplicação
      let inscricaoIdLocal;
      const inscricaoExistente = await db.get(
        "SELECT id_local FROM inscricoes WHERE usuario_id_local = ? AND evento_id_server = ?", 
        [usuarioIdLocal, eventoIdServer]
      );

      if (inscricaoExistente) {
        inscricaoIdLocal = inscricaoExistente.id_local;
      } else {
        const resInsc = await db.run(
          `INSERT INTO inscricoes (usuario_id_local, evento_id_server, sincronizado) VALUES (?, ?, 0)`,
          [usuarioIdLocal, eventoIdServer]
        );
        inscricaoIdLocal = resInsc.lastID;
      }

      // 3. Registrar Presença
      // Verifica se já tem presença
      const presencaExistente = await db.get(
        "SELECT id_local FROM presencas WHERE inscricao_id_local = ?", 
        [inscricaoIdLocal]
      );

      if (!presencaExistente) {
        await db.run(
          `INSERT INTO presencas (inscricao_id_local, sincronizado) VALUES (?, 0)`,
          [inscricaoIdLocal]
        );
      }

      await db.transactionCommit(tx);
      
      logger.info("checkin_rapido_success", { email });
      return { 
        success: true, 
        message: "Check-in realizado com sucesso!",
        senhaTemp: senhaGerada
      };

    } catch (err) {
      logger.error("checkin_rapido_error", { error: err.message });
      if (tx) await db.transactionRollback(tx);
      return { success: false, message: "Erro ao realizar check-in rápido: " + err.message };
    }
  });

  /* ---------------------------------------------------
     OFFLINE 4 — Buscar Dados Locais
  ---------------------------------------------------- */
  ipcMain.handle("buscar-dados-locais", async () => {
    logger.info("local_data_query");

    try {
      const usuarios = await db.all(`SELECT * FROM usuarios`);
      const eventos = await db.all(`SELECT * FROM eventos ORDER BY data_evento`);
      const presencas = await db.all(`SELECT * FROM presencas`);

      // Join para trazer nomes bonitos na tela
      const inscricoes = await db.all(`
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
        usuarios
      };

    } catch (err) {
      logger.error("local_data_query_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });

  /* ---------------------------------------------------
     OFFLINE 5 — Cancelar Check-in (Remover Presença)
  ---------------------------------------------------- */
  ipcMain.handle("cancelar-checkin-local", async (event, inscricaoIdLocal) => {
    logger.info("cancelar_checkin_attempt", { inscricaoIdLocal });
    try {
      // Remove apenas a presença, mantém a inscrição
      await db.run("DELETE FROM presencas WHERE inscricao_id_local = ?", [inscricaoIdLocal]);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  /* ---------------------------------------------------
     OFFLINE 6 — Cancelar Inscrição (Remover Tudo)
  ---------------------------------------------------- */
  ipcMain.handle("cancelar-inscricao-local", async (event, inscricaoIdLocal) => {
    logger.info("cancelar_inscricao_attempt", { inscricaoIdLocal });
    try {
      // Remove presença primeiro (cascade manual se o sqlite não tiver FK ativada)
      await db.run("DELETE FROM presencas WHERE inscricao_id_local = ?", [inscricaoIdLocal]);
      // Remove inscrição
      await db.run("DELETE FROM inscricoes WHERE id_local = ?", [inscricaoIdLocal]);
      
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

};