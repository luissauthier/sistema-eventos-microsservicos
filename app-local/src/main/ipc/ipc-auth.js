// main/ipc/ipc-auth.js
/**
 * IPC Handler — Autenticação (Login Online)
 *
 * Canais:
 *   - login-api
 *
 * Responsável por:
 *   - Validar credenciais no microsserviço de usuários
 *   - Armazenar token JWT de forma segura no processo principal
 *   - Garantir que apenas atendentes (admin) possam usar o app local
 */

const { ipcMain } = require("electron");
const { createLogger } = require("../logger");
const api = require("../services/api"); // cliente HTTP centralizado

const logger = createLogger("ipc-auth");

// Token global seguro (não exposto ao renderer)
let authToken = null;

function registerAuthHandlers() {
  ipcMain.handle("login-api", async (event, { username, password }) => {
    logger.info("login_attempt", { username });

    try {
      // 1) Login no serviço de usuários (gera JWT)
      const tokenResponse = await api.login(username, password);
      if (!tokenResponse || !tokenResponse.access_token) {
        throw new Error("Token inválido retornado pela API.");
      }

      authToken = tokenResponse.access_token;

      // 2) Buscar informações do usuário autenticado
      const user = await api.getCurrentUser(authToken);

      if (!user) {
        authToken = null;
        return {
          success: false,
          message: "Não foi possível validar o usuário autenticado."
        };
      }

      // 3) Garantir que é admin
      if (!user.is_admin) {
        logger.warn("login_denied_not_admin", { username });
        authToken = null;
        return {
          success: false,
          message: "Acesso negado: apenas atendentes/admin podem usar o app local."
        };
      }

      logger.info("login_success", { username, userId: user.id });

      return {
        success: true,
        token: authToken,
        user,
      };

    } catch (err) {
      logger.error("login_api_error", {
        username,
        error: err.message,
      });

      // Em caso de falha, invalidar token
      authToken = null;

      return {
        success: false,
        message: err.response?.data?.detail || err.message || "Erro desconhecido",
      };
    }
  });
}

module.exports = registerAuthHandlers;
module.exports.getAuthToken = () => authToken;