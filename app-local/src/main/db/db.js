// main/db/db.js
/**
 * Inicialização e helpers para SQLite local (app-local)
 */

const fs = require("fs");
const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();
const { promisify } = require("util");

const { createLogger } = require("../logger");
const logger = createLogger("db");

// Nome do arquivo DB (padrão)
const DB_FILENAME = process.env.LOCAL_DB_FILENAME || "eventos-local.db";

// SQL de criação das tabelas (migrations simples, idempotentes)
const INITIAL_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id_local INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER UNIQUE,
  nome TEXT NOT NULL,
  email TEXT UNIQUE,
  senha TEXT,
  sincronizado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS eventos (
  id_server INTEGER PRIMARY KEY, -- id vindo do servidor
  nome TEXT NOT NULL,
  data_evento TEXT,
  descricao TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id_local INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER UNIQUE,
  usuario_id_local INTEGER NOT NULL,
  evento_id_server INTEGER NOT NULL,
  sincronizado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (usuario_id_local) REFERENCES usuarios (id_local) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presencas (
  id_local INTEGER PRIMARY KEY AUTOINCREMENT,
  inscricao_id_local INTEGER NOT NULL,
  sincronizado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (inscricao_id_local) REFERENCES inscricoes (id_local) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_usuarios_server_id ON usuarios(server_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_server_id ON inscricoes(server_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_usuario_local ON inscricoes(usuario_id_local);
CREATE INDEX IF NOT EXISTS idx_presencas_inscricao_local ON presencas(inscricao_id_local);
`;

/**
 * Promise wrapper helpers for sqlite3 Database
 */
function makeDbHelpers(db) {
  const run = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          logger.error("db_run_error", { sql, params, error: err.message });
          return reject(err);
        }
        // `this` is the Statement object; expose lastID and changes.
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };

  const get = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          logger.error("db_get_error", { sql, params, error: err.message });
          return reject(err);
        }
        resolve(row);
      });
    });
  };

  const all = function (sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error("db_all_error", { sql, params, error: err.message });
          return reject(err);
        }
        resolve(rows);
      });
    });
  };

  const exec = function (sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          logger.error("db_exec_error", { error: err.message });
          return reject(err);
        }
        resolve();
      });
    });
  };

  const prepare = function (sql) {
    const stmt = db.prepare(sql);
    return {
      run: (params = []) =>
        new Promise((resolve, reject) =>
          stmt.run(params, function (err) {
            if (err) {
              logger.error("db_prepare_run_error", { sql, params, error: err.message });
              return reject(err);
            }
            resolve({ lastID: this.lastID, changes: this.changes });
          })
        ),
      finalize: () =>
        new Promise((resolve, reject) =>
          stmt.finalize((err) => {
            if (err) {
              logger.error("db_prepare_finalize_error", { sql, error: err.message });
              return reject(err);
            }
            resolve();
          })
        ),
    };
  };

  // Transaction helper: recebe uma async function que recebe os helpers e executa COMMIT/ROLLBACK
  const transaction = async function (fn) {
    try {
      await exec("BEGIN TRANSACTION");
      const result = await fn({ run, get, all, prepare, exec });
      await exec("COMMIT");
      return result;
    } catch (err) {
      try {
        await exec("ROLLBACK");
      } catch (rollbackErr) {
        logger.error("db_rollback_error", { error: rollbackErr.message });
      }
      throw err;
    }
  };

  return { run, get, all, exec, prepare, transaction };
}

/**
 * Cria a pasta de dados e retorna o caminho do DB
 */
function ensureDatabasePath(app) {
  const userDataPath = app.getPath("userData");
  const dbDir = path.resolve(userDataPath, "data");
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    logger.error("db_mkdir_error", { error: err.message, path: dbDir });
    throw err;
  }
  return path.join(dbDir, DB_FILENAME);
}

/**
 * Cria e configura o banco (PRAGMAs etc) e aplica migrations iniciais.
 * Retorna um objeto { db, run, get, all, exec, prepare, transaction, close }
 */
async function createDatabase(app) {
  const dbPath = ensureDatabasePath(app);
  logger.info("opening_sqlite_db", { dbPath });

  // Abre em modo readwrite/create
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      logger.error("sqlite_open_error", { error: err.message });
      throw err;
    }
  });

  // Promisfy close
  const close = () =>
    new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          logger.error("sqlite_close_error", { error: err.message });
          return reject(err);
        }
        logger.info("sqlite_closed");
        resolve();
      });
    });

  // Configurações práticas e seguras
  // PRAGMA statements must be executed serially; use db.serialize
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      // Foreign keys ON
      db.run("PRAGMA foreign_keys = ON;");
      // WAL mode for concurrent reads/writes
      db.run("PRAGMA journal_mode = WAL;");
      // reasonable busy timeout to avoid SQLITE_BUSY
      db.run("PRAGMA busy_timeout = 5000;");
      // synchronous normal (good perf + safety)
      db.run("PRAGMA synchronous = NORMAL;");

      // optionally set mmap_size for performance (if supported)
      // db.run("PRAGMA mmap_size = 268435456;"); // 256MB

      resolve();
    });
  });

  const helpers = makeDbHelpers(db);

  // Aplica esquema inicial/migrations
  try {
    await helpers.exec(INITIAL_SCHEMA_SQL);
    logger.info("db_schema_initialized");
  } catch (err) {
    logger.error("db_schema_error", { error: err.message });
    // Fechar DB para não deixar em estado inconsistente
    await close();
    throw err;
  }

  // Retorna o objeto DB com helpers
  return {
    raw: db,
    close,
    ...helpers,
  };
}

module.exports = {
  createDatabase,
};