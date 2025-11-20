import path from 'path';

/**
 * Resolves DATABASE_URL relative paths to absolute paths from project root.
 * This ensures consistent behavior regardless of where Prisma is invoked from.
 *
 * @param url - The database URL to resolve (typically from process.env.DATABASE_URL)
 * @returns The resolved database URL with absolute path, or undefined if input is undefined
 *
 * @example
 * ```typescript
 * // Relative SQLite path
 * resolveDatabaseUrl('file:./data/gthanks.db')
 * // Returns: 'file:/absolute/path/to/project/data/gthanks.db'
 *
 * // PostgreSQL URL (unchanged)
 * resolveDatabaseUrl('postgresql://user:pass@host:5432/db')
 * // Returns: 'postgresql://user:pass@host:5432/db'
 * ```
 */
export function resolveDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }

  // Check if it's a SQLite file URL with a relative path
  if (url.startsWith('file:./') || url.startsWith('file:../')) {
    const relativePath = url.replace('file:', '');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    return `file:${absolutePath}`;
  }

  return url;
}
