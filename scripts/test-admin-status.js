const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
    },
  },
});

async function testAutoAdmin() {
  try {
    // Check if any users exist
    const userCount = await db.user.count();
    const adminCount = await db.user.count({ where: { isAdmin: true } });

    console.log('=== Auto-Admin Status Check ===');
    console.log('Total users:', userCount);
    console.log('Admin users:', adminCount);

    if (userCount > 0) {
      // Get the first user
      const firstUser = await db.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, isAdmin: true, role: true, createdAt: true },
      });

      console.log('\nFirst user details:');
      console.log('- Email:', firstUser.email || 'No email');
      console.log('- Is Admin:', firstUser.isAdmin);
      console.log('- Role:', firstUser.role);
      console.log('- Created:', firstUser.createdAt);

      if (firstUser.isAdmin) {
        console.log('\n✅ Auto-admin is working! First user is an admin.');
      } else if (adminCount > 0) {
        console.log('\n⚠️  First user is not admin, but other admins exist.');
      } else {
        console.log('\n❌ No admins found. Auto-admin may not be working.');
      }
    } else {
      console.log('\n📝 No users in database yet.');
      console.log('The first user to sign up will automatically become an admin.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

testAutoAdmin();
