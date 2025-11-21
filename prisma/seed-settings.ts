/**
 * Seed script for SiteSettings singleton
 * Ensures the global settings record exists
 *
 * Run with: node prisma/seed-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSettings() {
  console.log('🌱 Seeding SiteSettings singleton...');

  try {
    // Upsert ensures singleton exists without duplication
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: {}, // Don't overwrite existing data
      create: {
        id: 'global',
        loginMessage: null, // Start with no message
      },
    });

    console.log('✅ SiteSettings singleton ready:', settings.id);
  } catch (error) {
    console.error('❌ Failed to seed SiteSettings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedSettings()
    .then(() => {
      console.log('✨ Seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedSettings };
