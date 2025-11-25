#!/usr/bin/env tsx

/**
 * Check for duplicate reservations that would violate @@unique([wishId, userId])
 *
 * This script queries the database for any duplicate [wishId, userId] combinations
 * that would prevent adding a unique constraint to the Reservation model.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface DuplicateResult {
  wishId: string;
  userId: string;
  duplicate_count: number;
  reservation_ids: string;
}

async function checkDuplicateReservations() {
  console.log('🔍 Checking for duplicate reservations...\n');

  try {
    // For SQLite, we need to use GROUP_CONCAT instead of ARRAY_AGG
    const duplicates = await db.$queryRaw<DuplicateResult[]>`
      SELECT
        wishId,
        userId,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(id, ', ') as reservation_ids
      FROM Reservation
      GROUP BY wishId, userId
      HAVING COUNT(*) > 1
    `;

    console.log(`✅ Query executed successfully\n`);

    if (duplicates.length === 0) {
      console.log('✨ No duplicate reservations found!');
      console.log('✅ Safe to add @@unique([wishId, userId]) constraint\n');

      // Get total reservation count for context
      const totalReservations = await db.reservation.count();
      console.log(`📊 Total reservations in database: ${totalReservations}\n`);

      return { duplicates: [], totalReservations };
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate reservation(s):\n`);

    // Display detailed information
    duplicates.forEach((dup, index) => {
      console.log(`Duplicate #${index + 1}:`);
      console.log(`  Wish ID: ${dup.wishId}`);
      console.log(`  User ID: ${dup.userId}`);
      console.log(`  Count: ${dup.duplicate_count}`);
      console.log(`  Reservation IDs: ${dup.reservation_ids}`);
      console.log('');
    });

    // Get detailed information for each duplicate
    console.log('📋 Detailed reservation information:\n');

    for (const dup of duplicates) {
      const reservations = await db.reservation.findMany({
        where: {
          wishId: dup.wishId,
          userId: dup.userId,
        },
        include: {
          wish: {
            select: {
              id: true,
              title: true,
              ownerId: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          reservedAt: 'desc',
        },
      });

      console.log(`Wish: "${reservations[0].wish.title}" (${dup.wishId})`);
      console.log(`User: ${reservations[0].user.email} (${dup.userId})\n`);

      reservations.forEach((res, idx) => {
        console.log(`  [${idx + 1}] ID: ${res.id}`);
        console.log(`      Reserved at: ${res.reservedAt.toISOString()}`);
      });
      console.log('');
    }

    // Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      duplicateCount: duplicates.length,
      duplicates: duplicates.map((dup) => ({
        wishId: dup.wishId,
        userId: dup.userId,
        count: dup.duplicate_count,
        reservationIds: dup.reservation_ids.split(', '),
      })),
    };

    const fs = await import('fs/promises');
    const outputPath = './duplicate-reservations-report.json';
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

    console.log(`💾 Results saved to: ${outputPath}\n`);

    return results;
  } catch (error) {
    console.error('❌ Error checking for duplicates:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the check
checkDuplicateReservations()
  .then((results) => {
    if (results.duplicates && results.duplicates.length > 0) {
      console.log(
        '⚠️  ACTION REQUIRED: Remove duplicate reservations before adding unique constraint'
      );
      process.exit(1);
    } else {
      console.log('✅ All checks passed - ready to proceed with schema migration');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
