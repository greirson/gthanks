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

      // Medium priority (3 stars) wishes
      { title: 'Book: Clean Code', price: 40, wishLevel: 3, url: 'https://example.com/book1' },
      { title: 'Coffee Maker', price: 120, wishLevel: 3, url: null },

      // Low priority wishes
      { title: 'Stickers Pack', price: 10, wishLevel: 1, url: null },
      { title: 'Mouse Pad', price: 18, wishLevel: 1, url: 'https://example.com/mousepad' },

      // Some wishes with minimum priority (1 star)
      { title: 'Undecided Item 1', price: 50, wishLevel: 1, url: null },
      { title: 'Undecided Item 2', price: 75, wishLevel: 1, url: null },
    ];

    console.log('Creating test wishes...');
    let created = 0;
    for (const wish of testWishes) {
      const existing = await prisma.wish.findFirst({
        where: {
          title: wish.title,
          ownerId: testUser.id,
        },
      });

      if (!existing) {
        await prisma.wish.create({
          data: {
            ...wish,
            ownerId: testUser.id,
            notes: wish.price ? `Estimated cost: $${wish.price}` : 'Price to be determined',
            imageStatus: 'COMPLETED',
            quantity: 1,
          },
        });
        created++;
      }
    }

    if (created > 0) {
      console.log(`✅ Created ${created} new test wishes`);
    } else {
      console.log('✓ Test wishes already exist');
    }

    const totalWishes = await prisma.wish.count({ where: { ownerId: testUser.id } });
    const minPriority = await prisma.wish.count({
      where: { ownerId: testUser.id, wishLevel: 1 },
    });
    const highPriority = await prisma.wish.count({
      where: { ownerId: testUser.id, wishLevel: { gte: 4 } },
    });

    console.log('\n🎉 Test data ready!');
    console.log('\n📝 Test User:');
    console.log('   Email: test@example.com');
    console.log('\n📊 Wishes Summary:');
    console.log(`   - Total wishes: ${totalWishes}`);
    console.log(`   - High priority (4-5 stars): ${highPriority}`);
    console.log(`   - Minimum priority (1 star): ${minPriority}`);
    console.log('\n🔍 All wishes now have priority levels (1-5 stars) as required by the schema!');
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
