/**
 * Custom ESLint rule: Enforce service layer pattern in API routes
 * Prevents security vulnerabilities from bypassing centralized permission checks
 */

module.exports = {
  rules: {
    'no-direct-db-import': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow direct db imports in API routes - use service layer instead',
          category: 'Best Practices',
          recommended: true,
        },
        messages: {
          noDirectDbImport:
            'Avoid direct db imports in API routes. Use service layer methods instead (e.g., wishService, listService, permissionService).',
        },
        schema: [],
      },
      create(context) {
        // Only check files in src/app/api/**
        const filename = context.getFilename();
        if (!filename.includes('/app/api/')) {
          return {};
        }

        return {
          // Check for: import { db } from '@/lib/db'
          ImportDeclaration(node) {
            if (node.source.value === '@/lib/db') {
              const dbImported = node.specifiers.some(
                (spec) => spec.imported && spec.imported.name === 'db'
              );
              if (dbImported) {
                context.report({
                  node,
                  messageId: 'noDirectDbImport',
                });
              }
            }
          },
        };
      },
    },

    'use-permission-service': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require use of permissionService for authorization checks',
          category: 'Security',
          recommended: true,
        },
        messages: {
          usePermissionService:
            'Use permissionService.require() or permissionService.can() instead of manual permission checks. Manual checks bypass business rules and create security holes.',
        },
        schema: [],
      },
      create(context) {
        // Only check files in src/app/api/**
        const filename = context.getFilename();
        if (!filename.includes('/app/api/') || filename.includes('permission-service')) {
          return {};
        }

        return {
          // Check for manual permission patterns like: if (list.ownerId === userId)
          BinaryExpression(node) {
            // Look for patterns like: list.ownerId === userId or wish.ownerId === user.id
            if (node.operator === '===' || node.operator === '!==') {
              const leftText = context.getSourceCode().getText(node.left);
              const rightText = context.getSourceCode().getText(node.right);

              const hasOwnerIdCheck = leftText.includes('ownerId') || rightText.includes('ownerId');
              const hasUserIdCheck =
                leftText.includes('user.id') ||
                rightText.includes('user.id') ||
                leftText.includes('userId') ||
                rightText.includes('userId');

              if (hasOwnerIdCheck && hasUserIdCheck) {
                context.report({
                  node,
                  messageId: 'usePermissionService',
                });
              }
            }
          },
        };
      },
    },
  },
};
