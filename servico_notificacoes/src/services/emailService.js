const nodemailer = require("nodemailer");
const logger = require("../config/logger");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info("SMTP connection established successfully");
      return true;
    } catch (error) {
      logger.error("SMTP connection failed", { error: error.message });
      return false;
    }
  }

  _getTemplate(tipo, data) {
    const templates = {
      inscricao: {
        subject: `Inscrição Confirmada: ${data.nome_evento}`,
        html: `<div style="font-family: Arial;"><h1>Olá, ${data.nome}</h1><p>Sua inscrição em <strong>${data.nome_evento}</strong> foi confirmada.</p></div>`
      },
      cancelamento: {
        subject: `Cancelamento: ${data.nome_evento}`,
        html: `<div style="font-family: Arial; color: red;"><h1>Aviso</h1><p>Sua inscrição em ${data.nome_evento} foi cancelada.</p></div>`
      },
      // Adicionar outros tipos aqui
    };
    return templates[tipo] || null;
  }

  async sendEmail(tipo, destinatario, data) {
    const template = this._getTemplate(tipo, data);
    if (!template) {
      throw new Error(`Template inválido: ${tipo}`);
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || '"Eventos Univates" <no-reply@univates.br>',
      to: destinatario,
      subject: template.subject,
      html: template.html,
    };

    // Retry logic simplificada
    let attempts = 0;
    while (attempts < 3) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info("Email sent", { messageId: info.messageId, tipo, to: destinatario });
        return info;
      } catch (error) {
        attempts++;
        logger.warn(`Attempt ${attempts} failed`, { error: error.message });
        if (attempts >= 3) throw error;
        await new Promise(r => setTimeout(r, 1000 * attempts)); // Backoff
      }
    }
  }
}

module.exports = new EmailService();