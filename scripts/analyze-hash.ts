import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function analyzeHash() {
  try {
    const email = process.argv[2] || 'mikealdefrancesco@gmail.com';
    
    console.log(`🔍 Analizzo hash per: ${email}\n`);

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

    const hash = user.password;
    
    console.log('📊 ANALISI HASH:\n');
    console.log(`Hash completo: ${hash}`);
    console.log(`Lunghezza: ${hash.length} caratteri`);
    console.log('');
    
    // Analisi dettagliata
    console.log('🔬 DETTAGLI:\n');
    
    if (hash.startsWith('$2y$')) {
      const parts = hash.split('$');
      console.log('Tipo: BCRYPT (PHP variant)');
      console.log(`Algoritmo: ${parts[1]}`);
      console.log(`Cost: ${parts[2]}`);
      console.log(`Salt: ${parts[3]?.substring(0, 22)}`);
      console.log(`Hash: ${parts[3]?.substring(22)}`);
      console.log('');
      console.log('✅ Questo è bcrypt standard PHP');
      console.log('✅ Node.js bcrypt dovrebbe funzionare');
      console.log('');
      console.log('🤔 PROBLEMA POSSIBILE:');
      console.log('   Il backend PHP potrebbe usare un algoritmo DIVERSO da bcrypt');
      console.log('   anche se il formato sembra bcrypt.');
      console.log('');
      console.log('💡 VERIFICA:');
      console.log('   Controlla il codice Laravel/PHP che genera le password');
      console.log('   Cerca: Hash::make() o password_hash()');
    } else if (hash.startsWith('$argon2')) {
      console.log('Tipo: ARGON2');
      console.log('⚠️  Node.js bcrypt NON funziona con Argon2!');
    } else if (hash.length === 60 && hash.includes('$')) {
      console.log('Tipo: Probabilmente BCRYPT ma formato non standard');
    } else {
      console.log('Tipo: SCONOSCIUTO o CUSTOM');
      console.log('');
      console.log('Possibilità:');
      console.log('- Firebase Auth (non usa hash tradizionali)');
      console.log('- Custom hash del backend');
      console.log('- OAuth (Google, Facebook, etc.)');
    }

    console.log('');
    console.log('🔍 PROSSIMI PASSI:');
    console.log('1. Controlla il codice backend PHP/Laravel');
    console.log('2. Cerca come vengono create le password');
    console.log('3. Verifica se usa Firebase Authentication');

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeHash();
