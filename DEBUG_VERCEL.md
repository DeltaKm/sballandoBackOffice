# 🐛 Debug Vercel 405 Error

## Problema
`POST /api/login` restituisce **405 Method Not Allowed** su Vercel

## Causa Probabile
La route API non viene esportata correttamente durante il build.

## ✅ Checklist Debug

### 1. Verifica Variabili d'Ambiente su Vercel

Vai su: **Vercel Dashboard** → Progetto → **Settings** → **Environment Variables**

Devono esserci:
- ✅ `JWT_SECRET` = (la tua chiave)
- ✅ `JWT_REFRESH_SECRET` = (la tua chiave)
- ✅ `DATABASE_URL` = (il tuo database)

**IMPORTANTE**: Seleziona tutti gli ambienti:
- ✅ Production
- ✅ Preview  
- ✅ Development

### 2. Controlla i Log del Build

1. Vai su **Deployments**
2. Clicca sull'ultimo deployment
3. Vai su **Build Logs**
4. Cerca errori tipo:
   - `JWT_SECRET and JWT_REFRESH_SECRET must be defined`
   - Errori in `src/lib/auth.ts`
   - Errori in `src/app/api/login/route.ts`

### 3. Controlla Function Logs

1. Vai su **Deployments**
2. Clicca sull'ultimo deployment
3. Vai su **Function Logs**
4. Prova a fare login
5. Guarda se appare qualche errore

### 4. Verifica la Route API

Controlla che il file esista:
```
src/app/api/login/route.ts
```

E che esporti la funzione POST:
```typescript
export async function POST(req: NextRequest) { ... }
```

## 🔧 Soluzioni

### Soluzione 1: Redeploy Forzato

Dopo aver aggiunto le variabili d'ambiente:

1. Vai su **Deployments**
2. Clicca sui 3 puntini dell'ultimo deployment
3. Clicca **Redeploy**
4. Seleziona **Use existing Build Cache** = NO

### Soluzione 2: Verifica Build Locale

Testa il build in locale:

```bash
npm run build
npm run start
```

Se funziona in locale ma non su Vercel, è un problema di env vars.

### Soluzione 3: Aggiungi Logging

Aggiungi console.log in `src/app/api/login/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  console.log('🔵 Login API called');
  try {
    // ... resto del codice
  } catch (err) {
    console.error('🔴 Login error:', err);
    // ...
  }
}
```

Poi guarda i Function Logs su Vercel.

## 🚨 Errore Comune

Se vedi questo errore nei log:
```
Error: JWT_SECRET and JWT_REFRESH_SECRET must be defined in environment variables
```

Significa che le variabili d'ambiente NON sono configurate su Vercel.

## 📝 Note

- Il file `.env` locale NON viene caricato su Vercel
- Le variabili vanno configurate manualmente nel dashboard
- Dopo aver aggiunto variabili, DEVI fare redeploy
- Il 405 significa che la route non esiste o non è stata esportata

---

**Se continua a non funzionare, mandami gli screenshot dei Build Logs!**
