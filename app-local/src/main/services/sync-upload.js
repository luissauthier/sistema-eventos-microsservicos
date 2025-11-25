// app-local/src/main/services/sync-upload.js
const api = require("./api");
const qUsers = require("../db/queries-users");
const qSubs = require("../db/queries-subs");
const qCheckins = require("../db/queries-checkins");
const { createLogger } = require("../logger");

const logger = createLogger("sync-upload");

async function uploadPendingData(token) {
  logger.info("upload_started");
  let stats = { users: 0, subs: 0, checkins: 0, cancels: 0, deletes: 0, errors: 0 };

  try {
    // 1. USUÁRIOS
    const pendingUsers = await qUsers.getPendingUsers();
    for (const user of pendingUsers) {
      try {
        const payload = {
          username: user.username, email: user.email, password: user.senha_hash || "MudarSenha123!",
          full_name: user.nome, cpf: user.cpf, telefone: user.telefone, endereco: user.endereco, must_change_password: true
        };
        const response = await api.registerUser(token, payload);
        await qUsers.updateUserServerId(user.id_local, response.id);
        stats.users++;
      } catch (err) {
        if (err.response && (err.response.status === 400 || err.response.status === 409)) {
           const existing = await api.getUserByEmail(token, user.email);
           if (existing) {
             await qUsers.updateUserServerId(user.id_local, existing.id);
             stats.users++;
             continue;
           }
        }
        logger.error("upload_user_fail", { id: user.id_local, err: err.message });
        stats.errors++;
      }
    }

    // 2. INSCRIÇÕES
    const pendingSubs = await qSubs.getPendingSubscriptions();
    for (const sub of pendingSubs) {
      try {
        if (!sub.usuario_server_id) continue;
        const response = await api.createInscricaoAdmin(token, sub.evento_id_server, sub.usuario_server_id);
        await qSubs.markSubscriptionSynced(sub.id_local, response.id);
        stats.subs++;
      } catch (err) {
        logger.error("upload_sub_fail", { id: sub.id_local, err: err.message });
        stats.errors++;
      }
    }

    // 3. PRESENÇAS (Lógica Blindada)
    const pendingCheckins = await qCheckins.getPendingCheckins();
    if (pendingCheckins.length > 0) {
      try {
        const readyToSend = pendingCheckins.filter(p => p.inscricao_server_id);
        
        if (readyToSend.length > 0) {
            const payload = readyToSend.map(p => ({ 
                inscricao_id: p.inscricao_server_id, 
                data_checkin: p.data_checkin 
            }));

            // Envia o lote
            const response = await api.registrarCheckinAdmin(token, payload);
            
            // Extrai IDs com segurança
            let idsGerados = [];
            if (response.ids) idsGerados = response.ids;
            else if (response.data && response.data.ids) idsGerados = response.data.ids;
            
            logger.info("checkin_ids_received", { total: idsGerados.length, sent: readyToSend.length });

            // Atualização Local
            for (let i = 0; i < readyToSend.length; i++) {
                const localCheckin = readyToSend[i];
                const serverId = idsGerados[i] || null; // Se não veio ID, usa null
                
                // Chama a função que atualiza APENAS o status se o ID for null
                await qCheckins.markCheckinSynced(localCheckin.id_local, serverId);
            }
            stats.checkins += payload.length;
        }
      } catch (err) {
        logger.error("upload_checkin_fail", { err: err.message });
        stats.errors++;
      }
    }

    // 4. CANCELAMENTOS
    const pendingCancels = await qSubs.getPendingCancellations();
    for (const sub of pendingCancels) {
        try {
            if (sub.server_id) {
                await api.cancelarInscricao(token, sub.server_id);
            }
            await qSubs.markSubscriptionSynced(sub.id_local, sub.server_id); 
            stats.cancels++;

        } catch (err) {
            // Se o erro for 400 (Regra de Negócio: Já tem presença) ou 404 (Já não existe),
            // Aceitamos que o servidor venceu e removemos a pendência local.
            if (err.response && (err.response.status === 400 || err.response.status === 404)) {
                 logger.warn("cancel_rejected_server_won", { 
                     id: sub.id_local, 
                     reason: "Server rejected cancellation (probably attended). Clearing pending status." 
                 });
                 
                 // Força como 'synced' para parar de tentar enviar este cancelamento.
                 // O próximo 'Download' vai sobrescrever o status local com o real do servidor (Ativa/Presente).
                 await qSubs.markSubscriptionSynced(sub.id_local, sub.server_id);
            } else {
                 // Erros reais (Rede, 500, etc) continuam sendo logados como erro para tentar depois
                 logger.error("upload_cancel_fail", { id: sub.id_local, err: err.message });
                 stats.errors++;
            }
        }
    }

    // 5. DELEÇÕES
    const pendingDeletes = await qCheckins.getPendingDeletions();
    for (const pres of pendingDeletes) {
        try {
            if (!pres.server_id) {
                 await qCheckins.hardDeleteCheckin(pres.id_local);
                 continue;
            }
            await api.deletarPresenca(token, pres.server_id);
            await qCheckins.hardDeleteCheckin(pres.id_local);
            stats.deletes++;
        } catch (err) {
            if (err.response && (err.response.status === 404 || err.response.status === 400)) {
                 await qCheckins.hardDeleteCheckin(pres.id_local);
                 stats.deletes++;
            } else {
                 logger.error("upload_delete_fail", { id: pres.id_local, err: err.message });
                 stats.errors++;
            }
        }
    }

  } catch (error) {
    logger.error("upload_fatal", { error: error.message });
    throw error;
  }

  logger.info("upload_finished", stats);
  return stats;
}

module.exports = { uploadPendingData };