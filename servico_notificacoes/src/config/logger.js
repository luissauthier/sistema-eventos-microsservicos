const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Garante que a pasta existe
const logDir = '/app/logs';
if (!fs.existsSync(logDir)) {
  try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) {}
}

// Formatador JSON
const pythonLikeFormat = winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
  return JSON.stringify({
    asctime: timestamp.replace('T', ' ').split('.')[0],
    levelname: level.toUpperCase(),
    name: "servico_notificacoes",
    message: message,
    request_id: requestId || "-",
    ...meta
  });
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    pythonLikeFormat
  ),
  transports: [
    // 1. Console (Docker Logs)
    new winston.transports.Console(),
    
    // 2. Arquivo (Persistência na VM)
    new winston.transports.File({ filename: path.join(logDir, 'notificacoes.json') })
  ],
});

module.exports = logger;
