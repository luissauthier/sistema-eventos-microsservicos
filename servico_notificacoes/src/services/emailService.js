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
    
    // Configurações de Estilo "Premium Corporate" (NexStage)
    this.brandColor = "#D4AF37"; // Dourado Premium (Ajuste conforme seu App.css)
    this.bgColor = "#111827";    // Fundo muito escuro (Gray 900)
    this.cardColor = "#1F2937";  // Fundo do cartão (Gray 800)
    this.textColor = "#F3F4F6";  // Texto claro (Gray 100)
    this.mutedColor = "#9CA3AF"; // Texto secundário (Gray 400)
    this.logoUrl = "http://177.44.248.76/portal-web/public/logo-email.png"; 
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

  // Helper para gerar o HTML Base (Wrapper)
  _wrapHtml(title, content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${this.bgColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${this.bgColor}; width: 100%;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; max-width: 600px; background-color: ${this.cardColor}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
                
                <tr>
                  <td height="6" style="background-color: ${this.brandColor}; line-height: 6px; font-size: 6px;">&nbsp;</td>
                </tr>

                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <img src="${this.logoUrl}" alt="NexStage" width="150" style="display: block; border: 0; max-width: 100%; height: auto;">
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 40px 40px 40px; color: ${this.textColor}; text-align: left;">
                    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: ${this.textColor};">${title}</h1>
                    <div style="font-size: 16px; line-height: 24px; color: ${this.mutedColor};">
                      ${content}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 30px; background-color: #1a222e; text-align: center; border-top: 1px solid #374151;">
                    <p style="margin: 0; font-size: 12px; color: ${this.mutedColor};">
                      &copy; ${new Date().getFullYear()} NexStage Eventos. Todos os direitos reservados.<br>
                      <a href="#" style="color: ${this.brandColor}; text-decoration: none;">Gerenciar Notificações</a>
                    </p>
                  </td>
                </tr>

              </table>
              </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  _getTemplate(tipo, data) {
    // Definição dos templates específicos
    const templates = {
      inscricao: {
        subject: `✅ Inscrição confirmada: ${data.nome_evento}`,
        content: `
          <p>Olá, <strong style="color: ${this.textColor};">${data.nome}</strong>!</p>
          <p>É com prazer que confirmamos sua presença no evento <strong style="color: ${this.brandColor};">${data.nome_evento}</strong>.</p>
          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 30px 0;">
            <tr>
              <td align="center" bgcolor="${this.brandColor}" style="border-radius: 6px;">
                <a href="${process.env.FRONTEND_URL || '#'}" target="_blank" style="display: inline-block; padding: 12px 24px; font-family: sans-serif; font-size: 16px; color: #000000; font-weight: bold; text-decoration: none; border-radius: 6px;">
                  Acessar ingresso
                </a>
              </td>
            </tr>
          </table>
          <p>Prepare-se para uma experiência incrível.</p>
        `
      },
      cancelamento: {
        subject: `⚠️ Cancelamento: ${data.nome_evento}`,
        content: `
          <p>Olá, ${data.nome}.</p>
          <p>Informamos que sua inscrição no evento <strong>${data.nome_evento}</strong> foi cancelada.</p>
          <p>Caso isso tenha sido um erro, entre em contato com o suporte.</p>
        `
      },
      // Adicione outros tipos aqui (ex: certificado, lembrete)
    };

    const template = templates[tipo];
    
    if (!template) {
      return null;
    }

    // Envolve o conteúdo específico no Template Premium
    return {
      subject: template.subject,
      html: this._wrapHtml(template.subject, template.content)
    };
  }

  async sendEmail(tipo, destinatario, data) {
    const templateData = this._getTemplate(tipo, data);
    
    if (!templateData) {
      throw new Error(`Template inválido: ${tipo}`);
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || '"NexStage" <no-reply@nexstage.com>',
      to: destinatario,
      subject: templateData.subject,
      html: templateData.html,
    };

    // Retry logic
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
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
  }
}

module.exports = new EmailService();
