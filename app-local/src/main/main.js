// app-local/src/main/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { createDatabase } = require('./db/db');

// Importa os manipuladores (Handlers)
const registerAuthHandlers = require('./ipc/ipc-auth');
const registerOfflineHandlers = require('./ipc/ipc-offline');
const registerSyncHandlers = require('./ipc/ipc-sync');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let dbInstance = null;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Segurança: Mantenha false
      contextIsolation: true, // Segurança: Mantenha true
    },
  });

  // Carrega a interface (Vite)
  const devServerUrl = typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? MAIN_WINDOW_VITE_DEV_SERVER_URL : null;
  const viteName = typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : 'main_window';

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools(); // Abre DevTools para debug
  } else {
    // Em produção, carrega o arquivo local
    mainWindow.loadFile(path.join(__dirname, `../renderer/index.html`));
  }
};

app.on('ready', async () => {
  // 1. Inicia Banco de Dados
  try {
    dbInstance = await createDatabase(app);
    console.log("✅ Banco de Dados Local Iniciado.");
  } catch (err) {
    console.error("❌ Erro fatal no Banco de Dados:", err);
  }

  // 2. REGISTRA OS HANDLERS IPC (AQUI ESTÁ O SEGREDO!)
  // Precisamos passar a instância do DB para eles
  registerAuthHandlers(); 
  registerOfflineHandlers(dbInstance);
  registerSyncHandlers(dbInstance);

  // Handler auxiliar de log vindo do front
  ipcMain.on('log-message', (_, msg) => console.log("[RENDERER]:", msg));

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});