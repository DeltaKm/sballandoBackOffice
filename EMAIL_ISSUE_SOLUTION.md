# 🚨 Problema Email Aruba - Risoluzione

## 📋 Problema Identificato

**Errore da Vercel:**
```
525 5.7.13 Invio temporaneamente disabilitato per la casella, modificare la password / 
Sending temporarily disabled for this mailbox, please change password
```

**Causa:** Aruba ha **bloccato temporaneamente** l'invio dalla casella `info@sballando.it` per motivi di sicurezza. Questo è un meccanismo di protezione automatico di Aruba.

## ✅ Soluzione Implementata

Ho implementato un **sistema email flessibile** che supporta 2 provider:

1. **SMTP (Aruba)** - Default, quello attuale
2. **Resend** - Alternativa consigliata per Vercel

### 📂 File Modificati

- ✅ `src/lib/emailService.ts` - Supporto per entrambi i provider
- ✅ `package.json` - Aggiunto pacchetto `resend`
- ✅ `.env` - Documentazione variabili email
- ✅ `RESEND_SETUP.md` - Guida completa setup Resend

### 🎯 Come Funziona

Il sistema legge la variabile `EMAIL_SERVICE`:
- `EMAIL_SERVICE=smtp` → Usa Aruba SMTP
- `EMAIL_SERVICE=resend` → Usa Resend API

## 🔧 Opzioni per Risolvere

### Opzione 1: Cambiare Password Aruba (Veloce)

1. Vai su **https://webmail.aruba.it**
2. Login con: `info@sballando.it`
3. Cambia la password
4. Aggiorna la password in:
   - `.env` locale: `SMTP_PASS=nuovapassword`
   - Vercel Dashboard: Variabile `SMTP_PASS`
5. Deploy: `git push`

**Pro:**
- ✅ Veloce (5 minuti)
- ✅ Nessun cambio di servizio
- ✅ Mantieni lo stesso indirizzo email

**Contro:**
- ❌ Potrebbe ribloccadarsi in futuro
- ❌ Aruba può avere problemi con Vercel

---

### Opzione 2: Passare a Resend (Consigliato)

1. **Crea account su https://resend.com**
2. **Ottieni API Key** (inizia con `re_...`)
3. **Configura variabili:**
   
   **Locale (.env):**
   ```bash
   EMAIL_SERVICE=resend
   RESEND_API_KEY=re_tuachiaveresendqui
   ```
   
   **Vercel Dashboard:**
   - `EMAIL_SERVICE` = `resend`
   - `RESEND_API_KEY` = `re_tuachiaveresendqui`

4. **(Opzionale) Configura dominio:**
   - Aggiungi `sballando.it` su Resend
   - Configura record DNS (SPF, DKIM, DMARC)
   - Potrai inviare da `noreply@sballando.it`
   - Altrimenti userai `onboarding@resend.dev`

5. **Deploy:**
   ```bash
   git add .
   git commit -m "feat: add Resend support for email delivery"
   git push
   ```

**Pro:**
- ✅ 3000 email/mese **GRATIS**
- ✅ Funziona perfettamente su Vercel
- ✅ Nessun problema di porte bloccate
- ✅ Statistiche e tracking
- ✅ IP reputati (meno spam)

**Contro:**
- ❌ Richiede configurazione DNS per dominio personalizzato
- ❌ Email da `onboarding@resend.dev` se non configuri il dominio

---

## 📊 Confronto Servizi

| Feature | Aruba SMTP | Resend |
|---------|------------|--------|
| **Costo** | Incluso con dominio | 3000 email/mese gratis |
| **Affidabilità su Vercel** | ⚠️ Problemi | ✅ Perfetto |
| **Porte bloccate** | ⚠️ Possibile | ✅ No (API) |
| **IP Reputazione** | ⚠️ Variabile | ✅ Eccellente |
| **Statistiche** | ❌ No | ✅ Sì |
| **Setup** | ⏱️ 2 min | ⏱️ 5 min |
| **Dominio personalizzato** | ✅ Incluso | ✅ Richiede DNS |

---

## 🚀 Raccomandazione

### Per Produzione (Vercel):
**Usa Resend** → Più affidabile, nessun blocco, statistiche

### Per Test Locale:
**Usa SMTP** → Funziona, già configurato

### Configurazione Ibrida (Migliore):
```bash
# .env.local (sviluppo)
EMAIL_SERVICE=smtp

# Vercel (produzione)
EMAIL_SERVICE=resend
RESEND_API_KEY=re_...
```

---

## 📝 Prossimi Passi

1. **Decidi quale opzione usare** (cambia password Aruba o passa a Resend)

2. **Se scegli Resend:**
   - Leggi `RESEND_SETUP.md` per la guida completa
   - Crea account su https://resend.com
   - Ottieni API Key
   - Configura variabili su Vercel
   - Deploy

3. **Se scegli Aruba:**
   - Cambia password su webmail.aruba.it
   - Aggiorna `SMTP_PASS` su Vercel
   - Deploy

4. **Testa:**
   ```bash
   curl -X POST https://backoffice-sballando-next.vercel.app/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"tuaemail@example.com"}'
   ```

---

## 🆘 Se hai problemi

- **Resend Setup:** Vedi `RESEND_SETUP.md`
- **Aruba SMTP:** Contatta supporto Aruba
- **Vercel:** Controlla i log su Vercel Dashboard

---

**Status Attuale:** ✅ Codice pronto, build OK, in attesa di configurazione email provider
