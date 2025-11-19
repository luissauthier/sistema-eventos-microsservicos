// app-local/src/main/services/api.js
const axios = require("axios");
const { createLogger } = require("../logger");

const logger = createLogger("api-service");

// Endereço do Nginx (Gateway)
const BASE_URL = "http://localhost";

console.log(`[API] Inicializando Axios com Base URL: ${BASE_URL}`);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, 
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    
    if (error.response) {
      logger.warn(`api_error [${method} ${url}]`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      logger.error(`api_network_error [${method} ${url}]`, { message: "Sem resposta do servidor." });
    } else {
      logger.error(`api_setup_error`, { message: error.message });
    }
    return Promise.reject(error);
  }
);

module.exports = {
  // --- AUTH ---
  async login(username, password) {
    // Usa URLSearchParams para enviar como application/x-www-form-urlencoded (Padrão OAuth2)
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await api.post("/auth", formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },

  // --- SYNC DOWNLOAD (GET) ---
  
  async getEventos(token) {
    // Eventos geralmente é público ou comum, mantemos /eventos
    const response = await api.get("/eventos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; 
  },

  async getAllUsers(token) {
    // Tenta buscar todos os usuários. Se /usuarios não retornar lista completa, 
    // verifique se existe /admin/usuarios no seu backend python.
    const response = await api.get("/usuarios", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getAllInscricoes(token) {
    // CORREÇÃO CRÍTICA: Mudado de /inscricoes para /admin/inscricoes
    // A rota raiz /inscricoes dava 405 (Method Not Allowed)
    const response = await api.get("/admin/inscricoes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // --- SYNC UPLOAD (POST) ---

  async registerUser(token, userData) {
    // Criação de usuário continua na rota padrão
    const response = await api.post("/usuarios", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createUserAdmin(token, nome, email, senha) {
    // CORREÇÃO DO ERRO 422:
    // O banco local usa: nome, email, senha
    // A API Python exige: username, email, password (e talvez full_name)
    
    const payload = {
      username: email,      // Em muitos sistemas, username = email
      email: email,
      password: senha,      // Traduzindo 'senha' -> 'password'
      full_name: nome,      // Traduzindo 'nome' -> 'full_name' (se o backend suportar)
      is_active: true,      // Garante que o usuário já nasce ativo
      is_superuser: false
    };

    // Log para debug (opcional)
    logger.info("api_create_user_payload", { username: payload.username });

    // Envia para a rota de usuários
    const response = await api.post("/usuarios", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createInscricaoAdmin(token, evento_id_server, usuario_server_id) {
    // CORREÇÃO: Sync Upload também deve usar a rota admin para garantir permissão
    // ou criar inscrições em nome de outros usuários
    // Ajuste o corpo do JSON conforme o schema do seu Python (evento_id vs evento_id_server)
    const payload = {
      evento_id: evento_id_server,
      usuario_id: usuario_server_id // Alguns backends pedem 'participante_id' ou pegam do token
    };

    // Tenta na rota admin primeiro, pois estamos inscrevendo *outra* pessoa
    const response = await api.post("/admin/inscricoes", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async registrarCheckinAdmin(token, inscricao_id) {    
    const agora = new Date().toISOString();

    const payload = {
      presencas: [
        { 
          inscricao_id: inscricao_id,
          data_checkin: agora // <--- CAMPO QUE FALTAVA
        }
      ],
      timestamp_cliente: agora
    };

    logger.info("api_sync_presenca_payload", payload);
    
    const response = await api.post("/admin/sync/presencas", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // --- UTILS ---
  async getUserByEmail(token, email) {
      try {
        const response = await api.get(`/usuarios?email=${email}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0];
        }
        return null;
      } catch (e) {
          return null;
      }
  },

  async getCurrentUser(token) {
      // Rota para pegar dados do usuário logado ("me")
      // Geralmente /usuarios/me ou /auth/me. Ajuste conforme seu Python.
      // Vou tentar um GET em /usuarios com filtro, ou assumir que o login já devolveu.
      // Se não tiver endpoint /me, tente:
      try {
          // Tenta endpoint padrão do FastAPI Users
          const response = await api.get("/usuarios/me", {
             headers: { Authorization: `Bearer ${token}` }
          });
          return response.data;
      } catch (e) {
          // Fallback: retorna null e o auth-service lida com isso
          return null;
      }
  }
};