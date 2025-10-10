import crypto from 'crypto';

// Genera chiavi segrete sicure per JWT
const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log('\n🔐 Chiavi JWT Generate\n');
console.log('Aggiungi queste righe al tuo file .env:\n');
console.log('# JWT Authentication');
console.log(`JWT_SECRET="${jwtSecret}"`);
console.log(`JWT_REFRESH_SECRET="${jwtRefreshSecret}"`);
console.log('\n⚠️  IMPORTANTE: Non condividere mai queste chiavi!\n');
