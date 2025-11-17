#!/usr/bin/env node
/**
 * Migration Script: Migrate User.email to UserEmail model
 *
 * This script:
 * 1. Reads all existing User.email values
 * 2. Creates UserEmail records marked as primary and verified
 * 3. Handles edge cases (null emails, duplicates)
 * 4. Is idempotent (safe to run multiple times)
 *
 * Run with: pnpm tsx scripts/migrate-existing-emails.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  skippedUsers: number;
  usersWithoutEmail: number;
  duplicateEmails: number;
  errors: string[];
}

async function migrateExistingEmails() {
  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    skippedUsers: 0,
    usersWithoutEmail: 0,
    duplicateEmails: 0,
    errors: [],
  };

  try {
    console.log('🚀 Starting email migration...\n');

    // Get all users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    stats.totalUsers = users.length;
    console.log(`📊 Found ${stats.totalUsers} users to process\n`);

    // Process each user
    for (const user of users) {
      try {
        // Check if user has an email
        if (!user.email) {
          console.log(`⚠️  User ${user.id} (${user.name || 'unnamed'}) has no email - skipping`);
          stats.usersWithoutEmail++;
          continue;
        }

        // Check if UserEmail already exists for this user
        const existingUserEmail = await db.userEmail.findFirst({
          where: {
            userId: user.id,
            email: user.email,
          },
        });

        if (existingUserEmail) {
          console.log(`✓  User ${user.email} already migrated - skipping`);
          stats.skippedUsers++;
          continue;
        }

        // Check if this user already has ANY UserEmail records
        const existingCount = await db.userEmail.count({
          where: { userId: user.id },
        });

        if (existingCount > 0) {
          console.log(`⚠️  User ${user.email} already has UserEmail records - skipping migration`);
          stats.skippedUsers++;
          continue;
        }

        // Create UserEmail record
        await db.userEmail.create({
          data: {
            userId: user.id,
            email: user.email,
            isPrimary: true,
            isVerified: user.emailVerified !== null,
            verifiedAt: user.emailVerified,
          },
        });

        console.log(`✓  Migrated: ${user.email} (verified: ${user.emailVerified !== null})`);
        stats.migratedUsers++;
      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.id} (${user.email}): ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);

        // Check if it's a duplicate email error
        if (error instanceof Error && error.message.includes('Unique constraint')) {
          stats.duplicateEmails++;
        }
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log('─'.repeat(50));
    console.log(`Total Users:           ${stats.totalUsers}`);
    console.log(`Successfully Migrated: ${stats.migratedUsers}`);
    console.log(`Skipped (already done): ${stats.skippedUsers}`);
    console.log(`Users Without Email:   ${stats.usersWithoutEmail}`);
    console.log(`Duplicate Email Issues: ${stats.duplicateEmails}`);
    console.log(`Errors:                ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Validate migration
    console.log('\n🔍 Validating migration...');
    const validationResults = await validateMigration();

    if (validationResults.isValid) {
      console.log('✅ Migration validation passed!');
    } else {
      console.log('❌ Migration validation failed:');
      validationResults.issues.forEach((issue) => {
        console.log(`  - ${issue}`);
      });
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

async function validateMigration(): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    // Check 1: All users with emails should have a UserEmail record
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });

    const usersWithEmail = allUsers.filter((u) => u.email !== null && u.email !== '').length;
    const userEmailCount = await db.userEmail.count();

    if (usersWithEmail > userEmailCount) {
      issues.push(
        `Found ${usersWithEmail} users with emails but only ${userEmailCount} UserEmail records`
      );
    }

    // Check 2: All users should have exactly one primary email
    const usersWithEmails = await db.user.findMany({
      where: {
        email: { not: '' },
      },
      include: {
        emails: {
          where: { isPrimary: true },
        },
      },
    });

    for (const user of usersWithEmails) {
      if (user.emails.length === 0) {
        issues.push(`User ${user.email} has no primary email`);
      } else if (user.emails.length > 1) {
        issues.push(`User ${user.email} has ${user.emails.length} primary emails`);
      }
    }

    // Check 3: User.email should match primary UserEmail.email
    for (const user of usersWithEmails) {
      const primaryEmail = user.emails[0];
      if (primaryEmail && primaryEmail.email !== user.email) {
        issues.push(
          `User.email (${user.email}) does not match primary UserEmail.email (${primaryEmail.email})`
        );
      }
    }

    // Check 4: No UserEmail records without a valid user
    const allUserEmails = await db.userEmail.findMany({
      include: {
        user: true,
      },
    });

    const orphanedEmails = allUserEmails.filter((ue) => !ue.user);

    if (orphanedEmails.length > 0) {
      issues.push(`Found ${orphanedEmails.length} orphaned UserEmail records`);
    }
  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Run the migration
migrateExistingEmails();
