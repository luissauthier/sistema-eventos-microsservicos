// main/ipc/index.js
/**
 * Centralizador de IPCs
 *
 * Responsabilidade:
 * - Receber dependências globais (como db)
 * - Iniciar os módulos de IPC específicos (Auth, Sync, Offline)
 * - Manter o código organizado e separado
 */

const registerAuthHandlers = require("./ipc-auth");
const registerSyncHandlers = require("./ipc-sync");
const registerOfflineHandlers = require("./ipc-offline"); // O arquivo que corrigimos com SQL direto

function initIPC(db) {
  // 1. Auth (Online)
  // Não precisa de DB, usa apenas a API
  registerAuthHandlers();

  // 2. Sync (Sincronização)
  // Precisa do DB para salvar/ler dados durante o sync
  registerSyncHandlers(db);

  // 3. Offline (Banco Local)
  // Precisa do DB para operações diretas (CRUD local)
  registerOfflineHandlers(db); 
}

module.exports = { initIPC };