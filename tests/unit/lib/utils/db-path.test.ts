import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { resolveDatabaseUrl } from '@/lib/utils/db-path';

describe('resolveDatabaseUrl', () => {
  // Store original process.cwd for restoration
  const originalCwd = process.cwd;
  const mockProjectRoot = '/Users/test/project';

  beforeEach(() => {
    // Mock process.cwd() to return a predictable path
    process.cwd = jest.fn(() => mockProjectRoot) as () => string;
  });

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalCwd;
  });

  describe('SQLite relative paths with "./"', () => {
    it('should resolve relative paths starting with "./"', () => {
      const input = 'file:./data/gthanks.db';
      const expected = `file:${path.join(mockProjectRoot, 'data/gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should resolve nested relative paths with "./"', () => {
      const input = 'file:./data/sqlite/dev.db';
      const expected = `file:${path.join(mockProjectRoot, 'data/sqlite/dev.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should resolve single file in current directory with "./"', () => {
      const input = 'file:./gthanks.db';
      const expected = `file:${path.join(mockProjectRoot, 'gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });
  });

  describe('SQLite relative paths with "../"', () => {
    it('should resolve parent directory paths starting with "../"', () => {
      const input = 'file:../data/gthanks.db';
      const expected = `file:${path.resolve(mockProjectRoot, '../data/gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should resolve multiple levels of parent directories', () => {
      const input = 'file:../../shared/db/gthanks.db';
      const expected = `file:${path.resolve(mockProjectRoot, '../../shared/db/gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should resolve single level parent directory', () => {
      const input = 'file:../gthanks.db';
      const expected = `file:${path.resolve(mockProjectRoot, '../gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });
  });

  describe('PostgreSQL URLs', () => {
    it('should pass through PostgreSQL connection strings unchanged', () => {
      const input = 'postgresql://user:password@localhost:5432/gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through PostgreSQL URLs with query parameters', () => {
      const input = 'postgresql://user:password@localhost:5432/gthanks?schema=public&sslmode=require';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through PostgreSQL URLs with special characters in password', () => {
      const input = 'postgresql://user:p@ssw0rd!@localhost:5432/gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through Neon serverless PostgreSQL URLs', () => {
      const input = 'postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/gthanks?sslmode=require';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through Supabase PostgreSQL URLs', () => {
      const input = 'postgresql://postgres:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('MySQL URLs', () => {
    it('should pass through MySQL connection strings unchanged', () => {
      const input = 'mysql://user:password@localhost:3306/gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through MySQL URLs with query parameters', () => {
      const input = 'mysql://user:password@localhost:3306/gthanks?charset=utf8mb4';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('Absolute SQLite paths', () => {
    it('should pass through absolute Unix paths unchanged', () => {
      const input = 'file:/absolute/path/to/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through absolute Windows paths unchanged', () => {
      const input = 'file:C:/Users/test/data/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through absolute path with UNC notation', () => {
      const input = 'file://server/share/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('SQLite paths without "./" or "../"', () => {
    it('should pass through simple filename without prefix', () => {
      const input = 'file:gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through path without relative prefix', () => {
      const input = 'file:data/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined input', () => {
      const result = resolveDatabaseUrl(undefined);

      expect(result).toBeUndefined();
    });

    it('should handle empty string', () => {
      const input = '';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const input = '   ';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe('   ');
    });

    it('should handle non-database URL strings', () => {
      const input = 'not-a-database-url';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should handle SQLite in-memory database', () => {
      const input = 'file::memory:';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('Other database providers', () => {
    it('should pass through MongoDB URLs unchanged', () => {
      const input = 'mongodb://user:password@localhost:27017/gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through MSSQL URLs unchanged', () => {
      const input = 'sqlserver://localhost:1433;database=gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should pass through Oracle URLs unchanged', () => {
      const input = 'oracle://user:password@localhost:1521/gthanks';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle development SQLite path', () => {
      const input = 'file:./data/gthanks.db';
      const expected = `file:${path.join(mockProjectRoot, 'data/gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should handle testing SQLite path', () => {
      const input = 'file:./data/test.db';
      const expected = `file:${path.join(mockProjectRoot, 'data/test.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });

    it('should handle production PostgreSQL URL', () => {
      const input = 'postgresql://gthanks:secret@production-db:5432/gthanks?schema=public';

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(input);
    });

    it('should handle Docker Compose relative path', () => {
      const input = 'file:../shared-data/gthanks.db';
      const expected = `file:${path.resolve(mockProjectRoot, '../shared-data/gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });
  });

  describe('Path normalization', () => {
    it('should normalize paths with multiple slashes', () => {
      const input = 'file:./data//gthanks.db';
      const expected = `file:${path.join(mockProjectRoot, 'data//gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      // path.join normalizes the double slashes
      expect(result).toBe(expected.replace('//', '/'));
    });

    it('should handle paths with mixed separators on Windows', () => {
      // Note: This test verifies that the function works with path.resolve
      // which handles platform-specific separators
      const input = 'file:./data\\gthanks.db';
      const expected = `file:${path.resolve(mockProjectRoot, './data\\gthanks.db')}`;

      const result = resolveDatabaseUrl(input);

      expect(result).toBe(expected);
    });
  });

  describe('Type safety', () => {
    it('should accept string input', () => {
      const input: string = 'file:./data/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(typeof result).toBe('string');
    });

    it('should accept undefined input', () => {
      const input: undefined = undefined;

      const result = resolveDatabaseUrl(input);

      expect(result).toBeUndefined();
    });

    it('should accept string | undefined union type', () => {
      const input: string | undefined = Math.random() > 0.5
        ? 'file:./data/gthanks.db'
        : undefined;

      const result = resolveDatabaseUrl(input);

      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('Function behavior', () => {
    it('should not mutate input string', () => {
      const input = 'file:./data/gthanks.db';
      const inputCopy = input;

      resolveDatabaseUrl(input);

      expect(input).toBe(inputCopy);
    });

    it('should return new string instance for resolved paths', () => {
      const input = 'file:./data/gthanks.db';

      const result = resolveDatabaseUrl(input);

      expect(result).not.toBe(input);
      expect(typeof result).toBe('string');
    });

    it('should use process.cwd() for path resolution', () => {
      const input = 'file:./data/gthanks.db';

      resolveDatabaseUrl(input);

      expect(process.cwd).toHaveBeenCalled();
    });
  });
});
