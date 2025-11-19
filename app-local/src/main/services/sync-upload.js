// main/services/sync-upload.js
/**
 * Serviço de Sincronização (UPLOAD)
 * SQLite → API
 *
 * Este serviço faz o fluxo offline → online:
 *   ✔ envia usuários criados offline
 *   ✔ envia inscrições criadas offline
 *   ✔ envia presenças criadas offline
 *   ✔ atualiza flags de sincronização (1)
 *   ✔ tudo rodando em uma TRANSAÇÃO
 */

const api = require("./api");
const { createLogger } = require("../logger");

const UsersRepo = require("../db/queries-users");
const EventsRepo = require("../db/queries-events");
const SubsRepo = require("../db/queries-subs");
const CheckinsRepo = require("../db/queries-checkins");

const logger = createLogger("sync-upload");

module.exports = function createSyncUploadService(db) {
  // Repositórios locais
  const users = UsersRepo(db);
  const events = EventsRepo(db);
  const subs = SubsRepo(db);
  const checkins = CheckinsRepo(db);

  /**
   * Executa o UPLOAD:
   *   1. usuários locais → /usuarios
   *   2. inscrições locais → /admin/inscricoes
   *   3. checkins locais → /presencas
   *
   *   tudo em transação!
   */
  async function syncUpload(token) {
    logger.info("sync_upload_start");
    const results = { users: { ok: 0, fail: 0 }, subs: { ok: 0, fail: 0 }, checks: { ok: 0, fail: 0 } };

    let tx;
    try {
      // ---------------------------------------------------------
      // Coletar pendências locais
      // ---------------------------------------------------------
      const unsyncedUsers = users.findUnsynced();
      const unsyncedSubs = subs.findUnsynced();
      const unsyncedCheckins = checkins.findUnsynced();

      logger.info("sync_upload_pending_counts", {
        usuarios: unsyncedUsers.length,
        inscricoes: unsyncedSubs.length,
        presencas: unsyncedCheckins.length
      });

      // ---------------------------------------------------------
      // Iniciar transação
      // ---------------------------------------------------------
      tx = db.transactionStart();

      // ---------------------------------------------------------
      // 1) Sync USERS
      // ---------------------------------------------------------
      for (const u of unsyncedUsers) {
        try {
          // Tenta criar na API
          const apiResp = await api.createUserAdmin(token, u.nome, u.email, u.senha);
          await users.markAsSynced(u.id_local, apiResp.id);
          results.users.ok++;
        } catch (err) {
          // Tratamento especial: Se o erro for "Email already registered" (400 ou 409 dependendo da sua API Python)
          // Devemos buscar o user na API e atualizar o ID local para não travar o sistema.
          if (err.response && (err.response.status === 409 || err.response.data.detail?.includes("exist"))) {
              logger.warn("sync_upload_user_conflict", { email: u.email });
              try {
                  // Fallback: Busca o usuário remoto para pegar o ID correto
                  const remoteUser = await api.getUserByEmail(token, u.email); // Necessário criar este método na api.js
                  if (remoteUser) {
                      await users.markAsSynced(u.id_local, remoteUser.id);
                      results.users.ok++;
                      continue; // Recuperado com sucesso
                  }
              } catch (recoveryErr) {
                  logger.error("sync_user_recovery_fail", { error: recoveryErr.message });
              }
          }
          
          logger.error("sync_upload_user_fail", { id: u.id_local, error: err.message });
          results.users.fail++;
          // Não damos throw aqui para permitir que outros registros tentem subir
        }
      }

      // ---------------------------------------------------------
      // 2) Sync SUBSCRIPTIONS
      // ---------------------------------------------------------
      for (const s of unsyncedSubs) {
        logger.info("sync_upload_inscricao", { id_local: s.id_local });

        const apiResp = await api.createInscricaoAdmin(
          token,
          s.evento_id_server,
          s.usuario_server_id
        );

        subs.markAsSynced(s.id_local, apiResp.id);
      }

      // ---------------------------------------------------------
      // 3) Sync CHECKINS
      // ---------------------------------------------------------
      for (const c of unsyncedCheckins) {
        logger.info("sync_upload_checkin", { id_local: c.id_local });

        await api.registrarCheckinAdmin(token, c.inscricao_server_id);

        checkins.markAsSynced(c.id_local);
      }

      // ---------------------------------------------------------
      // Commit final
      // ---------------------------------------------------------
      db.transactionCommit(tx);

      logger.info("sync_upload_success", {
        usuarios: unsyncedUsers.length,
        inscricoes: unsyncedSubs.length,
        presencas: unsyncedCheckins.length
      });

      return {
        success: true,
        message: `Upload concluído: ${unsyncedUsers.length} usuários, ${unsyncedSubs.length} inscrições, ${unsyncedCheckins.length} presenças.`
      };

    } catch (err) {
      logger.error("sync_upload_error", { error: err.message });

      if (tx) db.transactionRollback(tx);

      return {
        success: false,
        message: err.message || "Erro ao enviar dados offline."
      };
    }
  }

  return { syncUpload };
};