// main/db/queries-events.js
/**
 * Query Object — EVENTOS (Offline)
 *
 * Este módulo centraliza TODAS as operações SQL relacionadas a eventos
 * armazenados no banco local SQLite.
 *
 * Benefícios:
 * - evita SQL espalhado pelos IPCs
 * - garante consistência nos dados offline
 * - permite testes unitários por função isolada
 */

const { createLogger } = require("../logger");
const logger = createLogger("queries-events");

module.exports = function EventsRepository(db) {
  return {

    /* ---------------------------------------------------
       CREATE/UPDATE — Registrar evento do servidor
       Usado no sync DOWNLOAD.
    ---------------------------------------------------- */
    async upsertFromServer(evento) {
      const { id, nome, data_evento, descricao } = evento;

      logger.info("event_upsert", { id_server: id, nome });

      try {
        // CORREÇÃO: A coluna no banco chama-se 'data_evento', não 'data'
        await db.run(
          `
            INSERT OR REPLACE INTO eventos (id_server, nome, data_evento, descricao)
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
    async getByServerId(id_server) {
      return await db.get(
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
    async listAll() {
      // CORREÇÃO: order by data_evento
      return await db.all(
        `
          SELECT *
          FROM eventos
          ORDER BY data_evento ASC
        `
      );
    },


    /* ---------------------------------------------------
       READ — Buscar eventos futuros (qualidade extra)
    ---------------------------------------------------- */
    async listFuturos() {
      // CORREÇÃO: datetime(data_evento)
      return await db.all(
        `
          SELECT *
          FROM eventos
          WHERE datetime(data_evento) >= datetime('now')
          ORDER BY data_evento ASC
        `
      );
    },


    /* ---------------------------------------------------
       READ — Buscar eventos passados
       (opcional, mas útil para relatórios)
    ---------------------------------------------------- */
    async listPassados() {
      // CORREÇÃO: datetime(data_evento)
      return await db.all(
        `
          SELECT *
          FROM eventos
          WHERE datetime(data_evento) < datetime('now')
          ORDER BY data_evento DESC
        `
      );
    }

  };
};