import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Determina quale servizio email usare basandosi sulla variabile d'ambiente
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'smtp'; // 'smtp' o 'resend'

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (EMAIL_SERVICE === 'resend') {
    return sendEmailWithResend({ to, subject, html });
  } else {
    return sendEmailWithSMTP({ to, subject, html });
  }
}

// ============================================================================
// INVIO CON RESEND (consigliato per Vercel)
// ============================================================================
async function sendEmailWithResend({ to, subject, html }: SendEmailOptions) {
  console.log('📧 Usando Resend per inviare email a:', to);

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurata. Vai su https://resend.com per ottenere una chiave API.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'noreply@sballando.it',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('❌ Errore Resend:', error);
      throw error;
    }

    console.log('✅ Email inviata con Resend. ID:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Errore nell\'invio con Resend:', error);
    throw error;
  }
}

// ============================================================================
// INVIO CON SMTP (Aruba o altri provider)
// ============================================================================
async function sendEmailWithSMTP({ to, subject, html }: SendEmailOptions) {
  console.log('📧 Configurazione SMTP:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM,
  });

  console.log('📧 Tentativo di invio email a:', to);

  // Configurazione del trasporto email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Per evitare problemi con certificati self-signed
      ciphers: 'SSLv3', // Compatibility con Aruba
    },
    // Opzioni specifiche per Aruba
    connectionTimeout: 10000, // 10 secondi
    greetingTimeout: 10000,
    socketTimeout: 10000,
    debug: true, // Abilita debug per vedere i log
    logger: true, // Abilita logging
  });

  try {
    // Verifica la connessione
    await transporter.verify();
    console.log('✅ Connessione SMTP verificata con successo');

    // Invia l'email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Sballando Backoffice'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email inviata con successo:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Errore nell\'invio email:', error);
    throw error;
  }
}

// ============================================================================
// TEMPLATE EMAIL PER RESET PASSWORD
// ============================================================================
export function generatePasswordResetEmail(resetLink: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reimpostazione Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .content p {
          margin: 0 0 20px 0;
          font-size: 16px;
        }
        .button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          font-size: 14px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #e9ecef;
        }
        .link-text {
          word-break: break-all;
          font-size: 14px;
          color: #6c757d;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Reimpostazione Password</h1>
        </div>
        <div class="content">
          <p>Ciao${userName ? ` ${userName}` : ''},</p>
          <p>Hai richiesto di reimpostare la password del tuo account Sballando Backoffice.</p>
          <p>Clicca sul pulsante qui sotto per creare una nuova password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reimposta Password</a>
          </div>
          
          <div class="warning">
            ⏰ <strong>Attenzione:</strong> Questo link è valido per 1 ora e può essere usato una sola volta.
          </div>
          
          <p>Se non hai richiesto questa reimpostazione, ignora questa email. La tua password rimarrà invariata.</p>
          
          <p class="link-text">
            Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
            <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
          </p>
        </div>
        <div class="footer">
          <p>Questa è un'email automatica. Per favore non rispondere.</p>
          <p>&copy; ${new Date().getFullYear()} Sballando. Tutti i diritti riservati.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
