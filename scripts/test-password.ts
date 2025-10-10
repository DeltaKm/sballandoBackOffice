import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function testPassword() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
      console.log('❌ Uso: npx tsx scripts/test-password.ts email@example.com "password"');
      return;
    }

    console.log(`🔍 Test login per: ${email}\n`);

    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      }
    });

    if (!user) {
      console.log('❌ Utente non trovato!\n');
      return;
    }

    console.log('✅ Utente trovato');
    
    if (!user.password) {
      console.log('❌ Utente senza password (probabilmente OAuth)\n');
      return;
    }

    console.log(`📝 Hash nel DB: ${user.password.substring(0, 30)}...`);
    console.log(`🔑 Password da testare: ${password}`);
    console.log('');
    console.log('🔄 Verifico password con bcrypt...\n');

    // Test con bcrypt
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log('✅ ✅ ✅ PASSWORD CORRETTA! ✅ ✅ ✅');
      console.log('');
      console.log('Il login dovrebbe funzionare!');
    } else {
      console.log('❌ ❌ ❌ PASSWORD ERRATA! ❌ ❌ ❌');
      console.log('');
      console.log('La password che hai inserito non corrisponde.');
      console.log('');
      console.log('💡 Possibili cause:');
      console.log('   1. Password sbagliata');
      console.log('   2. Hash non compatibile con bcrypt');
      console.log('   3. Encoding diverso');
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
