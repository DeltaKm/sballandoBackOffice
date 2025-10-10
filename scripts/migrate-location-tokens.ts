/**
 * Migration script to add tokens to existing locations
 * This ensures backward compatibility for locations created before the token system
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function migrateLocationTokens() {
  console.log('🔄 Starting location token migration...');
  
  try {
    // Find all locations without tokens
    const locationsWithoutTokens = await prisma.locations.findMany({
      where: {
        OR: [
          { token: null },
          { token: '' }
        ]
      },
      select: {
        id: true,
        name: true,
        token: true
      }
    });

    console.log(`📍 Found ${locationsWithoutTokens.length} locations without tokens`);

    if (locationsWithoutTokens.length === 0) {
      console.log('✅ All locations already have tokens. Migration complete.');
      return;
    }

    // Generate tokens for each location
    const updates = [];
    for (const location of locationsWithoutTokens) {
      const token = crypto
        .createHash('md5')
        .update(`${location.id}_${Date.now()}_${Math.random()}`)
        .digest('hex');

      updates.push(
        prisma.locations.update({
          where: { id: location.id },
          data: { token }
        })
      );

      console.log(`📝 Generated token for location "${location.name}": ${token}`);
    }

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    console.log(`✅ Successfully updated ${locationsWithoutTokens.length} locations with tokens`);
    
    // Verify the migration
    const remainingWithoutTokens = await prisma.locations.count({
      where: {
        OR: [
          { token: null },
          { token: '' }
        ]
      }
    });

    if (remainingWithoutTokens === 0) {
      console.log('🎉 Migration completed successfully! All locations now have tokens.');
    } else {
      console.warn(`⚠️ ${remainingWithoutTokens} locations still missing tokens. Please check manually.`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateLocationTokens()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateLocationTokens };
