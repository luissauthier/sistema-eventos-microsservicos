// main/services/auth-service.js
/**
 * AuthService
 * Responsável por:
 *   ✔ autenticar usuário via API
 *   ✔ validar se é admin
 *   ✔ armazenar token em memória (não salvar em disco!)
 *   ✔ fornecer token a outros serviços
 *   ✔ logout seguro
 */

const api = require("./api");
const { createLogger } = require("../logger");

const logger = createLogger("auth-service");

module.exports = function createAuthService() {
  let token = null;
  let user = null;

  /**
   * Realiza login via API e valida se é admin.
   */
  async function login(username, password) {
    try {
      logger.info("login_attempt", { username });

      const loginResp = await api.login(username, password);
      token = loginResp.access_token;

      // Buscar perfil
      const profile = await api.getCurrentUser(token);

      if (!profile.is_admin) {
        logger.warn("login_denied_not_admin", { username });
        token = null;
        user = null;
        throw new Error("Acesso negado: esta aplicação é apenas para administradores.");
      }

      user = profile;

      logger.info("login_success", { user_id: user.id, username: user.username });

      return {
        success: true,
        user
      };

    } catch (err) {
      logger.error("login_error", { error: err.message });
      token = null;
      user = null;
      return {
        success: false,
        message: err.message
      };
    }
  }

  /**
   * Retorna token atual.
   */
  function getToken() {
    return token;
  }

  /**
   * Dados do usuário corrente (admin logado).
   */
  function getMe() {
    return user;
  }

  /**
   * Usuário está autenticado?
   */
  function isAuthenticated() {
    return token !== null;
  }

  /**
   * Logout seguro
   */
  function logout() {
    logger.info("logout");
    token = null;
    user = null;
    return { success: true };
  }

  return {
    login,
    logout,
    getToken,
    getMe,
    isAuthenticated
  };
};