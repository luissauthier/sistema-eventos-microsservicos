// main/db/tables.js

const { createLogger } = require("../logger");
const logger = createLogger("db-tables");

/**
 * Definição centralizada das tabelas SQLite.
 * * ESTRATÉGIA OFFLINE-FIRST:
 * - id_local: Chave primária exclusiva do dispositivo.
 * - server_id: Chave primária do banco de dados central (PostgreSQL).
 * - sync_status: Controla o estado de sincronização ('synced', 'pending_create', 'pending_update').
 * - last_modified: Timestamp para resolução de conflitos (Last Write Wins).
 */

const TABLES = [
  {
    name: "usuarios",
    sql: `
      CREATE TABLE IF NOT EXISTS usuarios (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,           -- ID vindo do servidor
        username TEXT UNIQUE NOT NULL,      -- Obrigatório para login offline
        nome TEXT NOT NULL,
        email TEXT UNIQUE,
        cpf TEXT UNIQUE,                    -- Necessário para o 'Cadastro Completo'
        telefone TEXT,
        endereco TEXT,
        senha_hash TEXT,                    -- Hash para validar login offline (opcional por segurança)
        is_active INTEGER DEFAULT 1,
        sync_status TEXT DEFAULT 'synced',  -- Status de sincronização
        last_modified TEXT                  -- Data ISO 8601
      );
    `
  },

  {
    name: "eventos",
    sql: `
      CREATE TABLE IF NOT EXISTS eventos (
        id_server INTEGER PRIMARY KEY,      -- Eventos são gerados apenas no admin/server, usamos o ID deles como PK
        nome TEXT NOT NULL,
        descricao TEXT,
        data_evento TEXT NOT NULL,
        template_certificado TEXT DEFAULT 'default',
        last_modified TEXT
      );
    `
  },

  {
    name: "inscricoes",
    sql: `
      CREATE TABLE IF NOT EXISTS inscricoes (
        id_local INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER UNIQUE,
        usuario_id_local INTEGER NOT NULL,
        evento_id_server INTEGER NOT NULL,
        status TEXT DEFAULT 'ativa',        -- 'ativa', 'cancelada'
        data_inscricao TEXT,
        sync_status TEXT DEFAULT 'synced',  -- 'pending_create', 'pending_cancel'
        last_modified TEXT,
        
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
        server_id INTEGER UNIQUE,
        inscricao_id_local INTEGER NOT NULL,
        data_checkin TEXT NOT NULL,         -- Data exata do check-in offline
        origem TEXT DEFAULT 'offline',      -- 'online', 'offline', 'qrcode'
        sync_status TEXT DEFAULT 'synced',  -- 'pending_create'
        
        FOREIGN KEY (inscricao_id_local) REFERENCES inscricoes(id_local)
      );
    `
  }
];

/**
 * Executa a criação das tabelas de forma serializada para garantir integridade.
 */
function createAllTables(db) {
  logger.info("tables_creation_started");

  db.serialize(() => {
    for (const table of TABLES) {
      try {
        db.run(table.sql);
        logger.info("table_ready", { table: table.name });
      } catch (err) {
        logger.error("table_creation_failed", {
          table: table.name,
          error: err.message
        });
        // Em produção, poderíamos lançar o erro para parar a app se o DB falhar
        throw err;
      }
    }
  });

  logger.info("tables_creation_success");
}

module.exports = {
  createAllTables,
  TABLES
};