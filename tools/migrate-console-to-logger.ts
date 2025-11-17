#!/usr/bin/env tsx
/**
 * Automated migration script to replace console.error with logger.error
 * across all API routes for standardized error logging.
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';

const files = globSync('src/app/api/**/*.ts', {
  ignore: ['**/*.test.ts', '**/*.spec.ts'],
});

let filesUpdated = 0;
let replacements = 0;
const filesModified: string[] = [];

console.log(`Found ${files.length} API route files to process...\n`);

files.forEach((file) => {
  let content = readFileSync(file, 'utf-8');
  let modified = false;
  const originalContent = content;

  // Skip if no console.error found
  if (!content.includes('console.error')) {
    return;
  }

  // Add logger import if missing
  if (!content.includes("from '@/lib/services/logger'")) {
    // Find the last import statement
    const lastImportMatch = content.match(/^import .+ from .+;$/gm);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      content = content.replace(
        lastImport,
        lastImport + "\nimport { logger } from '@/lib/services/logger';"
      );
      modified = true;
    } else {
      // No imports found, add at the top (after any comments)
      const firstNonComment = content.match(/^[^/\n]/m);
      if (firstNonComment && firstNonComment.index !== undefined) {
        content =
          content.slice(0, firstNonComment.index) +
          "import { logger } from '@/lib/services/logger';\n\n" +
          content.slice(firstNonComment.index);
        modified = true;
      }
    }
  }

  // Track replacements for this file
  let fileReplacements = 0;

  // Pattern 1: console.error('Message:', error) or console.error("Message:", error)
  const pattern1 = /console\.error\(['"]([^'"]+)['"]\s*,\s*(\w+)\s*\);?/g;
  const matches1 = content.match(pattern1);
  if (matches1) {
    content = content.replace(pattern1, (match, message, errorVar) => {
      fileReplacements++;
      // Clean up message (remove trailing colon if present)
      const cleanMessage = message.replace(/:$/, '').trim();
      return `logger.error({ error: ${errorVar} }, '${cleanMessage}');`;
    });
    modified = true;
  }

  // Pattern 2: console.error(error) - single argument
  const pattern2 = /console\.error\((\w+)\s*\);?/g;
  const matches2 = content.match(pattern2);
  if (matches2) {
    content = content.replace(pattern2, (match, errorVar) => {
      fileReplacements++;
      return `logger.error({ error: ${errorVar} }, 'Error occurred');`;
    });
    modified = true;
  }

  // Pattern 3: console.error('Message') - string only
  const pattern3 = /console\.error\(['"]([^'"]+)['"]\s*\);?/g;
  const matches3 = content.match(pattern3);
  if (matches3) {
    content = content.replace(pattern3, (match, message) => {
      fileReplacements++;
      return `logger.error('${message}');`;
    });
    modified = true;
  }

  // Pattern 4: console.error with template literals
  const pattern4 = /console\.error\(`([^`]+)`\s*\);?/g;
  const matches4 = content.match(pattern4);
  if (matches4) {
    content = content.replace(pattern4, (match, message) => {
      fileReplacements++;
      return `logger.error(\`${message}\`);`;
    });
    modified = true;
  }

  if (modified && content !== originalContent) {
    writeFileSync(file, content, 'utf-8');
    filesUpdated++;
    replacements += fileReplacements;
    filesModified.push(file);
    console.log(`✓ Updated ${file} (${fileReplacements} replacements)`);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log('✅ Migration complete:');
console.log(`   Files updated: ${filesUpdated}`);
console.log(`   Total replacements: ${replacements}`);
console.log(`${'='.repeat(60)}\n`);

if (filesModified.length > 0) {
  console.log('Files modified:');
  filesModified.forEach((file) => {
    console.log(`  - ${file}`);
  });
  console.log('\nNext steps:');
  console.log('1. Review changes: git diff src/app/api/');
  console.log('2. Run build: pnpm build');
  console.log('3. Run tests: pnpm test');
  console.log('4. Manual review for context/PII');
}
