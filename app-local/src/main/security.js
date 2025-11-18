// main/security.js
/**
 * Configurações de segurança corporativas para BrowserWindow.
 */

const { shell } = require("electron");

// ======================================================================
//  CONFIGURAÇÃO PADRÃO DE JANELA (EXTREMAMENTE RESTRITA)
// ======================================================================

const secureWindowConfig = {
  show: false,                 // janela aparece apenas quando estiver pronta
  autoHideMenuBar: true,
  backgroundColor: "#ffffff",

  webPreferences: {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    enableRemoteModule: false,

    // Evita que páginas externas leiam sua origem
    webSecurity: true,

    // JAMAIS permitir conteúdo misto (HTTP dentro de HTTPS)
    allowRunningInsecureContent: false,

    // Protege contra XSS básicos
    defaultEncoding: "UTF-8",

    // Controlado no main.js
    preload: null,
  },
};

// ======================================================================
//  FUNÇÃO PARA ENDURECER UMA JANELA
// ======================================================================

function applySecurityHooks(win, logger) {
  // CSP: impede execução de scripts remotos
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "connect-src 'self' http://localhost:* http://127.0.0.1:*; " +
          "img-src 'self' data:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "frame-ancestors 'none'; " +
          "form-action 'self';"
        ],
      },
    });
  });

  // Evita navegar para links externos
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://") && !url.startsWith("file://")) {
      event.preventDefault();
      logger.warn("navigation_blocked", { url });
    }
  });

  // Bloqueia abertura de novas janelas
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Permite abrir apenas URLs externas no navegador padrão
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }

    return { action: "deny" };
  });

  // Exibir janela apenas quando renderizada
  win.once("ready-to-show", () => {
    win.show();
  });
}

// ======================================================================
//  EXPORTS
// ======================================================================

module.exports = {
  secureWindowConfig,
  applySecurityHooks,
};