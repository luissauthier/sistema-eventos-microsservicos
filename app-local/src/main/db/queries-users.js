// main/db/queries-users.js
/**
 * Query Object — USUÁRIOS (Offline)
 *
 * Este módulo centraliza TODAS as operações SQL relacionadas a usuários
 * armazenados no banco local SQLite.
 *
 * Benefícios:
 *   - Nenhum SQL espalhado pelos IPCs
 *   - Testável: cada função pode ser mockada e testada isoladamente
 *   - Mantém consistência entre sync e offline
 */

const { createLogger } = require("../logger");
const logger = createLogger("queries-users");

module.exports = function UsersRepository(db) {
  return {
    /* ---------------------------------------------------
       CREATE — Cria usuário local
    ---------------------------------------------------- */
    createLocalUser(nome, email, senha) {
      logger.info("create_local_user_attempt", { nome, email });

      try {
        const result = db.run(
          `
            INSERT INTO usuarios (nome, email, senha, sincronizado)
            VALUES (?, ?, ?, 0)
          `,
          [nome, email, senha]
        );

        logger.info("create_local_user_success", {
          id_local: result.lastInsertRowid,
          email
        });

        return result.lastInsertRowid;
      } catch (err) {
        logger.error("create_local_user_error", { error: err.message });
        throw err;
      }
    },


    /* ---------------------------------------------------
       READ — Buscar usuário por ID local
    ---------------------------------------------------- */
    getByLocalId(id_local) {
      return db.get(
        `SELECT * FROM usuarios WHERE id_local = ?`,
        [id_local]
      );
    },


    /* ---------------------------------------------------
       READ — Buscar usuário por server_id
    ---------------------------------------------------- */
    getByServerId(server_id) {
      return db.get(
        `SELECT * FROM usuarios WHERE server_id = ?`,
        [server_id]
      );
    },


    /* ---------------------------------------------------
       READ — Buscar por email (único)
    ---------------------------------------------------- */
    getByEmail(email) {
      return db.get(
        `SELECT * FROM usuarios WHERE email = ?`,
        [email]
      );
    },


    /* ---------------------------------------------------
       READ — Listar todos
    ---------------------------------------------------- */
    listAll() {
      return db.all(`SELECT * FROM usuarios ORDER BY id_local DESC`);
    },


    /* ---------------------------------------------------
       READ — Listar pendentes de sincronização
    ---------------------------------------------------- */
    listPendingSync() {
      return db.all(
        `SELECT * FROM usuarios WHERE sincronizado = 0 ORDER BY id_local ASC`
      );
    },


    /* ---------------------------------------------------
       UPDATE — Marcar usuário como sincronizado
    ---------------------------------------------------- */
    markAsSynced(id_local, server_id) {
      logger.info("local_user_mark_synced", { id_local, server_id });

      return db.run(
        `
          UPDATE usuarios
          SET sincronizado = 1,
              server_id = ?
          WHERE id_local = ?
        `,
        [server_id, id_local]
      );
    },


    /* ---------------------------------------------------
       VALIDAÇÃO — Verificar duplicidade local
    ---------------------------------------------------- */
    existsEmail(email) {
      const row = db.get(
        `SELECT 1 FROM usuarios WHERE email = ? LIMIT 1`,
        [email]
      );
      return !!row;
    }
  };
};