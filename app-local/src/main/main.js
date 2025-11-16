// main/main.js
/**
 * Processo Principal (Main) — App Local
 * Arquitetura Profissional + Segurança Máxima
 */

const { app, BrowserWindow } = require("electron");
const path = require("node:path");

const { createLogger } = require("./logger");
const { createDatabase } = require("./db/db");
const { initIPC } = require("./ipc/index");
const { secureWindowConfig } = require("./security");

const logger = createLogger("main");

// Remove comportamento padrão do Squirrel no Windows
if (require("electron-squirrel-startup")) {
  app.quit();
}

// ============================================================
//  FUNÇÃO: Criar janela principal com máxima segurança
// ============================================================

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    ...secureWindowConfig,
    show: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      devTools: process.env.NODE_ENV === "development",
    },
  });

  win.webContents.openDevTools();

  const devServer = process.env.VITE_DEV_SERVER_URL;

  // Load do React/Vite
  if (devServer) {
    win.loadURL(devServer);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  logger.info("window_loaded");
}

// ============================================================
//  APLICAÇÃO PRINCIPAL
// ============================================================

app.whenReady().then(async () => {
  try {
    logger.info("app_starting");

    // 1) Inicializar banco SQLite
    const db = await createDatabase(app);
    logger.info("database_initialized");

    // 2) Registrar IPCs (agora passando o DB)
    initIPC(db);
    logger.info("ipc_handlers_registered");

    // 3) Criar janela seguro
    createMainWindow();

    // 4) Manter comportamento no macOS
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  } catch (err) {
    logger.error("app_initialization_error", { error: err.message });
    app.quit();
  }
});

// ============================================================
//  Encerramento seguro
// ============================================================

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    logger.info("app_closed");
    app.quit();
  }
});