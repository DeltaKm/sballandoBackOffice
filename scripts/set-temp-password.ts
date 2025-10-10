import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function setTempPassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email || !newPassword) {
      console.log('❌ Uso: npx tsx scripts/set-temp-password.ts email@example.com "nuova_password"');
      return;
    }

    console.log(`🔍 Cerco utente: ${email}\n`);

    const user = await prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.log('❌ Utente non trovato!\n');
      return;
    }

    console.log('✅ Utente trovato');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nome: ${user.name}`);
    console.log('');
    console.log('🔄 Genero hash bcrypt...');

    // Genera hash con bcrypt (cost 12, come nel DB)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    console.log(`✅ Hash generato: ${hashedPassword.substring(0, 30)}...`);
    console.log('');
    console.log('💾 Aggiorno password nel database...');

    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('');
    console.log('✅ ✅ ✅ PASSWORD AGGIORNATA! ✅ ✅ ✅');
    console.log('');
    console.log('📝 Credenziali di login:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('');
    console.log('🚀 Ora puoi fare login con queste credenziali!');

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setTempPassword();
