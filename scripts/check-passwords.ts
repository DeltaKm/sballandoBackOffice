import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica .env dalla root del progetto
dotenv.config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    console.log('🔍 Controllo password nel database...\n');

    // Prendi alcuni utenti con password
    const usersWithPassword = await prisma.users.findMany({
      where: {
        password: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      },
      take: 5
    });

    console.log(`📊 Trovati ${usersWithPassword.length} utenti con password\n`);

    usersWithPassword.forEach((user, index) => {
      const pwd = user.password || '';
      const length = pwd.length;
      const preview = pwd.substring(0, 20);
      
      // Identifica il tipo di hash
      let hashType = 'UNKNOWN';
      if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$')) {
        hashType = 'BCRYPT';
      } else if (pwd.startsWith('$argon2')) {
        hashType = 'ARGON2';
      } else if (length === 32) {
        hashType = 'MD5 (possibile)';
      } else if (length === 40) {
        hashType = 'SHA1 (possibile)';
      } else if (length === 64) {
        hashType = 'SHA256 (possibile)';
      } else if (!pwd.includes('$') && length < 20) {
        hashType = '⚠️  PLAIN TEXT (NON SICURO!)';
      }

      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password Length: ${length}`);
      console.log(`   Preview: ${preview}...`);
      console.log(`   Hash Type: ${hashType}`);
      console.log('');
    });

    // Conta totale utenti
    const totalUsers = await prisma.users.count();
    const usersWithPwd = await prisma.users.count({
      where: { password: { not: null } }
    });
    const usersWithoutPwd = totalUsers - usersWithPwd;

    console.log('📈 Statistiche:');
    console.log(`   Totale utenti: ${totalUsers}`);
    console.log(`   Con password: ${usersWithPwd}`);
    console.log(`   Senza password: ${usersWithoutPwd}`);

  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
