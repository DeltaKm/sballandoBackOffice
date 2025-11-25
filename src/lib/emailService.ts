import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Configurazione del trasporto email
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Invia l'email
  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'Sballando Backoffice'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  return info;
}

export function generatePasswordResetEmail(resetLink: string, userName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #FC0045;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #FC0045;
          color: white !important;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Sballando Backoffice</h1>
      </div>
      <div class="content">
        <h2>Ciao ${userName}!</h2>
        <p>Hai richiesto di reimpostare la tua password per accedere al backoffice di Sballando.</p>
        <p>Clicca sul pulsante qui sotto per creare una nuova password:</p>
        <center>
          <a href="${resetLink}" class="button">Reimposta Password</a>
        </center>
        <p><strong>Nota importante:</strong> Questo link è valido per 1 ora. Se non hai richiesto tu questa reimpostazione, ignora questa email.</p>
        <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
        <p style="word-break: break-all; color: #FC0045;">${resetLink}</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Sballando. Tutti i diritti riservati.</p>
        <p>Questa è un'email automatica, ti preghiamo di non rispondere.</p>
      </div>
    </body>
    </html>
  `;
}
