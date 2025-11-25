# 🚀 Guida Deploy Sistema Reset Password

## ✅ Completato in Locale
- ✅ API `/api/auth/forgot-password` - Funzionante
- ✅ API `/api/auth/reset-password` - Funzionante  
- ✅ Pagina `/reset-password/[token]` - Funzionante
- ✅ Test SMTP con Aruba - Email inviata con successo
- ✅ Build Next.js - Compilata senza errori

## 🔧 PASSAGGI OBBLIGATORI SU VERCEL

### 1️⃣ Configura Environment Variables

Vai su: https://vercel.com → Progetto → Settings → Environment Variables

Aggiungi queste variabili (seleziona Production + Preview + Development):

```
DATABASE_URL=mysql://censimento:Cmh_2017@217.160.144.254:3306/sballando.it
SMTP_HOST=smtps.aruba.it
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@sballando.it
SMTP_PASS=Sba77ando1_
SMTP_FROM=info@sballando.it
SMTP_FROM_NAME=Sballando
JWT_SECRET=9c33353a37e0b33a1d7767e49c32535a140c92b498f373001c2e521570298662270a8d22aa9b76dd5389b6306dd04aea574e256f39c142d8e41692949417eaa4
JWT_REFRESH_SECRET=359a4f063a3ad7989673ece1f209b8e5952de6ddfb0bb9c5934020de57c658dc90a40a09ba28d63a3558f00df51566e1ea2b6ca30797883efeffca15cf09c7a2
NEXT_PUBLIC_BASE_URL=https://backoffice-sballando-next.vercel.app
```

### 2️⃣ Committa e Pusha il Codice

```bash
git add .
git commit -m "Add password reset feature with email support"
git push origin main
```

### 3️⃣ Redeploy su Vercel

- Vai su Deployments
- Clicca sui 3 puntini del deploy più recente
- Seleziona "Redeploy"
- ⚠️ **DESELEZIONA** "Use existing Build Cache"
- Conferma il redeploy

### 4️⃣ Verifica il Deploy

**Test 1 - Variabili d'ambiente:**
```
https://backoffice-sballando-next.vercel.app/api/health
```
Tutte le variabili devono essere ✅

**Test 2 - Password dimenticata:**
```
https://backoffice-sballando-next.vercel.app
```
1. Clicca "Password dimenticata?"
2. Inserisci un'email valida
3. Dovresti ricevere l'email

**Test 3 - Reset password:**
```
https://backoffice-sballando-next.vercel.app/reset-password/[TOKEN]
```
1. Prendi il token dall'email ricevuta
2. Vai al link
3. Inserisci la nuova password
4. Conferma

---

## 🐛 Se ricevi errore 405

L'errore 405 significa che:
- Le variabili d'ambiente non sono configurate → l'API fallisce
- C'è un problema di cache → fai redeploy SENZA cache
- Il metodo HTTP non è supportato → verifica i log di Vercel

**Soluzione:**
1. Controlla che TUTTE le variabili siano configurate
2. Vai su Vercel Logs e cerca gli errori
3. Fai un redeploy completo senza cache

---

## 📋 Checklist Finale

- [ ] Tutte le variabili d'ambiente configurate su Vercel
- [ ] Commit e push del codice
- [ ] Redeploy senza cache
- [ ] Test `/api/health` → tutte ✅
- [ ] Test forgot password → email ricevuta
- [ ] Test reset password → password cambiata
- [ ] Login con nuova password → funziona

---

## 🎉 Sistema Completo

Una volta completati tutti i passaggi, avrai:
- ✅ Login con recupero password
- ✅ Email HTML responsive
- ✅ Token sicuri con scadenza (1 ora)
- ✅ Validazione password lato client e server
- ✅ Feedback visivo con toast notifications
- ✅ Indicatore forza password
