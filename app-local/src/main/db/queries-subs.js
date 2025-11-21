// app-local/src/main/db/queries-subs.js
const { getDB } = require("./db");

function createSubscription(usuarioIdLocal, eventoIdServer) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `INSERT INTO inscricoes (usuario_id_local, evento_id_server, status, data_inscricao, sync_status, last_modified) VALUES (?, ?, 'ativa', ?, 'pending_create', ?)`;
    const now = new Date().toISOString();
    db.run(sql, [usuarioIdLocal, eventoIdServer, now, now], function(err) {
       if(err) reject(err); else resolve(this.lastID);
    });
  });
}

function upsertSubscriptionFromServer(insc, localUserId) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `
      INSERT INTO inscricoes (server_id, usuario_id_local, evento_id_server, status, sync_status, last_modified)
      VALUES (?, ?, ?, ?, 'synced', ?)
      ON CONFLICT(server_id) DO UPDATE SET status = excluded.status, sync_status = 'synced', last_modified = excluded.last_modified
    `;
    const now = new Date().toISOString();
    db.run(sql, [insc.id, localUserId, insc.evento_id, (insc.status||'ativa').toLowerCase(), now], function(err) {
       if(err) reject(err); else resolve(this.lastID);
    });
  });
}

function getSubscriptionsByUser(usuarioIdLocal) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // REMOVIDO o filtro "AND i.status = 'ativa'" para trazer também as canceladas
    const sql = `
      SELECT i.*, e.nome as evento_nome, e.data_evento 
      FROM inscricoes i
      JOIN eventos e ON i.evento_id_server = e.id_server
      WHERE i.usuario_id_local = ?
    `;
    db.all(sql, [usuarioIdLocal], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function getPendingSubscriptions() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // CORREÇÃO: Agora busca 'pending_create' E 'pending_update'
    const sql = `
      SELECT i.*, u.server_id as usuario_server_id 
      FROM inscricoes i
      JOIN usuarios u ON i.usuario_id_local = u.id_local
      WHERE (i.sync_status = 'pending_create' OR i.sync_status = 'pending_update') 
      AND u.server_id IS NOT NULL
    `;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function markSubscriptionSynced(idLocal, idServer) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run("UPDATE inscricoes SET server_id = ?, sync_status = 'synced' WHERE id_local = ?", [idServer, idLocal], (err) => err ? reject(err) : resolve(true));
  });
}

function getPendingCancellations() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // Busca inscrições marcadas para cancelar que já tenham ID no server
    const sql = `SELECT * FROM inscricoes WHERE sync_status = 'pending_cancel' AND server_id IS NOT NULL`;
    db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
  });
}

module.exports = { 
  createSubscription, 
  upsertSubscriptionFromServer,
  getSubscriptionsByUser, 
  getPendingSubscriptions,
  markSubscriptionSynced,
  getPendingCancellations
};