/**
 * IPC Handler — Autenticação
 * Conecta o Electron (Front) ao AuthService (Lógica)
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const AuthService = require("../services/auth-service");

const logger = createLogger("ipc-auth");

function registerAuthHandlers() {
  
  // CORREÇÃO: Canal alterado de 'login-api' para 'login' para bater com o preload.js
  // CORREÇÃO: Argumentos (event, u, p) em vez de objeto desestruturado
  ipcMain.handle("login", async (event, username, password) => {
    logger.info("ipc_login_call", { username });

    try {
      // Delega para o serviço
      const result = await AuthService.login(username, password);
      return result;

    } catch (err) {
      // Tratamento de erro seguro para o Front-end
      logger.error("ipc_login_fail", { error: err.message });
      
      return {
        success: false,
        message: err.message || "Falha na autenticação."
      };
    }
  });

  ipcMain.on("logout", (event) => {
    AuthService.logout();
    logger.info("ipc_logout_call");
  });
}

module.exports = registerAuthHandlers;

// Exporta o getter do serviço para uso no ipc-sync.js
module.exports.getAuthToken = AuthService.getToken;