// main/db/tables.js
/**
 * Definição centralizada das tabelas SQLite usadas pelo app local.
 *
 * Este módulo:
 *   - contém todo o schema da base local
 *   - é importado apenas por db/db.js
 *   - permite futura evolução/migração de schema
 *   - mantém organização e testabilidade
 *
 * NÃO executa transações, apenas fornece SQL.
 */

const { createLogger } = require("../logger");
const logger = createLogger("db-tables");

/**
 * Lista de tabelas essenciais do app local.
 * Ordem é importante — criação respeita dependências.
 */
const TABLES = [
  {
    name: "usuarios",
    sql: `
      CREATE TABLE IF NOT EXISTS usuarios (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT,                     -- senha NUNCA será sincronizada com o servidor
        sincronizado INTEGER DEFAULT 0  -- 0 = pendente, 1 = sincronizado
      );
    `
  },

  {
    name: "eventos",
    sql: `
      CREATE TABLE IF NOT EXISTS eventos (
        id_server INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        data TEXT,
        descricao TEXT
      );
    `
  },

  {
    name: "inscricoes",
    sql: `
      CREATE TABLE IF NOT EXISTS inscricoes (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,        -- ID vindo da API (quando sincronizado)
        usuario_id_local INTEGER NOT NULL,
        evento_id_server INTEGER NOT NULL,
        sincronizado INTEGER DEFAULT 0,
        
        FOREIGN KEY (usuario_id_local) REFERENCES usuarios(id_local),
        FOREIGN KEY (evento_id_server) REFERENCES eventos(id_server)
      );
    `
  },

  {
    name: "presencas",
    sql: `
      CREATE TABLE IF NOT EXISTS presencas (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        inscricao_id_local INTEGER NOT NULL,
        sincronizado INTEGER DEFAULT 0,
        
        FOREIGN KEY (inscricao_id_local) REFERENCES inscricoes(id_local)
      );
    `
  }
];

/**
 * Executa a criação das tabelas
 */
function createAllTables(db) {
  logger.info("tables_creation_started");

  for (const table of TABLES) {
    try {
      db.exec(table.sql);
      logger.info("table_ready", { table: table.name });
    } catch (err) {
      logger.error("table_creation_failed", {
        table: table.name,
        error: err.message
      });
      throw err;
    }
  }

  logger.info("tables_creation_success");
}

module.exports = {
  createAllTables,
  TABLES
};