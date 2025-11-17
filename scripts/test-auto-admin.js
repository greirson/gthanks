// Test script to verify auto-admin functionality
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAutoAdmin() {
  try {
    console.log('🔍 Testing auto-admin functionality...\n');

    // Check current admin count
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    console.log(`✅ Current admin users in system: ${adminCount}`);

    // Check total user count
    const totalUsers = await prisma.user.count();
    console.log(`✅ Total users in system: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('\n📝 No users exist yet.');
      console.log('   The first user to sign up will automatically become an admin.');
      console.log('   No admin-setup page needed!\n');
    } else if (adminCount === 0) {
      console.log('\n⚠️  Users exist but no admins.');
      console.log("   This shouldn't happen with auto-admin enabled.");
      console.log('   The first user should have been made admin automatically.\n');
    } else {
      console.log('\n✨ System has admin users configured.');
      console.log('   Auto-admin setup is working correctly!\n');

      // Show first admin details
      const firstAdmin = await prisma.user.findFirst({
        where: { isAdmin: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isAdmin: true,
          createdAt: true,
        },
      });

      if (firstAdmin) {
        console.log('First admin user:');
        console.log(`  Email: ${firstAdmin.email}`);
        console.log(`  Name: ${firstAdmin.name || '(not set)'}`);
        console.log(`  Role: ${firstAdmin.role}`);
        console.log(`  Created: ${firstAdmin.createdAt.toISOString()}`);
      }
    }

    console.log('\n🎉 Auto-admin test complete!');
  } catch (error) {
    console.error('❌ Error testing auto-admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoAdmin();
