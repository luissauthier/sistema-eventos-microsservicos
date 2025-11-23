const winston = require('winston');

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
    new winston.transports.Console()
  ],
});

module.exports = logger;