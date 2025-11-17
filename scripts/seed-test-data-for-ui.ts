#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data for UI testing...');

  // Clean up existing test data
  await prisma.reservation.deleteMany({});
  await prisma.listWish.deleteMany({});
  await prisma.userGroup.deleteMany({});
  await prisma.listGroup.deleteMany({});
  await prisma.listAdmin.deleteMany({});
  await prisma.groupInvitation.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.list.deleteMany({});
  await prisma.wish.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'uitest',
      },
    },
  });

  // Create test users
  const testUser = await prisma.user.create({
    data: {
      email: 'uitest@example.com',
      name: 'UI Test User',
      emailVerified: new Date(),
    },
  });

  const giftGiver = await prisma.user.create({
    data: {
      email: 'uitest-giver@example.com',
      name: 'Gift Giver',
      emailVerified: new Date(),
    },
  });

  // Create a birthday list
  const birthdayList = await prisma.list.create({
    data: {
      name: 'Birthday Wishlist',
      description: 'My birthday wishes',
      owner: {
        connect: { id: testUser.id },
      },
      visibility: 'public',
    },
  });

  // Create wishes with various priorities and prices for testing filters
  const wishes = [
    // High priority items (5 stars)
    { title: 'Gaming Console', url: 'https://example.com/console', wishLevel: 5, price: 499.99 },
    {
      title: 'Wireless Headphones',
      url: 'https://example.com/headphones',
      wishLevel: 5,
      price: 299.99,
    },
    { title: 'Smart Watch', url: 'https://example.com/watch', wishLevel: 5, price: 399.99 },

    // Medium-high priority (4 stars)
    {
      title: 'Board Game Collection',
      url: 'https://example.com/games',
      wishLevel: 4,
      price: 59.99,
    },
    { title: 'Coffee Maker', url: 'https://example.com/coffee', wishLevel: 4, price: 149.99 },
    { title: 'Book Set', url: 'https://example.com/books', wishLevel: 4, price: 45.99 },

    // Medium priority (3 stars)
    { title: 'Phone Case', url: 'https://example.com/case', wishLevel: 3, price: 24.99 },
    { title: 'Desk Organizer', url: 'https://example.com/organizer', wishLevel: 3, price: 34.99 },
    { title: 'Plant Pot Set', url: 'https://example.com/plants', wishLevel: 3, price: 29.99 },

    // Low priority (2 stars)
    { title: 'Notebook', url: 'https://example.com/notebook', wishLevel: 2, price: 12.99 },
    { title: 'Pen Set', url: 'https://example.com/pens', wishLevel: 2, price: 19.99 },

    // Very low priority (1 star)
    { title: 'Stickers', url: 'https://example.com/stickers', wishLevel: 1, price: 5.99 },
    { title: 'Keychain', url: 'https://example.com/keychain', wishLevel: 1, price: 8.99 },
  ];

  const createdWishes = await Promise.all(
    wishes.map((wish, index) =>
      prisma.wish.create({
        data: {
          ...wish,
          notes: `Test item for filtering - ${wish.title}`,
          imageUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(wish.title)}`,
          owner: {
            connect: { id: testUser.id },
          },
          createdAt: new Date(Date.now() - (wishes.length - index) * 60000), // Stagger creation times
        },
      })
    )
  );

  // Add all wishes to the birthday list
  await Promise.all(
    createdWishes.map((wish) =>
      prisma.listWish.create({
        data: {
          list: {
            connect: { id: birthdayList.id },
          },
          wish: {
            connect: { id: wish.id },
          },
        },
      })
    )
  );

  // Create a family group
  const familyGroup = await prisma.group.create({
    data: {
      name: "Dad's Side Family",
      description: 'Family group for testing',
    },
  });

  // Add test user as admin of the group
  await prisma.userGroup.create({
    data: {
      user: {
        connect: { id: testUser.id },
      },
      group: {
        connect: { id: familyGroup.id },
      },
      role: 'admin',
    },
  });

  // Add gift giver to the group
  await prisma.userGroup.create({
    data: {
      user: {
        connect: { id: giftGiver.id },
      },
      group: {
        connect: { id: familyGroup.id },
      },
      role: 'member',
    },
  });

  // Share the list with the group
  await prisma.listGroup.create({
    data: {
      list: {
        connect: { id: birthdayList.id },
      },
      group: {
        connect: { id: familyGroup.id },
      },
      sharedBy: testUser.id,
    },
  });

  // Create some reservations (hidden from list owner)
  await prisma.reservation.create({
    data: {
      wish: {
        connect: { id: createdWishes[1].id },
      }, // Reserve the headphones
      reserverName: giftGiver.name,
      reserverEmail: giftGiver.email,
    },
  });

  await prisma.reservation.create({
    data: {
      wish: {
        connect: { id: createdWishes[6].id },
      }, // Reserve the phone case
      reserverName: giftGiver.name,
      reserverEmail: giftGiver.email,
    },
  });

  console.log('✅ Test data seeded successfully!');
  console.log(`Test User: ${testUser.email}`);
  console.log(`Gift Giver: ${giftGiver.email}`);
  console.log(`List: ${birthdayList.name} with ${wishes.length} wishes`);
  console.log(`Group: ${familyGroup.name}`);
}

main()
  .catch((e) => {
    console.error('Error seeding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
