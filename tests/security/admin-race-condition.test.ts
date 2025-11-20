import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Admin Assignment Race Condition Prevention', () => {
  describe('Code Analysis - Serializable Isolation Level', () => {
    it('should use Serializable isolation level in auth.ts', () => {
      // Read the auth.ts file and verify isolation level
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Check for Serializable isolation level
      expect(authContent).toContain("isolationLevel: 'Serializable'");

      // Verify it's in the context of admin assignment
      const lines = authContent.split('\n');
      let foundIsolation = false;
      let foundAdminLogic = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("isolationLevel: 'Serializable'")) {
          foundIsolation = true;

          // Check nearby lines for admin assignment logic
          const contextWindow = 20;
          for (
            let j = Math.max(0, i - contextWindow);
            j < Math.min(lines.length, i + contextWindow);
            j++
          ) {
            if (
              lines[j].includes('isAdmin') ||
              lines[j].includes('admin') ||
              lines[j].includes('first user')
            ) {
              foundAdminLogic = true;
              break;
            }
          }
        }
      }

      expect(foundIsolation).toBe(true);
      expect(foundAdminLogic).toBe(true);
    });

    it('should use transaction for admin assignment', () => {
      // Read the auth.ts file
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Verify transaction usage
      expect(authContent).toContain('$transaction');

      // Verify it checks for existing admins
      expect(authContent).toContain('findFirst');
      expect(authContent).toContain('isAdmin');
    });

    it('should check for existing admins before assigning admin role', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Verify the logic checks if admin exists
      const hasAdminCheck =
        authContent.includes('adminExists') ||
        (authContent.includes('findFirst') && authContent.includes('isAdmin: true'));

      expect(hasAdminCheck).toBe(true);
    });

    it('should update user to admin role within transaction', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find serializable transaction
      const serializableIndex = authContent.indexOf("isolationLevel: 'Serializable'");
      expect(serializableIndex).toBeGreaterThan(-1);

      // Extract the transaction section (look backwards for the start)
      const transactionStart = authContent.lastIndexOf('$transaction', serializableIndex);
      const transactionSection = authContent.substring(transactionStart, serializableIndex + 500);

      // Verify admin assignment happens in transaction
      expect(transactionSection).toContain('isAdmin');
      expect(transactionSection).toContain('role');
      expect(transactionSection).toContain('user.update');
    });

    it('should use proper transaction isolation to prevent race conditions', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Extract the transaction section
      const transactionRegex =
        /db\.\$transaction\([\s\S]*?isolationLevel:\s*'Serializable'[\s\S]*?\)\s*;/;
      const match = authContent.match(transactionRegex);

      expect(match).toBeTruthy();

      if (match) {
        const transactionCode = match[0];

        // Verify the transaction:
        // 1. Checks for existing admins
        expect(transactionCode).toContain('findFirst');

        // 2. Checks for no admin
        expect(transactionCode).toContain('!adminExists') ||
          expect(transactionCode).toContain('adminExists');

        // 3. Updates user to admin
        expect(transactionCode).toContain('user.update');
        expect(transactionCode).toContain('isAdmin: true');
        expect(transactionCode).toContain("role: 'admin'");
      }
    });
  });

  describe('Transaction Pattern Validation', () => {
    it('should use async transaction callback', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Verify async transaction pattern
      expect(authContent).toContain('$transaction');
      expect(authContent).toContain('async (tx)');
    });

    it('should handle transaction errors gracefully', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find transaction block
      const lines = authContent.split('\n');
      let inTransactionBlock = false;
      let hasErrorHandling = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("isolationLevel: 'Serializable'")) {
          inTransactionBlock = true;
        }

        if (inTransactionBlock && (line.includes('try {') || line.includes('catch'))) {
          hasErrorHandling = true;
          break;
        }

        // Exit transaction block after closing braces
        if (inTransactionBlock && line.trim().startsWith('}') && line.includes('isolationLevel')) {
          break;
        }
      }

      // Should have error handling around or within the transaction
      expect(hasErrorHandling).toBe(true);
    });

    it('should log admin assignment for audit trail', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find the admin assignment section
      const lines = authContent.split('\n');
      let foundAdminUpdate = false;
      let foundLogging = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('isAdmin: true')) {
          foundAdminUpdate = true;

          // Check nearby lines for logging
          const contextWindow = 10;
          for (
            let j = Math.max(0, i - contextWindow);
            j < Math.min(lines.length, i + contextWindow);
            j++
          ) {
            if (lines[j].includes('logger.info') || lines[j].includes('console.log')) {
              foundLogging = true;
              break;
            }
          }
        }
      }

      expect(foundAdminUpdate).toBe(true);
      expect(foundLogging).toBe(true);
    });
  });

  describe('Security Best Practices', () => {
    it('should have controlled admin role assignment', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find all instances where isAdmin is set to true in data objects
      const isAdminAssignments = authContent.match(/isAdmin:\s*true/g);

      // Should have admin assignments (may have multiple for different scenarios)
      expect(isAdminAssignments).not.toBeNull();
      expect(isAdminAssignments!.length).toBeGreaterThan(0);

      // All assignments should be within transaction blocks for safety
      const transactionCount = (authContent.match(/\$transaction/g) || []).length;
      expect(transactionCount).toBeGreaterThan(0);
    });

    it('should check for existing admins before any admin assignment', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find the serializable transaction section
      const serializableIndex = authContent.indexOf("isolationLevel: 'Serializable'");
      expect(serializableIndex).toBeGreaterThan(-1);

      // Extract a large section around the transaction
      const transactionStart = authContent.lastIndexOf('$transaction', serializableIndex);
      const transactionSection = authContent.substring(transactionStart, serializableIndex + 500);

      // Must check if admin exists before assignment
      const hasAdminCheck =
        transactionSection.includes('findFirst') || transactionSection.includes('adminExists');
      expect(hasAdminCheck).toBe(true);
    });

    it('should use transaction isolation to prevent concurrent modifications', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Serializable is the strongest isolation level
      // It prevents phantom reads and ensures sequential execution
      expect(authContent).toContain("isolationLevel: 'Serializable'");

      // Should NOT use lower isolation levels for admin assignment
      const adminSection = authContent.substring(
        authContent.indexOf('isAdmin: true') - 500,
        authContent.indexOf('isAdmin: true') + 500
      );

      expect(adminSection).not.toContain("isolationLevel: 'ReadCommitted'");
      expect(adminSection).not.toContain("isolationLevel: 'RepeatableRead'");
    });
  });

  describe('Documentation and Comments', () => {
    it('should document the race condition prevention strategy', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Find the transaction section
      const transactionIndex = authContent.indexOf("isolationLevel: 'Serializable'");
      const beforeTransaction = authContent.substring(
        Math.max(0, transactionIndex - 500),
        transactionIndex
      );

      // Should have comments explaining the race condition prevention
      const hasRaceConditionComment =
        beforeTransaction.includes('race') ||
        beforeTransaction.includes('concurrent') ||
        beforeTransaction.includes('serializable');

      expect(hasRaceConditionComment).toBe(true);
    });

    it('should explain why Serializable isolation is needed', () => {
      const authPath = join(process.cwd(), 'src/lib/auth.ts');
      const authContent = readFileSync(authPath, 'utf-8');

      // Look for explanation near the isolation level setting
      const serializableIndex = authContent.indexOf("isolationLevel: 'Serializable'");
      const context = authContent.substring(
        Math.max(0, serializableIndex - 300),
        serializableIndex + 100
      );

      // Should have some explanation (comment) about why this isolation level
      const hasExplanation = context.includes('//') || context.includes('/*');

      expect(hasExplanation).toBe(true);
    });
  });
});
