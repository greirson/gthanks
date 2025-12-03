#!/usr/bin/env node

/**
 * SQL Migration Analyzer
 *
 * Parses SQL migration files to detect destructive operations that may cause data loss.
 * Supports both SQLite and PostgreSQL syntax.
 *
 * Usage:
 *   node scripts/analyze-migration.js path/to/migration.sql
 *
 * Exit codes:
 *   0 - No destructive operations found
 *   1 - Destructive operations detected or error
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

// Destructive operation patterns
const DESTRUCTIVE_PATTERNS = [
  {
    // DROP TABLE (case-insensitive, matches both quoted and unquoted identifiers)
    regex: /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/gi,
    type: 'DROP TABLE',
    description: 'Table deletion',
  },
  {
    // ALTER TABLE ... DROP COLUMN (case-insensitive, handles optional IF EXISTS)
    regex:
      /\bALTER\s+TABLE\s+["']?(\w+)["']?\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/gi,
    type: 'DROP COLUMN',
    description: 'Column removal',
  },
  {
    // DELETE FROM (case-insensitive, matches both quoted and unquoted identifiers)
    regex: /\bDELETE\s+FROM\s+["']?(\w+)["']?/gi,
    type: 'DELETE FROM',
    description: 'Data deletion',
  },
  {
    // TRUNCATE TABLE (case-insensitive, handles optional TABLE keyword)
    regex: /\bTRUNCATE\s+(?:TABLE\s+)?["']?(\w+)["']?/gi,
    type: 'TRUNCATE',
    description: 'Table data removal',
  },
];

/**
 * Check if a DROP TABLE is part of SQLite's safe table redefinition pattern.
 * SQLite doesn't support ALTER TABLE for many operations, so it uses:
 *   1. CREATE TABLE "new_TableName" (...)
 *   2. INSERT INTO "new_TableName" SELECT FROM "TableName"
 *   3. DROP TABLE "TableName"
 *   4. ALTER TABLE "new_TableName" RENAME TO "TableName"
 *
 * This pattern is SAFE because data is preserved through the copy.
 *
 * @param {string} content - Full SQL content
 * @param {string} tableName - Table being dropped
 * @returns {boolean} True if this is a safe redefinition pattern
 */
function isSQLiteRedefinitionPattern(content, tableName) {
  // Normalize for case-insensitive matching
  const normalizedContent = content.toLowerCase();
  const normalizedTable = tableName.toLowerCase();

  // Check for the pattern indicators:
  // 1. CREATE TABLE "new_<tablename>" exists
  const hasNewTable = new RegExp(`create\\s+table\\s+["']?new_${normalizedTable}["']?`, 'i').test(
    content
  );

  // 2. ALTER TABLE "new_<tablename>" RENAME TO "<tablename>" exists
  const hasRename = new RegExp(
    `alter\\s+table\\s+["']?new_${normalizedTable}["']?\\s+rename\\s+to\\s+["']?${normalizedTable}["']?`,
    'i'
  ).test(content);

  // 3. PRAGMA foreign_keys or defer_foreign_keys (SQLite redefinition markers)
  const hasPragma = /pragma\s+(defer_)?foreign_keys/i.test(content);

  // If all three indicators present, this is a safe redefinition
  return hasNewTable && hasRename && hasPragma;
}

/**
 * Parse SQL file and detect destructive operations
 * @param {string} filePath - Path to SQL migration file
 * @returns {Array<Object>} Array of detected issues
 */
function analyzeMigration(filePath) {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} File not found: ${filePath}`);
    process.exit(1);
  }

  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  // Check each destructive pattern
  DESTRUCTIVE_PATTERNS.forEach((pattern) => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    while ((match = regex.exec(content)) !== null) {
      const tableName = match[1];

      // Skip SQLite table redefinition patterns (safe DROP TABLE)
      if (pattern.type === 'DROP TABLE' && isSQLiteRedefinitionPattern(content, tableName)) {
        continue;
      }

      // Find line number
      const matchIndex = match.index;
      let currentPos = 0;
      let lineNumber = 1;

      for (let i = 0; i < lines.length; i++) {
        currentPos += lines[i].length + 1; // +1 for newline
        if (currentPos > matchIndex) {
          lineNumber = i + 1;
          break;
        }
      }

      // Extract the matched statement (full line or trimmed)
      const lineContent = lines[lineNumber - 1].trim();

      issues.push({
        type: pattern.type,
        description: pattern.description,
        line: lineNumber,
        content: lineContent,
        target: tableName, // Table or column name
      });
    }
  });

  return issues;
}

/**
 * Format and print analysis results
 * @param {string} filePath - Path to analyzed file
 * @param {Array<Object>} issues - Detected issues
 */
function printResults(filePath, issues) {
  const fileName = path.basename(filePath);

  if (issues.length === 0) {
    // Success - no destructive operations
    console.log(
      `${colors.green}${colors.bold}✓ Migration check passed:${colors.reset} No destructive operations found.`
    );
    console.log();
    return;
  }

  // Warning - destructive operations detected
  console.log();
  console.log(
    `${colors.red}${colors.bold}⚠ WARNING: Destructive migration detected!${colors.reset}`
  );
  console.log();
  console.log(
    `Found ${colors.bold}${issues.length}${colors.reset} destructive operation(s) in ${colors.bold}${fileName}${colors.reset}:`
  );
  console.log();

  // Group issues by type for better readability
  const groupedIssues = {};
  issues.forEach((issue) => {
    if (!groupedIssues[issue.type]) {
      groupedIssues[issue.type] = [];
    }
    groupedIssues[issue.type].push(issue);
  });

  // Print grouped issues
  Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
    console.log(`  ${colors.yellow}${type}${colors.reset} (${typeIssues.length}):`);
    typeIssues.forEach((issue) => {
      console.log(
        `    ${colors.bold}Line ${issue.line}:${colors.reset} ${issue.content.substring(0, 80)}${issue.content.length > 80 ? '...' : ''}`
      );
    });
    console.log();
  });

  console.log(
    `${colors.red}These operations may cause data loss. Review carefully before applying.${colors.reset}`
  );
  console.log();
}

/**
 * Main execution
 */
function main() {
  // Check for file argument
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} Missing migration file path`);
    console.log();
    console.log(`${colors.bold}Usage:${colors.reset}`);
    console.log(`  node scripts/analyze-migration.js path/to/migration.sql`);
    console.log();
    console.log(`${colors.bold}Example:${colors.reset}`);
    console.log(
      `  node scripts/analyze-migration.js prisma/migrations/20240115_add_users/migration.sql`
    );
    console.log();
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  // Analyze the migration
  const issues = analyzeMigration(filePath);

  // Print results
  printResults(filePath, issues);

  // Exit with appropriate code
  process.exit(issues.length > 0 ? 1 : 0);
}

// Run the script
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`${colors.red}${colors.bold}FATAL ERROR:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { analyzeMigration };
