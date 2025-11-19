// preload.js — versão corporativa, endurecida e segura
const { contextBridge, ipcRenderer } = require("electron");

/**
 * ============================================================
 *  CANAIS PERMITIDOS (Whitelist Rígida)
 * ============================================================
 */
const VALID_CHANNELS = new Set([
  // ONLINE
  "login-api",
  "logout",
  "sincronizar-download",
  "sincronizar-upload",

  // OFFLINE
  "cadastrar-usuario-local",
  "buscar-dados-locais",
  "inscrever-local",
  "registrar-presenca-local",

  // Logging opcional
  "log"
]);


/**
 * ============================================================
 *  Sanitização forte para payloads IPC
 * ============================================================
 * Remove funções, símbolos, protótipos modificados,
 * getters/setters, Proxies e qualquer coisa suspeita.
 */
function sanitize(value) {
  if (value === null || typeof value !== "object") return value;

  // Evitar objetos hostilizados por Proxy
  const isPlain =
    Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null;

  if (!isPlain) {
    return {}; // bloqueia classes custom, DOM elements, proxies
  }

  const output = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "function") continue;
    if (typeof val === "symbol") continue;

    // proteção contra __proto__, prototype, constructor
    if (key === "__proto__" || key === "prototype" || key === "constructor")
      continue;

    // Recursão segura
    output[key] = sanitize(val);
  }

  return output;
}


/**
 * ============================================================
 *  Função central de IPC segura
 * ============================================================
 */
function invokeSecure(channel, payload = null) {
  if (!VALID_CHANNELS.has(channel)) {
    console.warn(`[PRELOAD] Canal IPC inválido bloqueado: ${channel}`);
    return Promise.reject(new Error("Canal IPC inválido"));
  }

  const sanitized = sanitize(payload);

  return ipcRenderer.invoke(channel, sanitized).catch((err) => {
    console.error(`[IPC ERROR] ${channel}:`, err);
    throw err;
  });
}


/**
 * ============================================================
 *  API EXPERTA PARA O RENDERER (CONGELADA)
 * ============================================================
 */
const api = {
  version: "1.0.0",

  online: {
    login: (username, password) =>
      invokeSecure("login-api", { username, password }),

    logout: () =>
      invokeSecure("logout"),

    sincronizarDownload: () =>
      invokeSecure("sincronizar-download"),

    sincronizarUpload: () =>
      invokeSecure("sincronizar-upload"),
  },

  offline: {
    cadastrarUsuarioLocal: (usuario) =>
      invokeSecure("cadastrar-usuario-local", usuario),

    buscarDadosLocais: () =>
      invokeSecure("buscar-dados-locais"),

    inscreverLocal: (inscricao) =>
      invokeSecure("inscrever-local", inscricao),

    registrarPresencaLocal: (inscricaoId) =>
      invokeSecure("registrar-presenca-local", { inscricaoId }),
  },

  log: (msg) =>
    invokeSecure("log", { msg })
};

// Congela profundamente o objeto exposto
Object.freeze(api);
Object.freeze(api.online);
Object.freeze(api.offline);

/**
 * ============================================================
 *  EXPOR NO CONTEXTO GLOBAL DE FORMA SEGURA
 * ============================================================
 */
contextBridge.exposeInMainWorld('api', {
  // Canal de Logs (opcional, para debug)
  log: (msg) => ipcRenderer.send('log-message', msg),

  // --- ONLINE (Conectado ao Python/Docker) ---
  online: {
    login: (username, password) => ipcRenderer.invoke('login', username, password),
    logout: () => ipcRenderer.send('logout'),
    
    sincronizarDownload: () => ipcRenderer.invoke('sincronizar-download'),
    sincronizarUpload: () => ipcRenderer.invoke('sincronizar-upload'),
  },

  // --- OFFLINE (Banco de Dados SQLite Local) ---
  offline: {
    buscarDadosLocais: () => ipcRenderer.invoke('buscar-dados-locais'),
    
    // Cadastros e Check-ins
    cadastrarUsuarioLocal: (dados) => ipcRenderer.invoke('cadastrar-usuario-local', dados),
    inscreverLocal: (dados) => ipcRenderer.invoke('inscrever-local', dados),
    registrarPresencaLocal: (id) => ipcRenderer.invoke('registrar-presenca-local', id),
    cancelarCheckinLocal: (id) => ipcRenderer.invoke('cancelar-checkin-local', id),
    cancelarInscricaoLocal: (id) => ipcRenderer.invoke('cancelar-inscricao-local', id),
  },

  // --- NOVO MÉTODO ATÔMICO (Do Caso 2) ---
  realizarCheckinRapido: (dados) => ipcRenderer.invoke('realizar-checkin-rapido', dados),
});