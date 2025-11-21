// app-local/src/main/db/queries-users.js
const { getDB } = require("./db");
const { createLogger } = require("../logger");
const logger = createLogger("query-users");

function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // Busca por username OU email para garantir o match no login offline
    const sql = `SELECT * FROM usuarios WHERE username = ? OR email = ?`;
    db.get(sql, [username, username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUserOffline(user) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `
      INSERT INTO usuarios (
        username, nome, email, cpf, telefone, endereco, senha_hash, 
        sync_status, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_create', ?)
    `;
    const now = new Date().toISOString();
    const params = [
      user.username, user.nome, user.email, user.cpf, 
      user.telefone, user.endereco, user.senha_hash, now
    ];
    db.run(sql, params, function(err) {
      if (err) {
        logger.error("create_user_failed", { error: err.message });
        reject(err);
      } else {
        resolve({ id_local: this.lastID, ...user });
      }
    });
  });
}

// --- NOVO: Salva usuário vindo do servidor (Sync Download) ---
function upsertUserFromServer(user) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `
      INSERT INTO usuarios (server_id, username, nome, email, cpf, sync_status, last_modified)
      VALUES (?, ?, ?, ?, ?, 'synced', ?)
      ON CONFLICT(server_id) DO UPDATE SET
        username = excluded.username,
        nome = excluded.nome,
        email = excluded.email,
        cpf = excluded.cpf,
        sync_status = 'synced',
        last_modified = excluded.last_modified
    `;
    
    const now = new Date().toISOString();
    // Garante que username não seja nulo (usa email como fallback)
    const username = user.username || user.email;
    
    const params = [
      user.id, username, user.full_name || user.nome, user.email, user.cpf, now
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID || user.id);
    });
  });
}

function updateUserServerId(idLocal, idServer) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `UPDATE usuarios SET server_id = ?, sync_status = 'synced' WHERE id_local = ?`;
    db.run(sql, [idServer, idLocal], function(err) {
      if (err) reject(err); else resolve(this.changes);
    });
  });
}

function getPendingUsers() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all("SELECT * FROM usuarios WHERE sync_status != 'synced'", [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

// Retorna mapa de ServerID -> LocalID para vincular inscrições
function getServerIdMap() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all("SELECT server_id, id_local FROM usuarios WHERE server_id IS NOT NULL", [], (err, rows) => {
      if (err) reject(err);
      else {
        const map = {};
        rows.forEach(r => map[r.server_id] = r.id_local);
        resolve(map);
      }
    });
  });
}

module.exports = { 
  findUserByUsername, 
  createUserOffline, 
  upsertUserFromServer, // Novo
  updateUserServerId,
  getPendingUsers,
  getServerIdMap // Novo
};