// main/logger.js
/**
 * Logger corporativo estruturado, inspirado nos serviços backend.
 */

function safeSerialize(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return "[unserializable]";
  }
}

function createLogger(context = "app-local") {
  function base(level, message, extra = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: "app-local",
      context,
      level,
      message,
      ...safeSerialize(extra),
    };

    // Sempre imprimir JSON puro
    console.log(JSON.stringify(logEntry));
  }

  return {
    info: (message, extra = {}) => base("INFO", message, extra),
    warn: (message, extra = {}) => base("WARN", message, extra),
    error: (message, extra = {}) => base("ERROR", message, extra),
    debug: (message, extra = {}) => base("DEBUG", message, extra),
  };
}

module.exports = {
  createLogger,
};
