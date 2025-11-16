// main/db/queries-events.js
/**
 * Query Object — EVENTOS (Offline)
 *
 * Este módulo centraliza TODAS as operações SQL relacionadas a eventos
 * armazenados no banco local SQLite.
 *
 * Benefícios:
 *   - evita SQL espalhado pelos IPCs
 *   - garante consistência nos dados offline
 *   - permite testes unitários por função isolada
 */

const { createLogger } = require("../logger");
const logger = createLogger("queries-events");

module.exports = function EventsRepository(db) {
  return {

    /* ---------------------------------------------------
       CREATE/UPDATE — Registrar evento do servidor
       Usado no sync DOWNLOAD.
    ---------------------------------------------------- */
    upsertFromServer(evento) {
      const { id, nome, data_evento, descricao } = evento;

      logger.info("event_upsert", { id_server: id, nome });

      try {
        db.run(
          `
            INSERT OR REPLACE INTO eventos (id_server, nome, data, descricao)
            VALUES (?, ?, ?, ?)
          `,
          [
            id,
            nome,
            data_evento || null,
            descricao || null
          ]
        );

      } catch (err) {
        logger.error("event_upsert_error", {
          id_server: id,
          error: err.message
        });
        throw err;
      }
    },


    /* ---------------------------------------------------
       READ — Buscar evento por ID do servidor
    ---------------------------------------------------- */
    getByServerId(id_server) {
      return db.get(
        `
          SELECT * FROM eventos
          WHERE id_server = ?
        `,
        [id_server]
      );
    },


    /* ---------------------------------------------------
       READ — Listar todos os eventos
    ---------------------------------------------------- */
    listAll() {
      return db.all(
        `
          SELECT *
          FROM eventos
          ORDER BY data ASC
        `
      );
    },


    /* ---------------------------------------------------
       READ — Buscar eventos futuros (qualidade extra)
    ---------------------------------------------------- */
    listFuturos() {
      return db.all(
        `
          SELECT *
          FROM eventos
          WHERE datetime(data) >= datetime('now')
          ORDER BY data ASC
        `
      );
    },


    /* ---------------------------------------------------
       READ — Buscar eventos passados
       (opcional, mas útil para relatórios)
    ---------------------------------------------------- */
    listPassados() {
      return db.all(
        `
          SELECT *
          FROM eventos
          WHERE datetime(data) < datetime('now')
          ORDER BY data DESC
        `
      );
    }

  };
};