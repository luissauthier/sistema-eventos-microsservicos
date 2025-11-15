const { contextBridge, ipcRenderer } = require('electron');

// Expõe um objeto global 'window.api' para o seu frontend (React)
contextBridge.exposeInMainWorld('api', {
  
  // --- FLUXO ONLINE ---
  loginApi: (username, password) => {
    return ipcRenderer.invoke('login-api', { username, password });
  },
  sincronizarDownload: () => {
    return ipcRenderer.invoke('sincronizar-download');
  },
  sincronizarUpload: () => {
    return ipcRenderer.invoke('sincronizar-upload');
  },
  
  // --- FLUXO OFFLINE ---
  cadastrarUsuarioLocal: (usuario) => {
    return ipcRenderer.invoke('cadastrar-usuario-local', usuario);
  },
  buscarDadosLocais: () => { 
    return ipcRenderer.invoke('buscar-dados-locais');
  },
  inscreverLocal: (inscricao) => {
    return ipcRenderer.invoke('inscrever-local', inscricao);
  },
  registrarPresencaLocal: (inscricaoId) => {
    return ipcRenderer.invoke('registrar-presenca-local', inscricaoId);
  }
});