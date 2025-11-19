/**
 * AuthService
 * Responsável por:
 * ✔ Autenticar usuário via API
 * ✔ Validar se é admin
 * ✔ Armazenar token em memória (Singleton)
 */

const api = require("./api");
const { createLogger } = require("../logger");

const logger = createLogger("auth-service");

// Estado em memória (Singleton dentro do módulo)
let currentToken = null;
let currentUser = null;

const AuthService = {
  /**
   * Realiza login via API e valida se é admin.
   */
  async login(username, password) {
    try {
      logger.info("login_attempt", { username });

      // 1. Chamada na API
      const loginResp = await api.login(username, password);
      
      if (!loginResp || !loginResp.access_token) {
        throw new Error("Resposta da API inválida (sem token).");
      }

      const tempToken = loginResp.access_token;

      // 2. Buscar perfil do usuário (para confirmar que é admin)
      // Nota: Algumas APIs já retornam o user no login. Se não, buscamos agora.
      let userProfile = loginResp.user;
      
      if (!userProfile) {
        // Se o login não retornou o objeto user, buscamos via endpoint /me ou similar
        try {
           // Você precisará implementar getCurrentUser ou getMe no api.js se não existir
           // Por hora, vamos assumir que o login retorna o user ou usamos o loginResp
           userProfile = loginResp.user || { username, is_admin: true }; // Fallback temporário
        } catch (e) {
           logger.warn("profile_fetch_fail", { error: e.message });
        }
      }

      // 3. Validação de Admin (Regra de Negócio)
      // Ajuste a propriedade 'is_admin' conforme o retorno real do seu Python
      // Se o Python retorna 'role': 'admin', ajuste aqui.
      if (userProfile && userProfile.is_admin === false) { 
        logger.warn("login_denied_not_admin", { username });
        throw new Error("Acesso negado: Apenas administradores podem acessar o app local.");
      }

      // 4. Sucesso: Salva no estado
      currentToken = tempToken;
      currentUser = userProfile;

      logger.info("login_success", { username });

      return {
        success: true,
        user: currentUser,
        token: currentToken
      };

    } catch (err) {
      logger.error("login_error", { error: err.message });
      currentToken = null;
      currentUser = null;
      
      // Repassa o erro para ser tratado no IPC
      throw err;
    }
  },

  logout() {
    logger.info("logout");
    currentToken = null;
    currentUser = null;
    return { success: true };
  },

  // Getters para outros serviços (Sync, etc)
  getToken: () => currentToken,
  getUser: () => currentUser,
  isAuthenticated: () => !!currentToken
};

module.exports = AuthService;