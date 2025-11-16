// main/ipc/index.js
/**
 * IPC Main Orchestrator
 * 
 * Porta de comunicação segura entre Renderer → Main
 * 
 * - Nenhuma lógica de negócio aqui
 * - Apenas delega para serviços
 * - Validação obrigatória
 * - JSON seguro
 * - Logs estruturados
 */

const { ipcMain } = require("electron");

const { createLogger } = require("../logger");
const logger = createLogger("ipc");

const { safeParse } = require("../../../utils/safe-json");
const { validatePayload } = require("../../../utils/validators");

// Serviços
const createAuthService = require("../services/auth-service");
const createSyncDownloadService = require("../services/sync-download");
const createSyncUploadService = require("../services/sync-upload");
const offlineService = require("../services/offline-service");

// Banco inicializado no main.js
let db = null;

// Inicialização dos serviços (executada pelo main.js)
function initIPC(dbInstance) {
  db = dbInstance;

  const authService = createAuthService();
  const syncDownload = createSyncDownloadService(db);
  const syncUpload = createSyncUploadService(db);
  const offline = offlineService;

  logger.info("ipc_initialized");

  // ============================================================
  //  IPC HELPERS
  // ============================================================

  function handle(channel, schema, handler) {
    ipcMain.handle(channel, async (_, rawData) => {
      logger.info("ipc_invoke", { channel });

      // 1) Segurança: garantir que não vem lixo do Renderer
      const data = safeParse(JSON.stringify(rawData), {});

      // 2) Validação obrigatória
      let payload = {};
      if (schema) {
        try {
          payload = validatePayload(schema, data);
        } catch (err) {
          logger.warn("ipc_validation_failed", {
            channel,
            error: err.message
          });
          return { success: false, message: err.message };
        }
      }

      // 3) Execução segura
      try {
        return await handler(payload);
      } catch (err) {
        logger.error("ipc_handler_error", {
          channel,
          error: err.message
        });
        return { success: false, message: err.message };
      }
    });
  }

  // ============================================================
  //  IPC: AUTH
  // ============================================================

  handle(
    "login-api",
    {
      username: { type: "nonEmptyString", required: true, trim: true },
      password: { type: "nonEmptyString", required: true }
    },
    async (payload) => {
      return await authService.login(payload.username, payload.password);
    }
  );

  handle("logout", null, async () => authService.logout());

  // ============================================================
  //  IPC: SYNC DOWNLOAD
  // ============================================================

  handle(
    "sincronizar-download",
    null,
    async () => {
      if (!authService.isAuthenticated())
        return { success: false, message: "Não autenticado." };

      return await syncDownload.syncDownload(authService.getToken());
    }
  );

  // ============================================================
  //  IPC: SYNC UPLOAD
  // ============================================================

  handle(
    "sincronizar-upload",
    null,
    async () => {
      if (!authService.isAuthenticated())
        return { success: false, message: "Não autenticado." };

      return await syncUpload.syncUpload(authService.getToken());
    }
  );

  // ============================================================
  //  IPC: OFFLINE FLOW
  // ============================================================

  handle(
    "cadastrar-usuario-local",
    {
      nome: { type: "nonEmptyString", required: true, trim: true },
      email: { type: "email", required: true, trim: true },
      senha: { type: "nonEmptyString", required: true }
    },
    async (payload) => offline.cadastrarUsuario(payload)
  );

  handle(
    "inscrever-local",
    {
      usuario_id_local: { type: "positiveInt", required: true },
      evento_id_server: { type: "positiveInt", required: true }
    },
    async (payload) => offline.inscrever(payload)
  );

  handle(
    "registrar-presenca-local",
    {
      inscricaoIdLocal: { type: "positiveInt", required: true }
    },
    async (payload) => offline.registrarPresenca(payload.inscricaoIdLocal)
  );

  handle(
    "buscar-dados-locais",
    null,
    async () => offline.buscarDados()
  );
}

module.exports = { initIPC };