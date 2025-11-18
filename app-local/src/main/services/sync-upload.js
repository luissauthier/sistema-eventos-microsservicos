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
        logger.info("sync_upload_user", { id_local: u.id_local });

        const apiResp = await api.createUserAdmin(
          token,
          u.nome,
          u.email,
          u.senha
        );

        users.markAsSynced(u.id_local, apiResp.id);
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