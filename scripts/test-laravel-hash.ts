import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

// Simula Laravel Hash::check() con diverse varianti
async function testLaravelVariants(password: string, hash: string) {
  console.log('🧪 TEST 1: Bcrypt standard (Node.js)');
  try {
    const result = await bcrypt.compare(password, hash);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  console.log('\n🧪 TEST 2: Bcrypt con $2y$ convertito a $2a$');
  try {
    // Laravel usa $2y$, Node.js bcrypt preferisce $2a$
    const hash2a = hash.replace('$2y$', '$2a$');
    const result = await bcrypt.compare(password, hash2a);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  console.log('\n🧪 TEST 3: Bcrypt con $2y$ convertito a $2b$');
  try {
    const hash2b = hash.replace('$2y$', '$2b$');
    const result = await bcrypt.compare(password, hash2b);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  console.log('\n🧪 TEST 4: Password con trim()');
  try {
    const result = await bcrypt.compare(password.trim(), hash);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  console.log('\n🧪 TEST 5: Password lowercase');
  try {
    const result = await bcrypt.compare(password.toLowerCase(), hash);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  console.log('\n🧪 TEST 6: Password uppercase');
  try {
    const result = await bcrypt.compare(password.toUpperCase(), hash);
    console.log(`   Risultato: ${result ? '✅ MATCH!' : '❌ No match'}`);
    if (result) return true;
  } catch (e) {
    console.log(`   Errore: ${e}`);
  }

  return false;
}

async function testLaravelHash() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
      console.log('❌ Uso: npx tsx scripts/test-laravel-hash.ts email@example.com "password"');
      return;
    }

    console.log(`🔍 Test Laravel Hash per: ${email}`);
    console.log(`🔑 Password: ${password}\n`);

    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      }
    });

    if (!user || !user.password) {
      console.log('❌ Utente non trovato o senza password\n');
      return;
    }

    console.log('✅ Utente trovato');
    console.log(`📝 Hash: ${user.password}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const matched = await testLaravelVariants(password, user.password);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (matched) {
      console.log('🎉 🎉 🎉 PASSWORD TROVATA! 🎉 🎉 🎉\n');
      console.log('La password corrisponde con uno dei metodi testati.');
    } else {
      console.log('❌ NESSUNA CORRISPONDENZA TROVATA\n');
      console.log('💡 Possibili cause:');
      console.log('   1. Password errata');
      console.log('   2. Hash creato con algoritmo custom');
      console.log('   3. Hash creato con Firebase/OAuth');
      console.log('   4. Password con encoding speciale');
      console.log('\n📝 SUGGERIMENTI:');
      console.log('   - Verifica il codice Laravel in app/Http/Controllers/Auth');
      console.log('   - Cerca Hash::make() o Hash::check()');
      console.log('   - Controlla config/hashing.php');
      console.log('   - Verifica se usa Firebase Authentication');
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLaravelHash();
