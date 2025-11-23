// app-local/src/main/services/api.js
const axios = require("axios");
const { createLogger } = require("../logger");

const logger = createLogger("api-service");

// FORÇA IPv4: Evita que o Node tente ::1 (IPv6) e falhe silenciosamente
const BASE_URL = "http://177.44.248.76:80";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Aumentei para 15s para garantir
  headers: { "Content-Type": "application/json" },
});

// Interceptor para Logar a Requisição (Debug de Saída)
api.interceptors.request.use(config => {
  logger.info(`api_req_start`, { 
    method: config.method?.toUpperCase(), 
    url: config.url,
    baseURL: config.baseURL 
  });
  return config;
}, error => Promise.reject(error));

// Interceptor de Resposta (Sem mascarar o erro original)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    
    if (error.response) {
      // O servidor respondeu (chegou no Nginx), mas com erro (4xx, 5xx)
      logger.warn(`api_error_response [${method} ${url}]`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta (Nginx fora do ar ou Rede inacessível)
      logger.error(`api_no_response [${method} ${url}]`, { message: "Sem resposta do Nginx (Docker)." });
    } else {
      // Erro na configuração da requisição (antes de sair)
      logger.error(`api_setup_error`, { message: error.message });
    }
    
    // IMPORTANTE: Retorna o erro original para o IPC capturar a mensagem real
    return Promise.reject(error);
  }
);

module.exports = {
  // --- AUTH ---
  async login(username, password) {
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
    const response = await api.get("/eventos", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; 
  },

  async getAllUsers(token) {
    const response = await api.get("/usuarios", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getAllInscricoes(token) {
    const response = await api.get("/admin/inscricoes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // --- SYNC UPLOAD (POST) ---
  async registerUser(token, userData) {
    const response = await api.post("/usuarios", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createUserAdmin(token, nome, email, senha) {
    const payload = {
      username: email,
      email: email,
      password: senha,
      full_name: nome,
      is_active: true,
      is_superuser: false
    };
    const response = await api.post("/usuarios", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async createInscricaoAdmin(token, evento_id_server, usuario_server_id) {
    // Payload ajustado para o endpoint /admin/inscricoes
    const payload = {
      evento_id: evento_id_server,
      usuario_id: usuario_server_id
    };
    const response = await api.post("/admin/inscricoes", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async registrarCheckinAdmin(token, payloadOuId) {    
    let payload;
    // Aceita array (Lote) ou ID único
    if (Array.isArray(payloadOuId)) {
       payload = {
         presencas: payloadOuId,
         timestamp_cliente: new Date().toISOString()
       };
    } else {
       payload = {
         presencas: [{ inscricao_id: payloadOuId, data_checkin: new Date().toISOString() }],
         timestamp_cliente: new Date().toISOString()
       };
    }

    logger.info("sending_checkin_sync", { qtd: payload.presencas.length });
    
    const response = await api.post("/admin/sync/presencas", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async cancelarInscricao(token, idInscricaoServer) {
    // PATCH /inscricoes/{id}/cancelar
    const response = await api.patch(`/inscricoes/${idInscricaoServer}/cancelar`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async deletarPresenca(token, idPresencaServer) {
    // DELETE /admin/presencas/{id}
    const response = await api.delete(`/admin/presencas/${idPresencaServer}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // --- UTILS ---
  async getUserByEmail(token, email) {
      try {
        // Busca filtrada
        const response = await api.get(`/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Filtra no cliente se a API não suportar ?email=...
        const found = response.data.find(u => u.email === email);
        return found || null;
      } catch (e) {
          return null;
      }
  },

  async getCurrentUser(token) {
      try {
          const response = await api.get("/usuarios/me", {
             headers: { Authorization: `Bearer ${token}` }
          });
          return response.data;
      } catch (e) {
          return null;
      }
  },

  async sendHeartbeat(token, status = "online") {
    try {
      await api.post("/usuarios/heartbeat", { status }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      return true;
    } catch (e) {
      return false;
    }
  }
};