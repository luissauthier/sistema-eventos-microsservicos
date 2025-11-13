// Arquivo: src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expõe um objeto global 'window.api' para o seu frontend (React)
contextBridge.exposeInMainWorld('api', {
  
  // A função que o seu React vai chamar
  // ex: window.api.cadastrarUsuario({ nome: '...', ... })
  cadastrarUsuario: (usuario) => {
    
    // 'cadastrar-usuario' é o nome do "canal" que o main.js está ouvindo
    // 'usuario' é o dado que estamos enviando
    // 'ipcRenderer.invoke' envia a mensagem e espera uma resposta
    return ipcRenderer.invoke('cadastrar-usuario', usuario);
  },

  sincronizarEventosMock: () => {
    // 'sincronizar-eventos-mock' é o nome do "canal"
    return ipcRenderer.invoke('sincronizar-eventos-mock');
  },

  buscarEventosLocais: () => { 
    return ipcRenderer.invoke('buscar-eventos-locais');
  },

  inscreverLocal: (inscricao) => {
    return ipcRenderer.invoke('inscrever-local', inscricao);
  },

  registrarPresencaLocal: (inscricaoId) => {
    return ipcRenderer.invoke('registrar-presenca-local', inscricaoId);
  }
  
  // No futuro, você adicionará mais funções aqui:
  // buscarEventosLocais: () => ipcRenderer.invoke('buscar-eventos'),
  // sincronizar: () => ipcRenderer.invoke('sincronizar-dados'),
});