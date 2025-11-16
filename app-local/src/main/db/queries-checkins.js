// main/db/queries-checkins.js
/**
 * Query Object — PRESENÇAS (Offline)
 *
 * Este módulo centraliza TODAS as operações relacionadas
 * ao registro de presenças no SQLite.
 *
 * Abrange:
 *   - registro offline
 *   - busca por inscrição
 *   - listagem completa
 *   - sincronização com servidor
 */

const { createLogger } = require("../logger");
const logger = createLogger("queries-checkins");

module.exports = function CheckinsRepository(db) {
  return {

    /* ---------------------------------------------------
       CREATE — Registrar presença local
    ---------------------------------------------------- */
    createLocalPresenca(inscricao_id_local) {
      logger.info("create_local_presenca_attempt", { inscricao_id_local });

      try {
        const res = db.run(
          `
            INSERT INTO presencas (inscricao_id_local, sincronizado)
            VALUES (?, 0)
          `,
          [inscricao_id_local]
        );

        logger.info("create_local_presenca_success", {
          id_local: res.lastInsertRowid
        });

        return res.lastInsertRowid;

      } catch (err) {
        logger.error("create_local_presenca_error", {
          inscricao_id_local,
          error: err.message
        });
        throw err;
      }
    },


    /* ---------------------------------------------------
       READ — Buscar presença local por inscrição
       (útil p/ evitar duplicidade no offline)
    ---------------------------------------------------- */
    getByInscricaoLocalId(inscricao_id_local) {
      return db.get(
        `
          SELECT *
          FROM presencas
          WHERE inscricao_id_local = ?
          LIMIT 1
        `,
        [inscricao_id_local]
      );
    },


    /* ---------------------------------------------------
       READ — Listar todas as presenças locais
    ---------------------------------------------------- */
    listAll() {
      return db.all(
        `
          SELECT *
          FROM presencas
          ORDER BY id_local DESC
        `
      );
    },


    /* ---------------------------------------------------
       READ — Listar presenças pendentes de sincronização
    ---------------------------------------------------- */
    listPendingSync() {
      return db.all(
        `
          SELECT
            p.id_local,
            i.server_id AS inscricao_server_id
          FROM presencas p
          JOIN inscricoes i ON p.inscricao_id_local = i.id_local
          WHERE p.sincronizado = 0
            AND i.server_id IS NOT NULL
        `
      );
    },


    /* ---------------------------------------------------
       UPDATE — Marcar presença como sincronizada
    ---------------------------------------------------- */
    markAsSynced(id_local) {
      logger.info("local_presenca_mark_synced", { id_local });

      return db.run(
        `
          UPDATE presencas
          SET sincronizado = 1
          WHERE id_local = ?
        `,
        [id_local]
      );
    }

  };
};