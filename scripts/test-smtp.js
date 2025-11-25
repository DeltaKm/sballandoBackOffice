// Test SMTP connection per Aruba
import nodemailer from 'nodemailer';

async function testSMTP() {
  console.log('🧪 Test connessione SMTP Aruba\n');

  const config = {
    host: 'smtps.aruba.it',
    port: 465,
    secure: true,
    auth: {
      user: 'info@sballando.it',
      pass: 'Sba77ando1_',
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  console.log('📧 Configurazione:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
  });

  const transporter = nodemailer.createTransport(config);

  try {
    console.log('\n🔍 Verifica connessione...');
    await transporter.verify();
    console.log('✅ Connessione SMTP verificata con successo!\n');

    console.log('📨 Invio email di test...');
    const info = await transporter.sendMail({
      from: '"Sballando Test" <info@sballando.it>',
      to: 'info@sballando.it', // Invia a te stesso
      subject: 'Test SMTP - ' + new Date().toLocaleString(),
      text: 'Questo è un test di invio email da Nodemailer.',
      html: '<b>Questo è un test di invio email da Nodemailer.</b>',
    });

    console.log('✅ Email inviata con successo!');
    console.log('Message ID:', info.messageId);
    console.log('\n✅ Test completato con successo!');
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error instanceof Error ? error.message : String(error));
    console.error('\nDettagli completi:', error);
  }
}

testSMTP();
