// app-local/src/main/db/queries-checkins.js
const { getDB } = require("./db");

function createCheckin(inscricaoIdLocal, origem = 'offline') {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `
      INSERT INTO presencas (
        inscricao_id_local, data_checkin, origem, sync_status
      ) VALUES (?, ?, ?, 'pending_create')
    `;
    const now = new Date().toISOString();
    
    db.run(sql, [inscricaoIdLocal, now, origem], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function getPendingCheckins() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // Traz o ID da inscrição no servidor para enviar à API
    const sql = `
      SELECT p.*, i.server_id as inscricao_server_id
      FROM presencas p
      JOIN inscricoes i ON p.inscricao_id_local = i.id_local
      WHERE p.sync_status = 'pending_create' AND i.server_id IS NOT NULL
    `;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function markCheckinSynced(idLocal, idServer) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    if (idServer) {
        // Se recebemos um ID novo, atualizamos tudo
        // IMPORTANTE: Usamos OR IGNORE ou tratamos erro se server_id duplicar (caso raro de sync duplicado)
        const sql = `UPDATE presencas SET server_id = ?, sync_status = 'synced' WHERE id_local = ?`;
        db.run(sql, [idServer, idLocal], function(err) {
            if (err) {
                // Se der erro de unique (server_id já existe em outro), apenas marca como synced sem mudar o ID
                if (err.message.includes("UNIQUE constraint")) {
                    db.run("UPDATE presencas SET sync_status = 'synced' WHERE id_local = ?", [idLocal], e => e ? reject(e) : resolve(true));
                } else {
                    reject(err);
                }
            } else {
                resolve(true);
            }
        });
    } else {
        // Se NÃO recebemos ID (idServer é null/undefined), apenas marcamos como synced
        // Isso acontece quando o backend diz "OK" mas não devolve a lista de IDs (idempotência)
        const sql = `UPDATE presencas SET sync_status = 'synced' WHERE id_local = ?`;
        db.run(sql, [idLocal], (err) => err ? reject(err) : resolve(true));
    }
  });
}

function updateCheckinStatus(idLocal, status) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run(
      "UPDATE presencas SET sync_status = ? WHERE id_local = ?", 
      [status, idLocal], 
      (err) => err ? reject(err) : resolve(true)
    );
  });
}

function getPendingDeletions() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    // Busca itens marcados para deleção que tenham server_id (já subiram)
    const sql = `SELECT * FROM presencas WHERE sync_status = 'pending_delete' AND server_id IS NOT NULL`;
    db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function hardDeleteCheckin(idLocal) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.run("DELETE FROM presencas WHERE id_local = ?", [idLocal], (err) => err ? reject(err) : resolve(true));
  });
}

module.exports = { 
  createCheckin, 
  getPendingCheckins, 
  markCheckinSynced,
  updateCheckinStatus,
  getPendingDeletions,
  hardDeleteCheckin
};