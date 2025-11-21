// app-local/src/main/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { connectDB } = require('./db/db');
const { initIPC } = require('./ipc/index'); // <--- Importante
const { createLogger } = require('./logger');

const logger = createLogger('main');
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true, // Deve ser true para usar o contextBridge
    },
  });

  // Em dev:
  if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:5173');
  } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  logger.info("app_starting");

  // 1. Conectar ao Banco de Dados
  const db = connectDB();

  // 2. Registrar IPCs (AQUI ESTAVA FALTANDO OU FALHANDO)
  // Isso chama o index.js -> que chama o ipc-sync.js
  initIPC(db);
  logger.info("ipc_handlers_registered");

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});