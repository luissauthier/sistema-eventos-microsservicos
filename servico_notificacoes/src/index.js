// servico_notificacoes/src/index.js
require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const { randomUUID } = require("crypto");

// ============================================================
//  LOGGER PROFISSIONAL
// ============================================================

const logger = (label, extra = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    service: "servico_notificacoes",
    label,
    ...extra,
  };
  console.log(JSON.stringify(log));
};


// ============================================================
//  VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
// ============================================================

function envRequired(name) {
  const value = process.env[name];
  if (!value) {
    logger("missing_env", { variable: name });
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

const SMTP_HOST = envRequired("SMTP_HOST");
const SMTP_USER = envRequired("SMTP_USER");
const SMTP_PASS = envRequired("SMTP_PASS");
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@sistema.com";


// ============================================================
//  EXPRESS + MIDDLEWARES
// ============================================================

const app = express();
app.use(express.json());

// Adiciona request_id para rastreamento cross-service
app.use((req, res, next) => {
  req.request_id = randomUUID();
  res.setHeader("X-Request-ID", req.request_id);
  next();
});


// ============================================================
//  SMTP TRANSPORT (Nodemailer)
// ============================================================

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});


// ============================================================
//  FUNÇÃO DE RETRY (3 TENTATIVAS)
// ============================================================

async function sendWithRetry(mailOptions, requestId) {
  let delay = 300;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await transporter.sendMail(mailOptions);

      logger("email_sent", {
        attempt,
        requestId,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      return true;

    } catch (err) {
      logger("email_send_error", {
        attempt,
        requestId,
        error: err.message,
      });

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      }
    }
  }

  return false;
}


// ============================================================
//  TEMPLATES DE E-MAIL
// ============================================================

function buildEmailTemplate(tipo, nome, nome_evento) {
  switch (tipo) {
    case "inscricao":
      return {
        subject: `Confirmação de Inscrição: ${nome_evento}`,
        text: `Olá ${nome}, sua inscrição no evento ${nome_evento} foi confirmada!`,
        html: `<p>Olá <strong>${nome}</strong>,<br>Sua inscrição no evento <strong>${nome_evento}</strong> foi confirmada!</p>`,
      };

    case "cancelamento":
      return {
        subject: `Inscrição Cancelada: ${nome_evento}`,
        text: `Olá ${nome}, sua inscrição no evento ${nome_evento} foi cancelada.`,
        html: `<p>Olá <strong>${nome}</strong>,<br>Sua inscrição no evento <strong>${nome_evento}</strong> foi cancelada.</p>`,
      };

    case "checkin":
      return {
        subject: `Check-in Confirmado: ${nome_evento}`,
        text: `Olá ${nome}, seu check-in no evento ${nome_evento} foi registrado!`,
        html: `<p>Olá <strong>${nome}</strong>,<br>Seu check-in no evento <strong>${nome_evento}</strong> foi registrado!</p>`,
      };

    case "certificado":
      return {
        subject: `Seu Certificado Está Pronto: ${nome_evento}`,
        text: `Olá ${nome}, seu certificado do evento ${nome_evento} está disponível!`,
        html: `<p>Olá <strong>${nome}</strong>,<br>Seu certificado para o evento <strong>${nome_evento}</strong> está disponível!</p>`,
      };

    default:
      return null;
  }
}


// ============================================================
//  HEALTHCHECK PROFISSIONAL
// ============================================================

app.get("/health", async (req, res) => {
  try {
    await transporter.verify();
    res.json({ status: "ok", smtp: "connected" });
  } catch {
    res.status(503).json({ status: "error", smtp: "unavailable" });
  }
});


// ============================================================
//  POST /emails — ENVIO DE E-MAIL PROFISSIONAL
// ============================================================

app.post("/emails", async (req, res) => {
  const requestId = req.request_id;
  logger("email_request_received", { requestId, body: req.body });

  const { tipo, destinatario, nome, nome_evento } = req.body;

  // Validação forte
  if (!tipo || !destinatario || !nome) {
    return res.status(400).json({
      error: "Campos obrigatórios ausentes: tipo, destinatario, nome",
      requestId
    });
  }

  const template = buildEmailTemplate(tipo, nome, nome_evento);
  if (!template) {
    return res.status(400).json({ error: "Tipo de e-mail inválido", requestId });
  }

  const mailOptions = {
    from: `"Sistema de Eventos" <${MAIL_FROM}>`,
    to: destinatario,
    subject: template.subject,
    text: template.text,
    html: template.html,
  };

  const success = await sendWithRetry(mailOptions, requestId);

  if (success) {
    return res.status(202).json({ status: "enqueued", requestId });
  }

  // Mesmo falhando, retornamos 202
  return res.status(202).json({
    status: "accepted_but_failed",
    requestId
  });
});


// ============================================================
//  INICIALIZAÇÃO DO SERVIÇO
// ============================================================

const PORT = process.env.PORT || 8004;

app.listen(PORT, () => {
  logger("service_started", { port: PORT });
});