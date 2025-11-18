// main/db/queries-subs.js
/**
 * Query Object — INSCRIÇÕES (Offline)
 *
 * Centraliza todas as operações relacionadas às inscrições
 * armazenadas no SQLite.
 *
 * Abrange:
 *   - criação offline
 *   - sincronização (upload)
 *   - upsert vindo do servidor (download)
 *   - buscas e validações
 */

const { createLogger } = require("../logger");
const logger = createLogger("queries-subs");

module.exports = function SubsRepository(db) {
  return {

    /* ---------------------------------------------------
       CREATE — Criar inscrição offline
    ---------------------------------------------------- */
    createLocalInscricao(usuario_id_local, evento_id_server) {
      logger.info("create_local_inscricao_attempt", {
        usuario_id_local,
        evento_id_server
      });

      try {
        const res = db.run(
          `
            INSERT INTO inscricoes (usuario_id_local, evento_id_server, sincronizado)
            VALUES (?, ?, 0)
          `,
          [usuario_id_local, evento_id_server]
        );

        logger.info("create_local_inscricao_success", {
          id_local: res.lastInsertRowid
        });

        return res.lastInsertRowid;

      } catch (err) {
        logger.error("create_local_inscricao_error", { error: err.message });
        throw err;
      }
    },


    /* ---------------------------------------------------
       UPSERT — Vindo do servidor (sync DOWNLOAD)
       Inscrição idempotente: se existir, mantém.
    ---------------------------------------------------- */
    upsertFromServer(inscricao) {
      const { id, usuario_id, evento_id } = inscricao;

      logger.info("sub_upsert_from_server", {
        server_id: id,
        usuario_id,
        evento_id
      });

      try {
        db.run(
          `
            INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, sincronizado)
            SELECT ?, u.id_local, ?, 1
            FROM usuarios u
            WHERE u.server_id = ?
            ON CONFLICT(server_id) DO NOTHING
          `,
          [id, evento_id, usuario_id]
        );

      } catch (err) {
        logger.error("sub_upsert_from_server_error", {
          server_id: id,
          error: err.message
        });
        throw err;
      }
    },


    /* ---------------------------------------------------
       READ — Buscar inscrição por ID local
    ---------------------------------------------------- */
    getByLocalId(id_local) {
      return db.get(
        `SELECT * FROM inscricoes WHERE id_local = ?`,
        [id_local]
      );
    },


    /* ---------------------------------------------------
       READ — Buscar inscrição por server_id
    ---------------------------------------------------- */
    getByServerId(server_id) {
      return db.get(
        `SELECT * FROM inscricoes WHERE server_id = ?`,
        [server_id]
      );
    },


    /* ---------------------------------------------------
       READ — Listar TODAS as inscrições
    ---------------------------------------------------- */
    listAll() {
      return db.all(`
        SELECT *
        FROM inscricoes
        ORDER BY id_local DESC
      `);
    },


    /* ---------------------------------------------------
       READ — Listar inscrições pendentes de sync
    ---------------------------------------------------- */
    listPendingSync() {
      return db.all(`
        SELECT i.id_local, i.evento_id_server, u.server_id AS usuario_server_id
        FROM inscricoes i
        JOIN usuarios u ON u.id_local = i.usuario_id_local
        WHERE i.sincronizado = 0
          AND u.server_id IS NOT NULL
      `);
    },


    /* ---------------------------------------------------
       UPDATE — Marcar inscrição como sincronizada
    ---------------------------------------------------- */
    markAsSynced(id_local, server_id) {
      logger.info("local_inscricao_mark_synced", { id_local, server_id });

      return db.run(
        `
          UPDATE inscricoes
          SET sincronizado = 1,
              server_id = ?
          WHERE id_local = ?
        `,
        [server_id, id_local]
      );
    },


    /* ---------------------------------------------------
       CHECK — Verificar se existe inscrição local para (usuario, evento)
       Evita duplicidade offline.
    ---------------------------------------------------- */
    existsLocal(usuario_id_local, evento_id_server) {
      const row = db.get(
        `
          SELECT 1
          FROM inscricoes
          WHERE usuario_id_local = ?
            AND evento_id_server = ?
          LIMIT 1
        `,
        [usuario_id_local, evento_id_server]
      );

      return !!row; // true/false
    }

  };
};