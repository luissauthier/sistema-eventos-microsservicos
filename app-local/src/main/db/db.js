// app-local/src/main/db/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");
const { createAllTables } = require("./tables");
const { createLogger } = require("../logger");

const logger = createLogger("db-connection");

let db = null;

function connectDB() {
  if (db) return db;

  // Define o caminho do banco de dados na pasta de dados do usuário (AppData/Application Support)
  // Isso garante que o banco persista entre atualizações do app
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "database.sqlite");

  logger.info("connecting_db", { path: dbPath });

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error("connection_failed", { error: err.message });
    } else {
      logger.info("connection_success");
      // Garante que as tabelas existem ao conectar
      createAllTables(db);
    }
  });

  return db;
}

function getDB() {
  if (!db) {
    return connectDB();
  }
  return db;
}

module.exports = { connectDB, getDB };