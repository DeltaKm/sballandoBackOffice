#!/bin/bash

# 🧪 Script di test per verificare l'invio email
# Usa questo per testare sia SMTP che Resend

echo "🧪 Test Invio Email Password Reset"
echo "=================================="
echo ""

# Leggi l'email di test
read -p "📧 Inserisci l'email di test (default: angelofriello01@gmail.com): " TEST_EMAIL
TEST_EMAIL=${TEST_EMAIL:-angelofriello01@gmail.com}

echo ""
echo "🚀 Invio richiesta a Vercel..."
echo ""

# Fai la richiesta
RESPONSE=$(curl -s -X POST https://backoffice-sballando-next.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

echo "📨 Risposta dal server:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Controlla se c'è un errore
if echo "$RESPONSE" | grep -q "error"; then
  echo "❌ ERRORE: L'invio è fallito!"
  echo ""
  echo "💡 Possibili cause:"
  echo "   1. Aruba SMTP ancora bloccato → Cambia password su webmail.aruba.it"
  echo "   2. EMAIL_SERVICE non configurato su Vercel → Vai su Vercel Dashboard"
  echo "   3. RESEND_API_KEY non configurata → Segui RESEND_SETUP.md"
  echo ""
  echo "🔍 Controlla i log su Vercel:"
  echo "   https://vercel.com/angelofriello/backoffice-sballando-next/logs"
  exit 1
else
  echo "✅ SUCCESS! Email inviata con successo!"
  echo ""
  echo "📬 Controlla la casella: $TEST_EMAIL"
  echo "   (inclusa la cartella spam)"
  echo ""
  echo "📧 Se usi Resend, vedi le statistiche su:"
  echo "   https://resend.com/emails"
  exit 0
fi
