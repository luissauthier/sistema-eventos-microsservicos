// app-local/src/main/db/queries-events.js
const { getDB } = require("./db");

function getAllEvents() {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.all("SELECT * FROM eventos ORDER BY data_evento DESC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Salva ou atualiza evento vindo da API (Sincronização Download)
function upsertEvent(evt) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const sql = `
      INSERT INTO eventos (id_server, nome, descricao, data_evento, template_certificado, last_modified)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id_server) DO UPDATE SET
        nome = excluded.nome,
        descricao = excluded.descricao,
        data_evento = excluded.data_evento,
        template_certificado = excluded.template_certificado,
        last_modified = excluded.last_modified
    `;
    
    // Garante que temos uma data para last_modified
    const now = new Date().toISOString();
    const params = [
      evt.id, evt.nome, evt.descricao, evt.data_evento, 
      evt.template_certificado || 'default', now
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID || evt.id);
    });
  });
}

function getEventById(idServer) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.get("SELECT * FROM eventos WHERE id_server = ?", [idServer], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = { getAllEvents, upsertEvent, getEventById };