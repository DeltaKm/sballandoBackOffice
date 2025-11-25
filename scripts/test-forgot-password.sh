#!/bin/bash

# Script per testare l'invio email del recupero password

echo "🧪 Test recupero password"
echo "========================"
echo ""

# Testa con un'email (sostituisci con una email reale del tuo DB)
EMAIL="info@sballando.it"

echo "📧 Invio richiesta reset password per: $EMAIL"
echo ""

curl -X POST http://localhost:3002/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || cat

echo ""
echo "✅ Controlla i log del server per vedere i dettagli dell'invio email"
