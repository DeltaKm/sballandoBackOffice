import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function checkUserAuth() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Specifica un email: npx tsx scripts/check-user-auth.ts email@example.com');
      return;
    }

    console.log(`🔍 Cerco utente: ${email}\n`);

    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        password: true,
        created_at: true,
      }
    });

    if (!user) {
      console.log('❌ Utente non trovato!\n');
      return;
    }

    console.log('✅ Utente trovato:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name} ${user.surname || ''}`);
    console.log(`   Ruolo: ${user.role}`);
    console.log(`   Creato: ${user.created_at}`);
    console.log('');

    if (!user.password) {
      console.log('⚠️  PROBLEMA: Questo utente NON ha password!');
      console.log('   Probabilmente ha fatto login con Firebase/Google OAuth');
      console.log('');
      console.log('💡 SOLUZIONE:');
      console.log('   1. Crea una password per questo utente');
      console.log('   2. Oppure implementa login con Google OAuth');
      console.log('');
    } else {
      const pwd = user.password;
      console.log('✅ Password presente:');
      console.log(`   Lunghezza: ${pwd.length} caratteri`);
      console.log(`   Preview: ${pwd.substring(0, 20)}...`);
      
      if (pwd.startsWith('$2y$') || pwd.startsWith('$2a$') || pwd.startsWith('$2b$')) {
        console.log('   Tipo: BCRYPT ✓');
        console.log('');
        console.log('✅ Questo utente può fare login con email e password!');
      } else {
        console.log('   Tipo: SCONOSCIUTO ⚠️');
        console.log('');
        console.log('⚠️  La password potrebbe non essere compatibile con bcrypt');
      }
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserAuth();
