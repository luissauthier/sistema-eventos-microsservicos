// main/services/api.js
/**
 * Serviço HTTP corporativo via Axios
 *
 * Este módulo centraliza TODAS as comunicações com a API.
 * Nenhum outro arquivo faz requisições manualmente.
 *
 * Benefícios:
 *  - Cliente HTTP único, padronizado e testável
 *  - Tratamento central de erros
 *  - Interceptors para logging
 *  - Simplifica ipc-auth/ipc-sync
 */

const axios = require("axios");
const { createLogger } = require("../logger");

const logger = createLogger("api-service");

// ================================================================
// CONFIGURAÇÃO BASE
// ================================================================

// Endereço do gateway reverso (Nginx)
const API_URL = process.env.API_URL || "http://localhost";

const http = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

// ================================================================
// INTERCEPTORS — LOGS E TRATAMENTO GLOBAL DE ERROS
// ================================================================

http.interceptors.request.use(
  (config) => {
    logger.info("api_request", {
      method: config.method,
      url: config.url,
    });
    return config;
  },
  (error) => {
    logger.error("api_request_error", { error: error.message });
    return Promise.reject(error);
  }
);

http.interceptors.response.use(
  (response) => {
    logger.info("api_response", {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  (error) => {
    logger.error("api_response_error", {
      status: error.response?.status,
      message: error.response?.data?.detail || error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

// ================================================================
// HELPERS
// ================================================================

function authHeader(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  };
}

// ================================================================
// API: AUTENTICAÇÃO
// ================================================================
module.exports.login = async function login(username, password) {
  const params = new URLSearchParams();
  params.append("username", username);
  params.append("password", password);

  const response = await http.post("/auth", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return response.data;
};

module.exports.getMe = async function getMe(token) {
  const response = await http.get("/usuarios/me", authHeader(token));
  return response.data;
};

// ================================================================
// API: USUÁRIOS
// ================================================================
module.exports.getCurrentUser = async function getCurrentUser(token) {
  const response = await http.get("/usuarios/me", authHeader(token));
  return response.data;
};

module.exports.getAllUsers = async function getAllUsers(token) {
  const response = await http.get("/usuarios", authHeader(token));
  return response.data;
};

module.exports.getMe = module.exports.getCurrentUser;

module.exports.registerUser = async function registerUser(token, localUser) {
  const payload = {
    username: localUser.email,
    password: localUser.senha,
    full_name: localUser.nome,
    email: localUser.email,
    is_admin: false
  };

  const response = await http.post("/usuarios", payload, authHeader(token));
  return response.data;
};

// ================================================================
// API: EVENTOS
// ================================================================
module.exports.getEventos = async function getEventos(token) {
  // eventos são públicos — mas passamos header igual
  const response = await http.get("/eventos", authHeader(token));
  return response.data;
};

// ================================================================
// API: INSCRIÇÕES
// ================================================================
module.exports.getAllInscricoes = async function getAllInscricoes(token) {
  const response = await http.get("/admin/inscricoes/all", authHeader(token));
  return response.data;
};

module.exports.createInscricaoAdmin = async function createInscricaoAdmin(token, localInsc) {
  const payload = {
    evento_id: localInsc.evento_id_server,
    usuario_id: localInsc.usuario_server_id
  };

  const response = await http.post("/admin/inscricoes", payload, authHeader(token));
  return response.data;
};

// ================================================================
// API: PRESENÇAS
// ================================================================
module.exports.registerPresenca = async function registerPresenca(token, inscricao_server_id) {
  const response = await http.post(
    "/presencas",
    { inscricao_id: inscricao_server_id },
    authHeader(token)
  );

  return response.data;
};