#!/bin/bash

# Run ESLint and capture output
echo "Checking for ESLint errors..."
OUTPUT=$(pnpm run lint 2>&1)
EXIT_CODE=$?

# Check if there are any errors in the output
if echo "$OUTPUT" | grep -q "Error:"; then
  echo "❌ ESLint errors found:"
  echo "$OUTPUT" | grep "Error:" | head -10
  echo ""
  echo "Please fix these errors before pushing."
  exit 1
fi

# If we got here, there are no errors (only warnings or success)
echo "✅ No ESLint errors found"
exit 0