# Husky Git Hooks

This directory contains Git hooks managed by Husky v9 to maintain code quality.

## Hooks Overview

### pre-commit

- Runs `lint-staged` to format and lint only changed files
- Shows TypeScript errors (non-blocking) to give early feedback
- Fast - only processes staged files

### pre-push

- **Type checking**: Warns about TypeScript errors but allows override
- **Linting**: Blocks push if linting fails (can auto-fix with `pnpm run lint:fix`)
- **Coverage**: Skipped locally (runs in CI/CD)

### commit-msg

- Enforces conventional commit format
- Examples: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Max 100 characters for subject line

## Bypassing Hooks

If you need to bypass hooks temporarily:

```bash
# Skip all hooks for one command
git commit --no-verify -m "emergency fix"
git push --no-verify

# Disable Husky completely
HUSKY=0 git commit -m "..."
```

## Common Issues

### TypeScript Errors

- The pre-push hook warns about TypeScript errors but allows you to push anyway
- These will still fail in CI/CD, so it's best to fix them
- Run `pnpm run typecheck` to see all errors

### Windows Compatibility

- The `common.sh` script includes fixes for Windows Git Bash
- If you have issues, make sure you're using Git Bash, not CMD

### Performance

- Pre-commit is fast (only staged files)
- Pre-push might take longer due to full project type checking
- Consider using `--no-verify` for WIP commits

## Updating Hooks

To modify hook behavior:

1. Edit the hook file in `.husky/`
2. Test with a commit/push
3. Commit the changes to share with team
