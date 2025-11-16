// main/services/sync-download.js
/**
 * Serviço de Sincronização (DOWNLOAD)
 * API → SQLite
 *
 * Este serviço:
 *   ✔ busca todos os dados necessários do servidor
 *   ✔ executa upserts locais de forma idempotente
 *   ✔ atualiza as tabelas de eventos, usuários e inscrições
 *   ✔ roda tudo dentro de uma TRANSAÇÃO atômica
 *   ✔ não deixa SQL espalhado pelos IPCs
 */

const api = require("./api");
const { createLogger } = require("../logger");

const UsersRepo = require("../db/queries-users");
const EventsRepo = require("../db/queries-events");
const SubsRepo = require("../db/queries-subs");

const logger = createLogger("sync-download");

module.exports = function createSyncDownloadService(db) {
  // Repositórios
  const users = UsersRepo(db);
  const events = EventsRepo(db);
  const subs = SubsRepo(db);

  /**
   * Executa a sincronização DOWN:
   *   1. Fetch de eventos
   *   2. Fetch de usuários
   *   3. Fetch de inscrições
   *   4. Upsert local (idempotente)
   *   5. Commit
   */
  async function syncDownload(token) {
    logger.info("sync_download_start");

    let tx;
    try {
      // ---------------------------------------------------------
      // 1) Buscar dados da API
      // ---------------------------------------------------------
      const [eventosApi, usuariosApi, inscricoesApi] = await Promise.all([
        api.getEventos(token),
        api.getAllUsers(token),     // exige ADMIN
        api.getAllInscricoes(token) // exige ADMIN
      ]);

      logger.info("sync_download_fetched", {
        eventos: eventosApi.length,
        usuarios: usuariosApi.length,
        inscricoes: inscricoesApi.length
      });

      // ---------------------------------------------------------
      // 2) Iniciar transação
      // ---------------------------------------------------------
      tx = db.transactionStart();

      // ---------------------------------------------------------
      // 3) EVENTOS
      // ---------------------------------------------------------
      for (const evt of eventosApi) {
        events.upsertFromServer(evt);
      }

      // ---------------------------------------------------------
      // 4) USUÁRIOS
      // ---------------------------------------------------------
      for (const usr of usuariosApi) {
        users.markAsSynced( // clever reuse: mark as synced = upsert
          users.getByServerId(usr.id)?.id_local || null,
          usr.id
        );

        // se ainda não existir localmente, criamos o usuário local "espelho"
        // (apenas id, nome, email; nunca senha)
        if (!users.getByServerId(usr.id)) {
          db.run(
            `
              INSERT INTO usuarios (server_id, nome, email, sincronizado)
              VALUES (?, ?, ?, 1)
            `,
            [usr.id, usr.full_name || usr.username, usr.email]
          );
        }
      }

      // ---------------------------------------------------------
      // 5) INSCRIÇÕES
      // ---------------------------------------------------------
      for (const ins of inscricoesApi) {
        subs.upsertFromServer(ins);
      }

      // ---------------------------------------------------------
      // 6) Commit
      // ---------------------------------------------------------
      db.transactionCommit(tx);

      logger.info("sync_download_success", {
        eventos: eventosApi.length,
        usuarios: usuariosApi.length,
        inscricoes: inscricoesApi.length
      });

      return {
        success: true,
        eventos: eventosApi.length,
        usuarios: usuariosApi.length,
        inscricoes: inscricoesApi.length,
      };

    } catch (err) {
      logger.error("sync_download_error", { error: err.message });

      if (tx) db.transactionRollback(tx);

      return {
        success: false,
        message: err.message || "Erro desconhecido durante sincronização."
      };
    }
  }

  return { syncDownload };
};