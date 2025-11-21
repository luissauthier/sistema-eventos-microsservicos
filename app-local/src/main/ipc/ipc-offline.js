// app-local/src/main/ipc/ipc-offline.js
const { ipcMain } = require("electron");
const { createLogger } = require("../logger");

// Importa as queries refatoradas da Etapa 1
const qUsers = require("../db/queries-users");
const qEvents = require("../db/queries-events");
const qSubs = require("../db/queries-subs");
const qCheckins = require("../db/queries-checkins");
const { getDB } = require("../db/db");

const { generateTempPassword } = require("../utils/password-gen");

const logger = createLogger("ipc-offline");

module.exports = function registerOfflineHandlers(db) {

  // 1. BUSCAR TUDO (Para preencher a tela inicial)
  ipcMain.handle("buscar-dados-locais", async () => {
    logger.info("local_data_query");
    try {
      const db = getDB();
      const eventos = await new Promise((res, rej) => db.all("SELECT * FROM eventos ORDER BY data_evento DESC", [], (e,r)=>e?rej(e):res(r)));
      const usuarios = await new Promise((res, rej) => db.all("SELECT * FROM usuarios", [], (e,r)=>e?rej(e):res(r)));
      
      const inscricoes = await new Promise((res, rej) => db.all(`
          SELECT i.*, u.nome as nome_usuario, u.email as email_usuario 
          FROM inscricoes i
          LEFT JOIN usuarios u ON i.usuario_id_local = u.id_local
      `, [], (e,r)=>e?rej(e):res(r)));

      const presencas = await new Promise((res, rej) => 
        db.all("SELECT * FROM presencas", [], (e,r)=>e?rej(e):res(r))
      );

      return { success: true, eventos, usuarios, inscricoes, presencas };
    } catch (err) {
      logger.error("local_data_query_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });

  // 2. CHECK-IN RÁPIDO (Caso de Uso 2: Cadastro + Inscrição + Presença)
  ipcMain.handle("realizar-checkin-rapido", async (event, data) => {
    logger.info("fast_checkin_start", { email: data.email });
    const db = getDB();
    
    try {
      // A. Garante Usuário (Busca ou Cria)
      let user = await qUsers.findUserByUsername(data.email); // Usamos email como username
      let senhaTemp = null;

      if (!user) {
        senhaTemp = generateTempPassword(10);
        user = await qUsers.createUserOffline({
            username: data.email,
            nome: data.nome,
            email: data.email,
            senha_hash: senhaTemp,
            cpf: null, telefone: null, endereco: null
        });
      }

      // B. Garante Inscrição
      // Verifica se já existe inscrição para este user e evento (usando ID do server para o evento)
      const existingSub = await new Promise((resolve, reject) => {
          db.get(
              "SELECT * FROM inscricoes WHERE usuario_id_local = ? AND evento_id_server = ?", 
              [user.id_local, data.eventoIdServer], 
              (err, row) => err ? reject(err) : resolve(row)
          );
      });

      let subId = existingSub ? existingSub.id_local : null;

      if (!existingSub) {
          // Cria inscrição offline
          subId = await qSubs.createSubscription(user.id_local, data.eventoIdServer);
      } else if (existingSub.status === 'cancelada') {
          // Reativa se estava cancelada
          await new Promise((resolve, reject) => {
             db.run("UPDATE inscricoes SET status = 'ativa', sync_status = 'pending_update' WHERE id_local = ?", 
             [subId], (err) => err ? reject(err) : resolve());
          });
      }

      // C. Registra Presença
      // Verifica se já tem check-in
      const existingCheckin = await new Promise((resolve, reject) => {
          db.get("SELECT * FROM presencas WHERE inscricao_id_local = ?", [subId], (err, row) => err ? reject(err) : resolve(row));
      });

      if (!existingCheckin) {
          await qCheckins.createCheckin(subId, 'offline');
      }

      return { success: true, senhaTemp };

    } catch (err) {
      logger.error("fast_checkin_error", { error: err.message });
      return { success: false, message: err.message };
    }
  });

  // 3. OUTROS HANDLERS (Individuais)
  ipcMain.handle("registrar-presenca-local", async (event, idLocalInscricao) => {
      try {
          await qCheckins.createCheckin(idLocalInscricao, 'offline');
          return { success: true };
      } catch (e) { return { success: false, message: e.message }; }
  });

  ipcMain.handle("cancelar-inscricao-local", async (event, idLocal) => {
      const db = getDB();
      return new Promise((resolve, reject) => {
          db.run(
            "UPDATE inscricoes SET status = 'cancelada', sync_status = 'pending_cancel' WHERE id_local = ?", 
            [idLocal],
            (err) => {
                if (err) reject(err);
                else resolve({ success: true });
            }
          );
      });
  });

  ipcMain.handle("cancelar-checkin-local", async (event, idLocalInscricao) => {
      const db = getDB();
      
      try {
          const presenca = await new Promise((res, rej) => 
             db.get("SELECT * FROM presencas WHERE inscricao_id_local = ?", [idLocalInscricao], (e, r) => e ? rej(e) : res(r))
          );

          if (!presenca) return { success: true };

          if (presenca.sync_status === 'pending_create') {
              // Se ainda não subiu, deleta fisicamente
              await new Promise((res, rej) => 
                 db.run("DELETE FROM presencas WHERE id_local = ?", [presenca.id_local], (e) => e ? rej(e) : res())
              );
          } else {
              // Se já subiu (tem server_id ou sync='synced'), marca para deletar no server
              await new Promise((res, rej) => 
                 db.run("UPDATE presencas SET sync_status = 'pending_delete' WHERE id_local = ?", [presenca.id_local], (e) => e ? rej(e) : res())
              );
          }
          return { success: true };
      } catch (err) { return { success: false, message: err.message }; }
  });

  // 6. Inscrever / Reativar Localmente
  ipcMain.handle("inscrever-local", async (event, data) => {
    try {
        const db = getDB();
        
        // Cenário A: Reativar uma inscrição cancelada (O Renderer manda { idLocal: ... })
        if (data.idLocal) {
            return new Promise((resolve, reject) => {
                db.run(
                    "UPDATE inscricoes SET status = 'ativa', sync_status = 'pending_update' WHERE id_local = ?",
                    [data.idLocal],
                    (err) => err ? reject(err) : resolve({ success: true })
                );
            });
        }
        
        // Cenário B: Criar nova inscrição (Se necessário no futuro)
        // Atualmente, o fluxo de "Check-in Rápido" já cria inscrições novas.
        // Se você quiser permitir inscrição pura sem check-in aqui, usaria qSubs.createSubscription
        
        return { success: false, message: "Operação inválida: ID local necessário para reativar." };

    } catch (err) { 
        return { success: false, message: err.message }; 
    }
  });
};