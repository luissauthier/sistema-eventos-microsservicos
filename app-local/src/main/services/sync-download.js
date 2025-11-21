// app-local/src/main/services/sync-download.js
const api = require("./api");
const qEvents = require("../db/queries-events");
const qUsers = require("../db/queries-users");
const qSubs = require("../db/queries-subs");
const { createLogger } = require("../logger");

const logger = createLogger("sync-download");

async function downloadServerData(token) {
  logger.info("download_started");
  let stats = { events: 0, users: 0, subs: 0, errors: 0 };

  try {
    const [eventos, usuarios, inscricoes] = await Promise.all([
      api.getEventos(token),
      api.getAllUsers(token),
      api.getAllInscricoes(token)
    ]);

    // 1. Eventos (Sempre atualiza)
    for (const evt of eventos) await qEvents.upsertEvent(evt);
    stats.events = eventos.length;

    // 2. Usuários (Sempre atualiza)
    for (const user of usuarios) await qUsers.upsertUserFromServer(user);
    stats.users = usuarios.length;

    // 3. Inscrições (COM PROTEÇÃO DE CONFLITO)
    const userMap = await qUsers.getServerIdMap();

    for (const insc of inscricoes) {
      const localUserId = userMap[insc.usuario_id];
      
      if (localUserId) {
        // Verifica se temos uma versão local modificada pendente de envio
        const subsLocais = await qSubs.getSubscriptionsByUser(localUserId);
        
        // Procura se JÁ existe essa inscrição localmente
        const conflito = subsLocais.find(s => s.evento_id_server === insc.evento_id);
        
        // Se existe E tem status pendente (cancelamento/criação), IGNORA o servidor
        // para não sobrescrever a ação do usuário.
        if (conflito && conflito.sync_status && conflito.sync_status.startsWith('pending_')) {
             logger.warn("sync_skip_download_conflict", { id: conflito.id_local, status: conflito.sync_status });
             continue; 
        }

        await qSubs.upsertSubscriptionFromServer(insc, localUserId);
        stats.subs++;
      }
    }

  } catch (error) {
    logger.error("download_failed", { error: error.message });
  }

  logger.info("download_finished", stats);
  return stats;
}

module.exports = { downloadServerData };