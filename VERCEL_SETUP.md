## 🔧 GUIDA CONFIGURAZIONE VERCEL

### Passo 1: Vai su Vercel Dashboard
1. Apri https://vercel.com/dashboard
2. Seleziona il progetto `backoffice-sballando-next`
3. Vai su **Settings** → **Environment Variables**

### Passo 2: Aggiungi queste variabili d'ambiente

**⚠️ IMPORTANTE: Aggiungi TUTTE queste variabili!**

```
DATABASE_URL=mysql://censimento:Cmh_2017@217.160.144.254:3306/sballando.it

STRIPE_SECRET_KEY=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

STRIPE_RETURN_URL=https://webservice.sballando.it/api/payments/stripe_account_verify

NEXT_PUBLIC_BASE_URL=https://backoffice-sballando-next.vercel.app

SFTP_HOST=217.160.144.254
SFTP_PORT=22
SFTP_USERNAME=root
SFTP_PASSWORD=Sh4d0vv@ZOII!
SFTP_UPLOAD_PATH=/var/www/html/webservice.sballando.it/storage/app/public

UPLOADS_BASE_URL=https://webservice.sballando.it/storage

JWT_SECRET=9c33353a37e0b33a1d7767e49c32535a140c92b498f373001c2e521570298662270a8d22aa9b76dd5389b6306dd04aea574e256f39c142d8e41692949417eaa4

JWT_REFRESH_SECRET=359a4f063a3ad7989673ece1f209b8e5952de6ddfb0bb9c5934020de57c658dc90a40a09ba28d63a3558f00df51566e1ea2b6ca30797883efeffca15cf09c7a2

SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@sballando.it
SMTP_PASS=Sba77ando1_
SMTP_FROM=info@sballando.it
SMTP_FROM_NAME=Sballando
```

### Passo 3: Seleziona gli Environment
Per ogni variabile, seleziona tutti e tre gli ambienti:
- ✅ Production
- ✅ Preview
- ✅ Development

### Passo 4: Salva e Redeploy
1. Clicca **Save** dopo aver aggiunto tutte le variabili
2. Vai su **Deployments**
3. Clicca sui tre puntini del deployment più recente
4. Seleziona **Redeploy**
5. ✅ Assicurati che "Use existing Build Cache" sia DISABILITATO

### Passo 5: Verifica il Deploy
1. Aspetta che il deploy finisca (circa 2-3 minuti)
2. Vai su https://backoffice-sballando-next.vercel.app
3. Testa il recupero password

---

## 🐛 Se l'errore persiste

Apri la console del browser (F12) e cerca errori. I log che ho aggiunto ti mostreranno:
- Lo status HTTP della risposta
- Gli header
- Il contenuto della risposta (anche se non è JSON)

Poi dimmi cosa vedi nella console!
