const Store = require("electron-store");
const api = require("./api");
const { createLogger } = require("../logger");

const logger = createLogger("auth-service");
const store = new Store();

const AuthService = {
  
  /**
   * Realiza login, busca perfil e salva sessão.
   */
  async login(username, password) {
    try {
      logger.info("login_attempt", { username });

      // 1. Obter Token (POST /auth)
      const loginResp = await api.login(username, password);
      
      if (!loginResp || !loginResp.access_token) {
        throw new Error("Credenciais inválidas ou erro na API.");
      }

      const accessToken = loginResp.access_token;

      // 2. Buscar Perfil Real do Usuário (GET /usuarios/me)
      // Fundamental para validar 'is_admin' com segurança
      const userProfile = await api.getCurrentUser(accessToken);

      if (!userProfile) {
        throw new Error("Falha ao recuperar perfil do usuário.");
      }

      // 3. Validação de Regra de Negócio (Apenas Admin acessa o App Local?)
      // Ajuste conforme a regra. Se atendentes também usam, remova ou ajuste o check.
      if (userProfile.is_admin !== true) {
        logger.warn("login_denied_not_admin", { username, role: userProfile.is_admin });
        throw new Error("Acesso negado: Apenas administradores podem gerenciar o terminal.");
      }

      // 4. Persistência (Salva no Disco)
      store.set("auth_token", accessToken);
      store.set("auth_user", userProfile);

      logger.info("login_success", { username, id: userProfile.id });

      return {
        success: true,
        user: userProfile,
        token: accessToken
      };

    } catch (err) {
      logger.error("login_error", { error: err.message });
      this.logout(); // Limpa qualquer lixo em caso de erro
      throw err;
    }
  },

  /**
   * Remove as credenciais do disco.
   */
  logout() {
    logger.info("logout_performed");
    store.delete("auth_token");
    store.delete("auth_user");
    return { success: true };
  },

  // --- Getters (Usados pelo Sync e outros serviços) ---

  getToken() {
    return store.get("auth_token");
  },

  getUser() {
    return store.get("auth_user");
  },

  isAuthenticated() {
    return !!store.get("auth_token");
  }
};

module.exports = AuthService;