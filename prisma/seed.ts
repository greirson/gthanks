import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Email templates removed in MVP simplification
// Templates are now handled with simple HTML strings in lib/email.ts

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🌱 Starting database seeding...');

  // Get or create admin user
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  });

  if (!adminUser) {
    // eslint-disable-next-line no-console
    console.log('Creating system admin user for seeding...');
    adminUser = await prisma.user.create({
      data: {
        email: 'system@gthanks.local',
        name: 'System Admin',
        isAdmin: true,
        role: 'admin',
      },
    });
    // eslint-disable-next-line no-console
    console.log('✅ Created system admin user');
  } else {
    // eslint-disable-next-line no-console
    console.log('✓ Admin user already exists');
  }

  // eslint-disable-next-line no-console
  console.log('🎉 Database seeding completed successfully!');
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
