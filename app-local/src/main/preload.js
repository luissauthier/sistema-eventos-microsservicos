// app-local/src/main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

/**
 * Lista de canais permitidos para segurança.
 */
const VALID_CHANNELS = [
  "login",
  "logout",
  "sincronizar-download",
  "sincronizar-upload",
  "cadastrar-usuario-local",
  "buscar-dados-locais",
  "inscrever-local",
  "registrar-presenca-local",
  "cancelar-checkin-local",
  "cancelar-inscricao-local",
  "realizar-checkin-rapido",
  "log-message"
];

/**
 * Função auxiliar para invocar IPC de forma segura e logada.
 */
function invoke(channel, ...args) {
  if (!VALID_CHANNELS.includes(channel)) {
    console.error(`[Preload] Canal bloqueado/inválido: ${channel}`);
    return Promise.reject(new Error(`Canal IPC inválido: ${channel}`));
  }
  // console.log(`[Preload] Invoking: ${channel}`, args); // Descomente para debug profundo
  return ipcRenderer.invoke(channel, ...args);
}

// API Exposta para o Frontend (Window.api)
const api = {
  // Utilitários
  log: (msg) => ipcRenderer.send('log-message', msg),

  // --- ONLINE (API Gateway) ---
  online: {
    login: (username, password) => invoke('login', username, password),
    logout: () => ipcRenderer.send('logout'),
    
    // Aqui estava o erro: garantimos que os nomes batem com o renderer
    sincronizarDownload: () => invoke('sincronizar-download'),
    sincronizarUpload: () => invoke('sincronizar-upload'),
  },

  // --- OFFLINE (SQLite Local) ---
  offline: {
    buscarDadosLocais: () => invoke('buscar-dados-locais'),
    cadastrarUsuarioLocal: (dados) => invoke('cadastrar-usuario-local', dados),
    inscreverLocal: (dados) => invoke('inscrever-local', dados),
    registrarPresencaLocal: (id) => invoke('registrar-presenca-local', id),
    cancelarCheckinLocal: (id) => invoke('cancelar-checkin-local', id),
    cancelarInscricaoLocal: (id) => invoke('cancelar-inscricao-local', id),
  },

  // --- MÉTODOS ESPECIAIS ---
  realizarCheckinRapido: (dados) => invoke('realizar-checkin-rapido', dados),
};

// Exposição segura ao mundo principal (Renderer)
contextBridge.exposeInMainWorld('api', api);