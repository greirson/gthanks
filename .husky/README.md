# Husky Git Hooks

This directory contains Git hooks managed by Husky v9 to maintain code quality.

## Hooks Overview

### pre-commit

**Enforced Checks (Blocking):**

1. **lint-staged** - Auto-fixes formatting and lint issues on changed files
2. **TypeScript type check** - Blocks commit if any type errors exist
3. **ESLint** - Blocks commit if any lint errors exist

**Why TypeScript and ESLint are blocking:**

- Prevents broken code from entering the repository
- Catches errors early (before CI/CD)
- Ensures code quality standards are met
- Faster feedback loop for developers

**Performance:**

- Lint-staged: Fast (only processes staged files)
- TypeScript: ~2-5 seconds (incremental build)
- ESLint: ~2-5 seconds

### pre-push

- **Type checking**: Warns about TypeScript errors but allows override
- **Linting**: Blocks push if linting fails (can auto-fix with `pnpm run lint:fix`)
- **Coverage**: Skipped locally (runs in CI/CD)

### commit-msg

- Enforces conventional commit format
- Examples: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Max 100 characters for subject line

## Bypassing Hooks

**Emergency Use Only:**

```bash
# Skip all hooks for one command (emergency fixes only)
git commit --no-verify -m "hotfix: critical production fix"
git push --no-verify

# Disable Husky completely
HUSKY=0 git commit -m "..."
```

**Important:**

- You must still fix the errors before creating a PR
- CI/CD will catch any issues you bypass locally
- Use `--no-verify` only for genuine emergencies (hotfixes, deployment blockers)

## Common Issues

### TypeScript Errors

**Symptom:** Pre-commit hook blocks your commit with type errors

**Solution:**

```bash
# See all type errors
pnpm typecheck

# Fix each error manually
# Common issues:
# - Missing type annotations
# - Type mismatches
# - Import errors
```

### ESLint Errors

**Symptom:** Pre-commit hook blocks your commit with lint errors

**Solution:**

```bash
# Auto-fix issues
pnpm lint:fix

# Check remaining issues
pnpm lint

# Common issues:
# - Unused variables
# - Missing dependencies in useEffect
# - Service layer violations
```

### Pre-Commit Hook Too Slow

**Symptom:** Hook takes > 10 seconds

**Possible Causes:**

- Large number of staged files
- Complex type dependencies
- Slow disk I/O

**Solutions:**

```bash
# Commit smaller batches of files
git add src/components/MyComponent.tsx
git commit -m "feat: add MyComponent"

# For WIP commits (not recommended)
git commit --no-verify -m "wip: work in progress"
```

### Windows Compatibility

- The `common.sh` script includes fixes for Windows Git Bash
- If you have issues, make sure you're using Git Bash, not CMD

## Workflow Example

**Normal workflow (no errors):**

```bash
git add .
git commit -m "feat: add wish templates"
# 🔍 Running pre-commit checks...
# 📝 Auto-fixing changed files with lint-staged...
# 🔎 Running TypeScript type check...
# 🔧 Running ESLint...
# ✅ All pre-commit checks passed!
```

**Workflow with errors:**

```bash
git add .
git commit -m "feat: add wish templates"
# 🔍 Running pre-commit checks...
# 📝 Auto-fixing changed files with lint-staged...
# 🔎 Running TypeScript type check...
# ❌ TypeScript errors found. Please fix them before committing.
# 💡 To bypass this check (emergency only): git commit --no-verify

# Fix the errors
pnpm typecheck  # See errors
# Fix each error manually

# Try again
git commit -m "feat: add wish templates"
# ✅ All pre-commit checks passed!
```

## Updating Hooks

To modify hook behavior:

1. Edit the hook file in `.husky/`
2. Test with a commit/push
3. Commit the changes to share with team

## Pre-Commit Hook Details

The pre-commit hook runs these checks in order:

1. **lint-staged** - Auto-fixes formatting/style issues
   - Runs Prettier on all files
   - Runs ESLint --fix on JS/TS files
   - Fast (only staged files)

2. **TypeScript** - Type checking
   - Runs `pnpm typecheck` (full project)
   - Catches type errors in changed files
   - Also catches errors in files that depend on changed code
   - Blocks commit if any errors found

3. **ESLint** - Linting
   - Runs `pnpm lint` (full project)
   - Catches lint errors (unused vars, missing deps, etc.)
   - Blocks commit if any errors found
   - Warnings are allowed (only errors block)

## Best Practices

1. **Run checks before committing:**

   ```bash
   pnpm lint        # Check for lint errors
   pnpm typecheck   # Check for type errors
   ```

2. **Fix errors incrementally:**
   - Don't accumulate errors across multiple files
   - Fix errors as soon as they appear
   - Run `pnpm lint:fix` frequently

3. **Use meaningful commit messages:**

   ```bash
   git commit -m "feat: add wish template system"
   git commit -m "fix: resolve TypeScript errors in wish service"
   ```

4. **Don't bypass checks casually:**
   - `--no-verify` is for emergencies only
   - You'll still need to fix errors before PR
   - CI/CD will catch bypassed errors

## FAQ

**Q: Why do TypeScript/ESLint run on the full project, not just staged files?**
A: Changed files may introduce errors in other files that depend on them. Full project checks catch these.

**Q: Can I disable the pre-commit hook?**
A: Not recommended. Use `git commit --no-verify` for genuine emergencies only.

**Q: The hook is too slow. Can I speed it up?**
A: TypeScript uses incremental builds and should be fast (2-5s). If slower, check for large node_modules or slow disk I/O.

**Q: What if I have a lot of existing errors?**
A: Fix them incrementally. The hook prevents new errors from being added.
