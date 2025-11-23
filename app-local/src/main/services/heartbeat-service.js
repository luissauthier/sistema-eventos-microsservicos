const api = require("./api");
const AuthService = require("./auth-service");
const { createLogger } = require("../logger");

const logger = createLogger("heartbeat");
let intervalId = null;

function startHeartbeat() {
  if (intervalId) clearInterval(intervalId);

  // Envia o primeiro imediatamente
  send("online");

  intervalId = setInterval(() => {
    send("online");
  }, 30000); // A cada 30s
}

async function send(status) {
    const token = AuthService.getToken();
    if (!token) return;
    await api.sendHeartbeat(token, status);
}

// Função especial para quando clica no botão
async function setModeOffline() {
    if (intervalId) clearInterval(intervalId); // Para o loop
    logger.info("sending_offline_signal");
    await send("working_offline"); // Avisa o servidor: "Estou indo pro offline intencionalmente"
}

function stopHeartbeat() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startHeartbeat, stopHeartbeat, setModeOffline };