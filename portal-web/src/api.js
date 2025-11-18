// portal-web/src/api.js
import axios from 'axios';

// 1. Cria uma instância base do axios
const api = axios.create({
  // A nossa baseURL é a raiz, pois o Nginx trata do resto.
  baseURL: 'http://localhost/'
  // Em produção, isto seria a URL do seu site, ex: 'https://seusite.com/'
});

// 2. Cria um "Interceptor"
// Isto é uma função que corre ANTES de CADA requisição
api.interceptors.request.use(
  (config) => {
    // Pega o token do localStorage
    const token = localStorage.getItem('access_token');
    
    // Se o token existir, anexa-o ao cabeçalho Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Trata erros da requisição
    return Promise.reject(error);
  }
);

// 3. (Opcional) Interceptor de Resposta
// Isto pode detetar erros 401 (token expirado) e deslogar o utilizador
api.interceptors.response.use(
  (response) => response, // Se a resposta for boa, devolve-a
  (error) => {
    // Se a API devolver 401 (Não Autorizado)
    if (error.response && error.response.status === 401) {
      // Limpa o token antigo
      localStorage.removeItem('access_token');
      // Redireciona para a página de login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;