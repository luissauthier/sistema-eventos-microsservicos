// main/ipc/ipc-sync.js
/**
 * IPC Handler — Sincronização
 * Coordean o fluxo de dados entre API e SQLite.
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const AuthService = require("../services/auth-service"); // Usa o serviço, não o IPC
const api = require("../services/api");

const logger = createLogger("ipc-sync");

module.exports = function registerSyncHandlers(db) {

  /* ---------------------------------------------------
     IPC: SINCRONIZAR DOWNLOAD (API -> Local)
  ---------------------------------------------------- */
  ipcMain.handle("sincronizar-download", async () => {
    const token = AuthService.getToken();
    if (!token) {
      return { success: false, message: "Não autenticado." };
    }

    logger.info("sync_download_started");

    let tx;
    try {
      // 1) Buscar dados da API (Agora usa as rotas /admin/... corrigidas)
      const [eventos, usuarios, inscricoes] = await Promise.all([
        api.getEventos(token),
        api.getAllUsers(token),
        api.getAllInscricoes(token)
      ]);

      // 2) Inicia transação
      tx = await db.transactionStart();

      // 3) SALVAR EVENTOS
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

      // Nota: Ajuste 'full_name' ou 'username' conforme sua API retorna
      for (const user of usuarios) {
        await stmtUser.run([
          user.id,
          user.full_name || user.username || user.email, 
          user.email
        ]);
      }
      await stmtUser.finalize();

      // 5) SALVAR INSCRIÇÕES
      // Importante: O banco local precisa vincular pelo ID Local do usuário
      // Primeiro, criamos um mapa de ServerID -> LocalID para performance
      const mapUsers = await db.all("SELECT id_local, server_id FROM usuarios WHERE server_id IS NOT NULL");
      const userMap = new Map(mapUsers.map(u => [u.server_id, u.id_local]));

      const stmtIns = db.prepare(`
        INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, sincronizado)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(server_id) DO NOTHING
      `);

      for (const insc of inscricoes) {
        // A API retorna 'usuario_id' (server side). Precisamos achar o 'id_local' correspondente.
        const localUserId = userMap.get(insc.usuario_id);
        
        if (localUserId) {
          await stmtIns.run([
            insc.id,
            localUserId,
            insc.evento_id, 
          ]);
        }
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
    const token = AuthService.getToken();
    if (!token) {
      return { success: false, message: "Não autenticado." };
    }

    logger.info("sync_upload_started");

    let usersSynced = 0, subsSynced = 0, checksSynced = 0;

    try {
      // 1) UPLOAD DE USUÁRIOS
      const usuarios = await db.all(`SELECT * FROM usuarios WHERE sincronizado = 0`);

      for (const usr of usuarios) {
        try {
          // Chama createUserAdmin (que faz o DE/PARA dos campos)
          const res = await api.createUserAdmin(token, usr.nome, usr.email, usr.senha);
          
          // Marca como sincronizado e salva o ID do servidor
          await db.run(
            `UPDATE usuarios SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
            [res.id, usr.id_local]
          );
          usersSynced++;
        } catch (err) {
          // Se usuário já existe (400/409), tentamos recuperar
          if (err.response && (err.response.status === 400 || err.response.status === 409)) {
             const existing = await api.getUserByEmail(token, usr.email);
             if (existing) {
               await db.run(
                `UPDATE usuarios SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
                [existing.id, usr.id_local]
               );
               usersSynced++;
               continue;
             }
          }
          logger.error("sync_user_fail", { id: usr.id_local, err: err.message });
        }
      }

      // 2) UPLOAD DE INSCRIÇÕES
      // Só sobe inscrições cujo usuário já tenha ID do servidor (sincronizado)
      const inscricoes = await db.all(`
        SELECT i.id_local, i.evento_id_server, u.server_id as usuario_server_id
        FROM inscricoes i
        JOIN usuarios u ON u.id_local = i.usuario_id_local
        WHERE i.sincronizado = 0 AND u.server_id IS NOT NULL
      `);

      for (const ins of inscricoes) {
        try {
          const created = await api.createInscricaoAdmin(token, ins.evento_id_server, ins.usuario_server_id);
          
          await db.run(
            `UPDATE inscricoes SET sincronizado = 1, server_id = ? WHERE id_local = ?`,
            [created.id, ins.id_local]
          );
          subsSynced++;
        } catch (err) {
           logger.error("sync_subs_fail", { id: ins.id_local, err: err.message });
        }
      }

      // 3) UPLOAD DE PRESENÇAS
      // Só sobe presenças cuja inscrição já tenha ID do servidor
      const presencas = await db.all(`
        SELECT p.id_local, i.server_id as inscricao_server_id
        FROM presencas p
        JOIN inscricoes i ON p.inscricao_id_local = i.id_local
        WHERE p.sincronizado = 0 AND i.server_id IS NOT NULL
      `);

      for (const pres of presencas) {
        try {
          // CORREÇÃO: Chamando o método correto 'registrarCheckinAdmin'
          await api.registrarCheckinAdmin(token, pres.inscricao_server_id);
          
          await db.run(
            `UPDATE presencas SET sincronizado = 1 WHERE id_local = ?`,
            [pres.id_local]
          );
          checksSynced++;
        } catch (err) {
           // Ignora erro se checkin já foi feito (idempotência)
           logger.error("sync_checkin_fail", { id: pres.id_local, err: err.message });
        }
      }

      logger.info("sync_upload_success", {
        users: usersSynced,
        inscricoes: subsSynced,
        presencas: checksSynced
      });

      return {
        success: true,
        usersSynced,
        subsSynced,
        checksSynced,
      };

    } catch (err) {
      logger.error("sync_upload_error", { error: err.message });
      return {
        success: false,
        message: err.message || "Erro parcial no upload."
      };
    }
  });
};