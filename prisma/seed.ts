// seed.ts - Database seeding for development and testing
// Creates 4 test users with realistic data for streamlined development

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

// Parse command-line arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

// Test user emails
const TEST_EMAILS = ['1@example.com', '2@example.com', '3@example.com', '4@example.com'];

async function cleanTestData() {
  console.log('🧹 Cleaning existing test data...');

  // Delete test users and all related data (cascade delete handles relationships)
  const deleted = await prisma.user.deleteMany({
    where: {
      email: {
        in: TEST_EMAILS,
      },
    },
  });

  console.log(`   Deleted ${deleted.count} test users and related data`);
}

async function createUserWithEmail(userData: {
  email: string;
  name: string;
  isAdmin?: boolean;
  role?: string;
  username?: string;
}) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    console.log(`   ✓ User ${userData.email} already exists`);
    return existingUser;
  }

  // Create user with verified email to skip verification flow
  const user = await prisma.user.create({
    data: {
      id: createId(),
      email: userData.email,
      name: userData.name,
      isAdmin: userData.isAdmin || false,
      role: userData.role || 'user',
      username: userData.username,
      emailVerified: new Date(),
      isOnboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create UserEmail record (required for authentication)
  await prisma.userEmail.upsert({
    where: { email: userData.email },
    update: {},
    create: {
      id: createId(),
      userId: user.id,
      email: userData.email,
      isPrimary: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log(`   ✅ Created user: ${userData.email} (${userData.name})`);
  return user;
}

async function seed() {
  console.log('🌱 Starting database seeding...');

  if (shouldClean) {
    await cleanTestData();
  }

  // Create system admin if not exists
  let adminUser = await prisma.user.findFirst({
    where: { isAdmin: true },
  });

  if (!adminUser) {
    console.log('Creating system admin user...');
    adminUser = await prisma.user.create({
      data: {
        id: createId(),
        email: 'system@gthanks.local',
        name: 'System Admin',
        isAdmin: true,
        role: 'admin',
        emailVerified: new Date(),
        isOnboardingComplete: true,
      },
    });
    console.log('✅ Created system admin user');
  } else {
    console.log('✓ System admin already exists');
  }

  console.log('\n📊 Creating test users...');

  // Create 4 test users
  const user1 = await createUserWithEmail({
    email: '1@example.com',
    name: 'Alex Owner',
    username: 'alexowner',
  });

  const user2 = await createUserWithEmail({
    email: '2@example.com',
    name: 'Bailey Member',
    username: 'baileymember',
  });

  const user3 = await createUserWithEmail({
    email: '3@example.com',
    name: 'Casey Collaborator',
    username: 'caseycollab',
  });

  // User 4 is an admin - no wishes/lists/groups needed
  await createUserWithEmail({
    email: '4@example.com',
    name: 'Admin User',
    isAdmin: true,
    role: 'admin',
    username: 'adminuser',
  });

  console.log('\n🎁 Creating wishes...');

  // Create wishes for User 1
  const wish1_1 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-1-1',
    },
    update: {},
    create: {
      id: 'seed-wish-1-1',
      ownerId: user1.id,
      title: 'Wireless Headphones',
      url: 'https://example.com/headphones',
      price: 149.99,
      currency: 'USD',
      wishLevel: 3,
      notes: 'Noise cancelling preferred',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const wish1_2 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-1-2',
    },
    update: {},
    create: {
      id: 'seed-wish-1-2',
      ownerId: user1.id,
      title: 'Coffee Maker',
      url: 'https://example.com/coffee',
      price: 89.99,
      currency: 'USD',
      wishLevel: 2,
      notes: 'Programmable with timer',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const wish1_3 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-1-3',
    },
    update: {},
    create: {
      id: 'seed-wish-1-3',
      ownerId: user1.id,
      title: 'Book Collection',
      price: 45.0,
      currency: 'USD',
      wishLevel: 1,
      notes: 'Any sci-fi or fantasy novels',
      quantity: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const wish1_4 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-1-4',
    },
    update: {},
    create: {
      id: 'seed-wish-1-4',
      ownerId: user1.id,
      title: 'Winter Jacket',
      url: 'https://example.com/jacket',
      price: 199.99,
      currency: 'USD',
      wishLevel: 3,
      notes: 'Size Medium, waterproof',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user1.name}'s wishes`);

  // Create wishes for User 2
  const wish2_1 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-2-1',
    },
    update: {},
    create: {
      id: 'seed-wish-2-1',
      ownerId: user2.id,
      title: 'Gaming Mouse',
      url: 'https://example.com/mouse',
      price: 59.99,
      currency: 'USD',
      wishLevel: 2,
      notes: 'RGB lighting would be cool',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const wish2_2 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-2-2',
    },
    update: {},
    create: {
      id: 'seed-wish-2-2',
      ownerId: user2.id,
      title: 'Desk Organizer',
      price: 29.99,
      currency: 'USD',
      wishLevel: 1,
      notes: 'For home office',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user2.name}'s wishes`);

  // Create wishes for User 3
  const wish3_1 = await prisma.wish.upsert({
    where: {
      id: 'seed-wish-3-1',
    },
    update: {},
    create: {
      id: 'seed-wish-3-1',
      ownerId: user3.id,
      title: 'Smart Watch',
      url: 'https://example.com/smartwatch',
      price: 299.99,
      currency: 'USD',
      wishLevel: 3,
      notes: 'Fitness tracking features',
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user3.name}'s wishes`);

  console.log('\n📋 Creating lists...');

  // Create lists for User 1
  const list1_1 = await prisma.list.upsert({
    where: {
      id: 'seed-list-1-1',
    },
    update: {},
    create: {
      id: 'seed-list-1-1',
      ownerId: user1.id,
      name: 'Birthday Wishlist',
      description: "Things I'd love for my birthday",
      visibility: 'private',
      shareToken: createId(),
      slug: 'birthday',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const list1_2 = await prisma.list.upsert({
    where: {
      id: 'seed-list-1-2',
    },
    update: {},
    create: {
      id: 'seed-list-1-2',
      ownerId: user1.id,
      name: 'Holiday Gifts',
      description: 'Holiday season wishlist',
      visibility: 'private',
      shareToken: createId(),
      slug: 'holiday',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user1.name}'s lists`);

  // Create list for User 2
  const list2_1 = await prisma.list.upsert({
    where: {
      id: 'seed-list-2-1',
    },
    update: {},
    create: {
      id: 'seed-list-2-1',
      ownerId: user2.id,
      name: 'My Wishlist',
      description: 'Things I want',
      visibility: 'private',
      shareToken: createId(),
      slug: 'mywishlist',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user2.name}'s lists`);

  // Create list for User 3
  const list3_1 = await prisma.list.upsert({
    where: {
      id: 'seed-list-3-1',
    },
    update: {},
    create: {
      id: 'seed-list-3-1',
      ownerId: user3.id,
      name: 'Wish Ideas',
      description: 'My current wish ideas',
      visibility: 'public',
      shareToken: createId(),
      slug: 'ideas',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`   ✅ Created ${user3.name}'s lists`);

  console.log('\n🔗 Adding wishes to lists...');

  // Add wishes to lists (User 1)
  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list1_1.id,
        wishId: wish1_1.id,
      },
    },
    update: {},
    create: {
      listId: list1_1.id,
      wishId: wish1_1.id,
      wishLevel: 3,
      addedAt: new Date(),
    },
  });

  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list1_1.id,
        wishId: wish1_2.id,
      },
    },
    update: {},
    create: {
      listId: list1_1.id,
      wishId: wish1_2.id,
      wishLevel: 2,
      addedAt: new Date(),
    },
  });

  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list1_1.id,
        wishId: wish1_3.id,
      },
    },
    update: {},
    create: {
      listId: list1_1.id,
      wishId: wish1_3.id,
      wishLevel: 1,
      addedAt: new Date(),
    },
  });

  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list1_2.id,
        wishId: wish1_4.id,
      },
    },
    update: {},
    create: {
      listId: list1_2.id,
      wishId: wish1_4.id,
      wishLevel: 3,
      addedAt: new Date(),
    },
  });

  console.log(`   ✅ Added wishes to ${user1.name}'s lists`);

  // Add wishes to User 2's list
  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list2_1.id,
        wishId: wish2_1.id,
      },
    },
    update: {},
    create: {
      listId: list2_1.id,
      wishId: wish2_1.id,
      wishLevel: 2,
      addedAt: new Date(),
    },
  });

  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list2_1.id,
        wishId: wish2_2.id,
      },
    },
    update: {},
    create: {
      listId: list2_1.id,
      wishId: wish2_2.id,
      wishLevel: 1,
      addedAt: new Date(),
    },
  });

  console.log(`   ✅ Added wishes to ${user2.name}'s lists`);

  // Add wish to User 3's list
  await prisma.listWish.upsert({
    where: {
      listId_wishId: {
        listId: list3_1.id,
        wishId: wish3_1.id,
      },
    },
    update: {},
    create: {
      listId: list3_1.id,
      wishId: wish3_1.id,
      wishLevel: 3,
      addedAt: new Date(),
    },
  });

  console.log(`   ✅ Added wishes to ${user3.name}'s lists`);

  console.log('\n👥 Creating groups...');

  // Create Family group
  const familyGroup = await prisma.group.upsert({
    where: {
      id: 'seed-group-family',
    },
    update: {},
    create: {
      id: 'seed-group-family',
      name: 'Family',
      description: 'Close family members',
      visibility: 'private',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('   ✅ Created Family group');

  // Add users to group
  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user1.id,
        groupId: familyGroup.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      groupId: familyGroup.id,
      role: 'admin',
      joinedAt: new Date(),
    },
  });

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user2.id,
        groupId: familyGroup.id,
      },
    },
    update: {},
    create: {
      userId: user2.id,
      groupId: familyGroup.id,
      role: 'member',
      joinedAt: new Date(),
    },
  });

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user3.id,
        groupId: familyGroup.id,
      },
    },
    update: {},
    create: {
      userId: user3.id,
      groupId: familyGroup.id,
      role: 'member',
      joinedAt: new Date(),
    },
  });

  console.log('   ✅ Added users to Family group');

  // Share User 1's Birthday list with Family group
  await prisma.listGroup.upsert({
    where: {
      listId_groupId: {
        listId: list1_1.id,
        groupId: familyGroup.id,
      },
    },
    update: {},
    create: {
      listId: list1_1.id,
      groupId: familyGroup.id,
      sharedBy: user1.id,
      sharedAt: new Date(),
    },
  });

  console.log('   ✅ Shared Birthday Wishlist with Family group');

  // Make User 3 a co-admin of User 1's Birthday list
  await prisma.listAdmin.upsert({
    where: {
      listId_userId: {
        listId: list1_1.id,
        userId: user3.id,
      },
    },
    update: {},
    create: {
      listId: list1_1.id,
      userId: user3.id,
      addedBy: user1.id,
      addedAt: new Date(),
    },
  });

  console.log(`   ✅ Made ${user3.name} co-admin of Birthday Wishlist`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Test User Credentials:');
  console.log('   • 1@example.com - Alex Owner (has lists, wishes, owns Family group)');
  console.log('   • 2@example.com - Bailey Member (member of Family group)');
  console.log('   • 3@example.com - Casey Collaborator (co-admin on Birthday list)');
  console.log('   • 4@example.com - Admin User (system admin)');
  console.log('\n💡 Use magic link authentication to login as any user');
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
