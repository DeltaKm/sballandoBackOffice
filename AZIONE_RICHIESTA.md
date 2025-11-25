# 🎯 AZIONE RICHIESTA - Problema Email Bloccata

## ⚠️ SITUAZIONE ATTUALE

**Aruba ha BLOCCATO l'account email** `info@sballando.it` con questo errore:

```
525 5.7.13 Invio temporaneamente disabilitato per la casella, 
modificare la password
```

**Il sistema di recupero password NON FUNZIONA su Vercel** finché non risolvi questo problema.

✅ **Locale**: Funziona perfettamente  
❌ **Produzione (Vercel)**: Email bloccate da Aruba

---

## 🚀 SOLUZIONI (Scegli una)

### **Soluzione A: Cambia Password Aruba** ⏱️ 5 minuti

**Quando sceglierla:**
- Vuoi una soluzione veloce
- Vuoi continuare a usare `info@sballando.it`
- Non hai bisogno di statistiche avanzate

**Passi:**

1. **Vai su https://webmail.aruba.it**
   - Login: `info@sballando.it`
   - Password: `Sballando@22!`

2. **Cambia la password**
   - Impostazioni → Sicurezza → Cambia Password
   - Scegli una password forte

3. **Aggiorna su Vercel**
   - Vai su: https://vercel.com/angelofriello/backoffice-sballando-next/settings/environment-variables
   - Trova: `SMTP_PASS`
   - Clicca: **Edit**
   - Inserisci: La nuova password
   - Salva

4. **Rideploya (automatico)** o fai un nuovo deploy

5. **Testa:**
   ```bash
   ./scripts/test-password-reset.sh
   ```

**⚠️ Rischio:** Aruba potrebbe ribloccarlo in futuro da Vercel.

---

### **Soluzione B: Passa a Resend (CONSIGLIATO)** ⏱️ 10 minuti

**Quando sceglierla:**
- Vuoi affidabilità al 100% su Vercel
- Vuoi statistiche e tracking
- 3000 email/mese gratis sono sufficienti
- Vuoi evitare futuri blocchi

**Passi:**

1. **Crea account Resend**
   - Vai su: https://resend.com
   - Clicca: **Sign Up** (con GitHub o email)

2. **Ottieni API Key**
   - Vai su: **API Keys** (sidebar)
   - Clicca: **Create API Key**
   - Nome: `Sballando Backoffice Production`
   - Permessi: **Sending access**
   - Clicca: **Add**
   - **COPIA LA CHIAVE** (inizia con `re_...`)
   - ⚠️ Salvala subito! Si vede solo una volta

3. **Configura Vercel**
   - Vai su: https://vercel.com/angelofriello/backoffice-sballando-next/settings/environment-variables
   
   **Aggiungi variabile #1:**
   - Nome: `EMAIL_SERVICE`
   - Valore: `resend`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Salva
   
   **Aggiungi variabile #2:**
   - Nome: `RESEND_API_KEY`
   - Valore: `re_tuachiavequi` (quella copiata)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Salva

4. **Deploy**
   ```bash
   git add .
   git commit -m "fix: configurato Resend per email"
   git push
   ```

5. **Testa**
   ```bash
   ./scripts/test-password-reset.sh
   ```

6. **(Opzionale) Configura dominio personalizzato**
   
   Se vuoi inviare da `noreply@sballando.it` invece di `onboarding@resend.dev`:
   
   - Vai su Resend → **Domains** → **Add Domain**
   - Inserisci: `sballando.it`
   - Copia i record DNS (SPF, DKIM, DMARC)
   - Aggiungili al pannello DNS di Aruba
   - Aspetta verifica (5-30 minuti)

**✅ Vantaggi:**
- ✅ 3000 email/mese GRATIS
- ✅ Nessun blocco o problema su Vercel
- ✅ Statistiche dettagliate su https://resend.com/emails
- ✅ IP reputati (meno spam)
- ✅ API veloce e affidabile

**Guida completa:** Vedi `RESEND_SETUP.md`

---

## 📊 CONFRONTO

| | **Aruba SMTP** | **Resend** |
|---|---|---|
| **Costo** | Incluso | 3000/mese gratis |
| **Affidabilità Vercel** | ⚠️ Problemi | ✅ Perfetta |
| **Setup** | 5 min | 10 min |
| **Rischio blocchi** | ⚠️ Alto | ✅ Nessuno |
| **Statistiche** | ❌ No | ✅ Sì |
| **Email da** | `info@sballando.it` | `onboarding@resend.dev`* |

\* Puoi configurare il dominio per usare `noreply@sballando.it`

---

## 🧪 COME TESTARE

Dopo aver scelto e configurato una soluzione, testa:

```bash
# Script interattivo
./scripts/test-password-reset.sh

# Oppure manualmente
curl -X POST https://backoffice-sballando-next.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"tuaemail@example.com"}'
```

**Risultato atteso:**
```json
{
  "message": "Se l'email esiste, riceverai un link per reimpostare la password"
}
```

**Controlla:**
- 📧 La tua casella email (anche spam)
- 📊 Se usi Resend: https://resend.com/emails
- 🔍 Log Vercel: https://vercel.com/angelofriello/backoffice-sballando-next/logs

---

## 📦 COSA HO GIÀ PREPARATO

✅ **Codice aggiornato** (`src/lib/emailService.ts`)
- Supporta sia SMTP che Resend
- Switch automatico con `EMAIL_SERVICE`

✅ **Documentazione completa**
- `EMAIL_ISSUE_SOLUTION.md` - Questo documento
- `RESEND_SETUP.md` - Guida dettagliata Resend

✅ **Script di test**
- `scripts/test-password-reset.sh` - Test automatico

✅ **Pacchetto installato**
- `resend` già in `package.json`

✅ **Build verificato**
- `npm run build` → ✅ SUCCESS

---

## 🎯 PROSSIMO PASSO

**DEVI SCEGLIERE:**

### 👉 Vuoi la soluzione veloce?
→ **Soluzione A**: Cambia password Aruba (5 minuti)

### 👉 Vuoi la soluzione affidabile?
→ **Soluzione B**: Passa a Resend (10 minuti, consigliato)

---

## 🆘 AIUTO

**Se qualcosa non funziona:**

1. **Controlla i log Vercel:**
   - https://vercel.com/angelofriello/backoffice-sballando-next/logs

2. **Verifica le variabili:**
   ```bash
   curl https://backoffice-sballando-next.vercel.app/api/health | jq '.'
   ```

3. **Leggi la documentazione:**
   - Resend: https://resend.com/docs
   - Aruba: https://www.aruba.it/assistenza

4. **Supporto Resend:**
   - Email: support@resend.com
   - Status: https://resend.com/status

---

**Fatto!** 🎉  
Scegli una soluzione e segui i passi. Il sistema di recupero password tornerà a funzionare!
