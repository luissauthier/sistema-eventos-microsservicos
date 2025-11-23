// app-local/src/main/ipc/ipc-sync.js
const { ipcMain } = require("electron");
const { uploadPendingData } = require("../services/sync-upload");
const { downloadServerData } = require("../services/sync-download");
const { startHeartbeat, setModeOffline } = require("../services/heartbeat-service");
const { createLogger } = require("../logger");
// const { getToken } = require("../security"); // Se usar security.js
// OU se estiver salvando token no auth-service:
const AuthService = require("../services/auth-service");

const logger = createLogger("ipc-sync");

module.exports = function registerSyncHandlers(db) {

  ipcMain.handle("set-mode-offline", async () => {
      await setModeOffline(); // Avisa o servidor
      return { success: true };
  });

  ipcMain.handle("set-mode-online", async () => {
      startHeartbeat(); // Volta a bater o coração
      return { success: true };
  });
  
  ipcMain.removeHandler("sincronizar-upload");
  // --- Rota de Upload (Local -> Nuvem) ---
  ipcMain.handle("sincronizar-upload", async () => {
    // Pega o token (ajuste conforme onde você salva o token: security.js ou auth-service.js)
    const token = AuthService.getToken(); 

    if (!token) {
      return { success: false, message: "Não autenticado. Faça login online." };
    }

    try {
      const stats = await uploadPendingData(token);
      return { success: true, ...stats };
    } catch (error) {
      logger.error("sync_upload_error", { error: error.message });
      return { success: false, message: error.message };
    }
  });

  // --- Rota de Download (Nuvem -> Local) ---
  // ==================================================================
  // 2. HANDLER DE DOWNLOAD (Nuvem -> Local)
  // ==================================================================
  try {
    ipcMain.removeHandler("sincronizar-download"); // Remove anterior
  } catch (e) { /* Ignora */ }

  ipcMain.handle("sincronizar-download", async () => {
    console.log("[MAIN] IPC 'sincronizar-download' RECEBIDO!");

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        return { success: false, message: "Não autenticado." };
      }

      console.log("[MAIN] Chamando serviço downloadServerData...");
      const stats = await downloadServerData(token);
      console.log("[MAIN] Download retornou:", stats);

      return { success: true, ...stats };
    } catch (error) {
      console.error("[MAIN] ERRO FATAL NO DOWNLOAD:", error);
      logger.error("sync_download_error", { error: error.message });
      return { success: false, message: error.message };
    }
  });
};