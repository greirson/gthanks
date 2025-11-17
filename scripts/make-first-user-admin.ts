#!/usr/bin/env node
/**
 * One-time script to make the first user an admin
 * This is needed when auto-admin was added after users already existed
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function makeFirstUserAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...');

    // Check if any admins already exist
    const adminCount = await db.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      console.log('✅ Admin users already exist. No changes needed.');
      const admins = await db.user.findMany({
        where: { isAdmin: true },
        select: { email: true, name: true },
      });
      console.log('Current admins:', admins);
      return;
    }

    // Get the first user by creation date
    const firstUser = await db.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!firstUser) {
      console.log('📝 No users found in database.');
      return;
    }

    console.log(`\n👤 First user: ${firstUser.email || firstUser.name || firstUser.id}`);
    console.log(`   Created: ${firstUser.createdAt}`);

    // Make the first user an admin
    const updated = await db.user.update({
      where: { id: firstUser.id },
      data: {
        isAdmin: true,
        role: 'admin',
      },
    });

    console.log('\n✅ Successfully made first user an admin!');
    console.log(`   User: ${updated.email || updated.name || updated.id}`);
    console.log(`   Admin: ${updated.isAdmin}`);
    console.log(`   Role: ${updated.role}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
makeFirstUserAdmin();
