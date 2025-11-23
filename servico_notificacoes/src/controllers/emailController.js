const emailService = require("../services/emailService");
const logger = require("../config/logger");

exports.sendEmail = async (req, res) => {
  const { tipo, destinatario, nome, nome_evento } = req.body;
  const requestId = req.headers['x-request-id'] || 'unknown';

  if (!tipo || !destinatario || !nome) {
    logger.warn("Validation error", { requestId, body: req.body });
    return res.status(400).json({ error: "Campos obrigatórios: tipo, destinatario, nome" });
  }

  // Resposta Assíncrona "Fake" (Fire and Forget com catch)
  // Para não bloquear a API de quem chama enquanto o SMTP processa
  emailService.sendEmail(tipo, destinatario, { nome, nome_evento })
    .catch(err => logger.error("Async email error", { requestId, error: err.message }));

  // Retorna 202 Accepted imediatamente
  return res.status(202).json({ 
    message: "Solicitação de e-mail recebida e sendo processada",
    requestId 
  });
};