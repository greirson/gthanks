import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Creating test data for filter testing...');

  try {
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@example.com' },
    });

    if (!testUser) {
      console.log('Creating test user...');
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: new Date(),
          role: 'user',
        },
      });
      console.log('✅ Created test user: test@example.com');
    } else {
      console.log('✓ Test user already exists');
    }

    // Clear existing wishes for clean testing
    await prisma.wish.deleteMany({
      where: { ownerId: testUser.id },
    });
    console.log('✓ Cleared existing test wishes');

    // Create wishes with various priorities and prices for testing filters
    const testWishes = [
      // High priority (5 stars) wishes
      { title: 'Gaming Laptop', price: 1500, wishLevel: 5, url: 'https://example.com/laptop' },
      {
        title: 'Mechanical Keyboard',
        price: 150,
        wishLevel: 5,
        url: 'https://example.com/keyboard',
      },
      { title: 'Premium Headphones', price: 350, wishLevel: 5, url: null },

      // High priority (4 stars) wishes
      { title: 'Smartwatch', price: 400, wishLevel: 4, url: 'https://example.com/watch' },
      { title: 'Wireless Mouse', price: 80, wishLevel: 4, url: null },
      { title: 'USB-C Hub', price: 45, wishLevel: 4, url: null },

      // Medium priority (3 stars) wishes
      { title: 'Book: Clean Code', price: 40, wishLevel: 3, url: 'https://example.com/book1' },
      { title: 'Coffee Maker', price: 120, wishLevel: 3, url: null },
      { title: 'Desk Plant', price: 25, wishLevel: 3, url: null },

      // Medium priority (2 stars) wishes
      { title: 'Phone Case', price: 20, wishLevel: 2, url: null },
      { title: 'Desk Organizer', price: 35, wishLevel: 2, url: 'https://example.com/organizer' },
      { title: 'Monitor Stand', price: 60, wishLevel: 2, url: null },

      // Low priority (1 star) wishes
      { title: 'Stickers Pack', price: 10, wishLevel: 1, url: null },
      { title: 'Cable Management', price: 15, wishLevel: 1, url: null },
      { title: 'Mouse Pad', price: 18, wishLevel: 1, url: 'https://example.com/mousepad' },

      // Some wishes without prices for edge cases
      { title: 'Concert Tickets', price: null, wishLevel: 5, url: 'https://example.com/tickets' },
      { title: 'Gift Card', price: null, wishLevel: 3, url: null },
      { title: 'Surprise Gift', price: 0, wishLevel: 2, url: null },

      // Some wishes with minimum priority (1 star)
      { title: 'Undecided Item 1', price: 50, wishLevel: 1, url: null },
      { title: 'Undecided Item 2', price: 75, wishLevel: 1, url: null },
    ];

    console.log('Creating test wishes...');
    for (const wish of testWishes) {
      await prisma.wish.create({
        data: {
          ...wish,
          ownerId: testUser.id,
          notes: wish.price ? `Estimated cost: $${wish.price}` : 'Price to be determined',
          imageStatus: 'COMPLETED',
          quantity: 1,
        },
      });
    }
    console.log(`✅ Created ${testWishes.length} test wishes with various priorities and prices`);

    // Create a test list
    const testList = await prisma.list.upsert({
      where: {
        id: 'test-list-001',
      },
      update: {},
      create: {
        id: 'test-list-001',
        name: 'Test Wishlist',
        description: 'A test list for E2E testing',
        visibility: 'public',
        ownerId: testUser.id,
        admins: {
          create: {
            userId: testUser.id,
            addedBy: testUser.id,
          },
        },
      },
    });
    console.log('✅ Created test list');

    // Add some wishes to the list
    const wishes = await prisma.wish.findMany({
      where: { ownerId: testUser.id },
      take: 10,
    });

    for (const wish of wishes) {
      await prisma.listWish.upsert({
        where: {
          listId_wishId: {
            listId: testList.id,
            wishId: wish.id,
          },
        },
        update: {},
        create: {
          listId: testList.id,
          wishId: wish.id,
        },
      });
    }
    console.log('✅ Added wishes to test list');

    console.log('\n🎉 Test data seeding completed successfully!');
    console.log('\n📝 Test User:');
    console.log('   Email: test@example.com');
    console.log('\n📊 Test Data Summary:');
    console.log(`   - ${testWishes.length} wishes total`);
    console.log(`   - Priorities: 1-5 stars (all wishes have priority levels)`);
    console.log(`   - Price ranges from $10 to $1500`);
    console.log(`   - Some wishes without prices for edge case testing`);
    console.log('\n🔍 You can now test the filters with this data!');
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

seedTestData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
