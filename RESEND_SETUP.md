# 📧 Setup Resend per Email (Alternativa ad Aruba SMTP)

## 🎯 Perché Resend?

Aruba SMTP ha **bloccato temporaneamente** l'invio dalla casella `info@sballando.it` con l'errore:
```
525 5.7.13 Invio temporaneamente disabilitato per la casella, modificare la password
```

Resend è **consigliato per Vercel** perché:
- ✅ Funziona perfettamente con serverless functions
- ✅ 3000 email/mese GRATIS
- ✅ Nessun problema di porte bloccate
- ✅ API semplice e veloce
- ✅ Statistiche e tracking avanzati

## 🚀 Setup in 5 minuti

### 1. Crea un account Resend

1. Vai su **https://resend.com**
2. Clicca su **"Sign Up"**
3. Registrati con il tuo account GitHub o email

### 2. Ottieni la API Key

1. Dopo il login, vai su **"API Keys"** nella sidebar
2. Clicca su **"Create API Key"**
3. Nome: `Sballando Backoffice Production`
4. Permessi: **Full Access** (o solo "Sending access")
5. Clicca su **"Add"**
6. **COPIA LA CHIAVE** (inizia con `re_...`)

⚠️ **IMPORTANTE**: La chiave viene mostrata **solo una volta**! Salvala subito.

### 3. (Opzionale ma consigliato) Configura il dominio

Per inviare email da `noreply@sballando.it` invece di `onboarding@resend.dev`:

1. Vai su **"Domains"** nella sidebar
2. Clicca su **"Add Domain"**
3. Inserisci: `sballando.it`
4. Aggiungi i record DNS che Resend ti fornisce:
   - **SPF** (TXT)
   - **DKIM** (TXT)
   - **DMARC** (TXT)
5. Aspetta la verifica (5-30 minuti)

### 4. Configura le variabili d'ambiente

#### **Locale (.env)**

```bash
# Cambia il servizio email da SMTP a Resend
EMAIL_SERVICE=resend

# API Key di Resend (sostituisci con la tua)
RESEND_API_KEY=re_tuachiaveresendqui

# Mantieni queste per compatibilità (opzionale)
SMTP_FROM=noreply@sballando.it
SMTP_FROM_NAME=Sballando
```

#### **Vercel (Produzione)**

Vai su **Vercel Dashboard** → Progetto → **Settings** → **Environment Variables**:

1. Aggiungi:
   - **Nome**: `EMAIL_SERVICE`
   - **Valore**: `resend`
   - **Environments**: Production, Preview, Development

2. Aggiungi:
   - **Nome**: `RESEND_API_KEY`
   - **Valore**: `re_tuachiaveresendqui` (la tua chiave API)
   - **Environments**: Production, Preview, Development

3. (Opzionale) Aggiorna:
   - **Nome**: `SMTP_FROM`
   - **Valore**: `noreply@sballando.it` (o `onboarding@resend.dev` se non hai configurato il dominio)

4. Clicca su **"Save"**

### 5. Deploy

```bash
git add .
git commit -m "feat: switch to Resend for email delivery"
git push
```

Vercel farà automaticamente il deploy con le nuove variabili.

## 🧪 Test

### Test locale

```bash
# Imposta EMAIL_SERVICE=resend nel tuo .env
npm run dev

# Vai su http://localhost:3002 e testa il recupero password
```

### Test produzione

```bash
curl -X POST https://backoffice-sballando-next.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"tuaemail@example.com"}'
```

Dovresti ricevere l'email in pochi secondi!

## 📊 Monitoraggio

Vai su **https://resend.com/emails** per vedere:
- ✅ Email inviate
- ❌ Email fallite
- 📈 Statistiche di apertura (se abilitate)
- 🔍 Log dettagliati

## 🔄 Ritornare ad Aruba SMTP

Se risolvi il problema con Aruba e vuoi tornare a usare SMTP:

1. **Locale (.env)**:
   ```bash
   EMAIL_SERVICE=smtp
   ```

2. **Vercel**:
   - Cambia `EMAIL_SERVICE` da `resend` a `smtp`
   - O rimuovi completamente la variabile (default è SMTP)

3. **Deploy**:
   ```bash
   git push
   ```

## ❓ FAQ

### Posso inviare email da `info@sballando.it` con Resend?

Sì, ma devi:
1. Aggiungere il dominio `sballando.it` su Resend
2. Configurare i record DNS (SPF, DKIM, DMARC)
3. Aspettare la verifica

Altrimenti puoi usare `onboarding@resend.dev` (dominio di default).

### Quante email posso inviare gratis?

- **3000 email/mese** nel piano gratuito
- Poi €20/mese per 50,000 email

Per un backoffice, 3000/mese dovrebbero bastare!

### Resend supporta allegati?

Sì, ma non ne hai bisogno per il reset password.

### Le email finiscono in spam?

Molto meno rispetto a SMTP "fai da te". Resend ha:
- ✅ IP reputati
- ✅ Autenticazione SPF/DKIM automatica
- ✅ Feedback loops

## 🆘 Supporto

- **Documentazione**: https://resend.com/docs
- **Status**: https://resend.com/status
- **Support**: support@resend.com

---

**Fatto!** 🎉 Ora il tuo sistema di recupero password funzionerà perfettamente su Vercel!
