const path = require('path');

/**
 * Resolves DATABASE_URL relative paths to absolute paths from project root.
 * This ensures consistent behavior regardless of where Prisma is invoked from.
 *
 * @param {string | undefined} url - The database URL to resolve
 * @returns {string | undefined} The resolved database URL with absolute path
 */
function resolveDatabaseUrl(url) {
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

module.exports = { resolveDatabaseUrl };
