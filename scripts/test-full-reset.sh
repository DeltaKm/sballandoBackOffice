#!/bin/bash

# 🧪 Script per testare il reset password COMPLETO (forgot + reset)

echo "🧪 Test Completo Reset Password"
echo "=================================="
echo ""

# 1. Richiedi reset password
read -p "📧 Inserisci l'email per cui richiedere il reset: " EMAIL

echo ""
echo "📤 Fase 1: Richiesta reset password..."
FORGOT_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")

echo "Risposta: $FORGOT_RESPONSE"
echo ""

# Controlla se ci sono errori
if echo "$FORGOT_RESPONSE" | grep -q "error"; then
  echo "❌ Errore nella richiesta di reset!"
  exit 1
fi

echo "✅ Email di reset inviata (controlla la tua casella email)"
echo ""
echo "📧 Controlla l'email e copia il TOKEN dall'URL"
echo "   L'URL sarà tipo: http://localhost:3002/reset-password/TOKEN_QUI"
echo ""

read -p "🔑 Incolla il TOKEN dalla email: " TOKEN

if [ -z "$TOKEN" ]; then
  echo "❌ Token vuoto!"
  exit 1
fi

echo ""
read -p "🔐 Inserisci la nuova password (min 8 caratteri): " NEW_PASSWORD

if [ ${#NEW_PASSWORD} -lt 8 ]; then
  echo "❌ Password troppo corta! Deve essere di almeno 8 caratteri"
  exit 1
fi

echo ""
echo "📤 Fase 2: Reset password..."
RESET_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3002/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"password\":\"$NEW_PASSWORD\"}")

# Separa il body dalla status
HTTP_BODY=$(echo "$RESET_RESPONSE" | sed -e 's/HTTP_STATUS:.*//')
HTTP_STATUS=$(echo "$RESET_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status HTTP: $HTTP_STATUS"
echo "Risposta:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ SUCCESS! Password reimpostata con successo!"
  echo ""
  echo "🔐 Ora prova a fare login con:"
  echo "   Email: $EMAIL"
  echo "   Password: $NEW_PASSWORD"
else
  echo "❌ ERRORE! Status: $HTTP_STATUS"
  echo ""
  echo "💡 Possibili cause:"
  echo "   - Token scaduto (valido solo 1 ora)"
  echo "   - Token già usato"
  echo "   - Token non valido"
  echo "   - Errore nel database"
  echo ""
  echo "🔍 Controlla i log del server per dettagli"
fi
