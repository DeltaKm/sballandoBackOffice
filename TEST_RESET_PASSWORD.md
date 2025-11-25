# Test del Sistema di Reset Password

## Test locale

### 1. Testa richiesta password dimenticata
```bash
curl -X POST http://localhost:3002/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 2. Testa reset password (usa un token valido)
```bash
curl -X POST http://localhost:3002/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_QUI","password":"nuovapassword123"}'
```

## Test su Vercel

### 1. Testa richiesta password dimenticata
```bash
curl -X POST https://backoffice-sballando-next.vercel.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 2. Testa reset password
```bash
curl -X POST https://backoffice-sballando-next.vercel.app/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_QUI","password":"nuovapassword123"}'
```

## Verifiche da fare

1. ✅ Le variabili d'ambiente sono configurate su Vercel?
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_SECURE
   - SMTP_USER
   - SMTP_PASS
   - SMTP_FROM
   - SMTP_FROM_NAME
   - NEXT_PUBLIC_BASE_URL

2. ✅ Il campo reset_token_expiry esiste nel database?
   ```sql
   DESCRIBE users;
   ```

3. ✅ Verifica che il server MySQL sia raggiungibile da Vercel
