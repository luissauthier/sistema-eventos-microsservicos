// servico_notificacoes/src/index.js
require('dotenv').config(); // Carrega .env (MAIL_HOST, MAIL_USER, etc.)
const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json()); // Middleware para ler JSON body

const PORT = process.env.PORT || 8004;

// 1. Configurar o "Transporter" (como o e-mail será enviado)
// (Usando Mailtrap/SMTP genérico como exemplo)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.get('/', (req, res) => {
  res.send('Serviço de Notificações (Node.js) está online');
});

// ==========================================================
// IMPLEMENTAÇÃO 5: LÓGICA REAL DE E-MAIL
// ==========================================================
app.post('/emails', async (req, res) => {
  console.log("Recebida solicitação para POST /emails");
  const { tipo, destinatario, nome, nome_evento } = req.body;

  if (!tipo || !destinatario) {
    return res.status(400).json({ message: "Dados insuficientes (tipo, destinatario)" });
  }

  let subject = "";
  let text = "";
  let html = "";

  // 2. Selecionar o Template
  switch (tipo) {
    case 'inscricao':
      subject = `Confirmação de Inscrição: ${nome_evento}`;
      text = `Olá ${nome}, sua inscrição no evento ${nome_evento} foi confirmada!`;
      html = `<p>Olá <strong>${nome}</strong>,</p><p>Sua inscrição no evento <strong>${nome_evento}</strong> foi confirmada!</p>`;
      break;
    case 'cancelamento':
      subject = `Inscrição Cancelada: ${nome_evento}`;
      text = `Olá ${nome}, sua inscrição no evento ${nome_evento} foi cancelada.`;
      html = `<p>Olá <strong>${nome}</strong>,</p><p>Sua inscrição no evento <strong>${nome_evento}</strong> foi cancelada.</p>`;
      break;
    case 'checkin':
      subject = `Check-in Confirmado: ${nome_evento}`;
      text = `Olá ${nome}, seu check-in no evento ${nome_evento} foi registrado! Esperamos que aproveite.`;
      html = `<p>Olá <strong>${nome}</strong>,</p><p>Seu check-in no evento <strong>${nome_evento}</strong> foi registrado! Esperamos que aproveite.</p>`;
      break;
    default:
      console.warn(`Tipo de e-mail desconhecido: ${tipo}`);
      return res.status(400).json({ message: "Tipo de e-mail inválido" });
  }

  // 3. Definir opções de envio
  const mailOptions = {
    from: `"Sistema de Eventos" <${process.env.MAIL_FROM || 'nao-responda@eventos.com'}>`,
    to: destinatario,
    subject: subject,
    text: text,
    html: html,
  };

  try {
    // 4. Enviar o e-mail
    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado (${tipo}) para: ${destinatario}`);
    res.status(202).json({ message: "Solicitação de e-mail enviada" });
  } catch (error) {
    console.error(`Falha ao enviar e-mail para ${destinatario}: ${error.message}`);
    // Não retorna 500, pois este é um serviço assíncrono.
    // O ideal seria enfileirar para retentativa (ex: RabbitMQ).
    res.status(202).json({ message: "Solicitação aceita, mas falha no envio." });
  }
});

app.listen(PORT, () => {
  console.log(`Serviço de Notificações rodando na porta ${PORT}`);
});