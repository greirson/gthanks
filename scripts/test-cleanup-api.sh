#!/bin/bash
# Test script for Expired Token Cleanup API Endpoint
#
# Usage:
#   1. Start the dev server: pnpm dev
#   2. In another terminal: bash scripts/test-cleanup-api.sh

set -e

echo "🧪 Testing Expired Token Cleanup API Endpoint"
echo ""

# Check if CRON_SECRET is set in environment
if [ -z "$CRON_SECRET" ]; then
  echo "⚠️  CRON_SECRET not set in environment"
  echo "Using test secret: test-secret-123"
  export CRON_SECRET="test-secret-123"
else
  echo "✅ CRON_SECRET found in environment"
fi

echo ""
echo "Test 1: Unauthorized request (no auth header)"
echo "Expected: 401 Unauthorized"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/cron/cleanup-tokens)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Test 1 passed: Unauthorized request blocked"
else
  echo "❌ Test 1 failed: Expected 401, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "Test 2: Unauthorized request (wrong secret)"
echo "Expected: 401 Unauthorized"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer wrong-secret" \
  http://localhost:3000/api/cron/cleanup-tokens)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Test 2 passed: Wrong secret rejected"
else
  echo "❌ Test 2 failed: Expected 401, got $HTTP_CODE"
  exit 1
fi

echo ""
echo "Test 3: Authorized request (correct secret)"
echo "Expected: 200 OK with cleanup results"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/cleanup-tokens)
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 3 passed: Authorized request succeeded"
  echo "Response body: $BODY"

  # Check if response contains expected fields
  if echo "$BODY" | grep -q "success" && echo "$BODY" | grep -q "deletedMagicLinks"; then
    echo "✅ Response contains expected fields"
  else
    echo "❌ Response missing expected fields"
    exit 1
  fi
else
  echo "❌ Test 3 failed: Expected 200, got $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

echo ""
echo "✅ All API tests passed!"
echo ""
echo "📋 Setup instructions for production:"
echo "   1. Add CRON_SECRET to Vercel environment variables"
echo "   2. Deploy with vercel.json cron configuration"
echo "   3. Vercel will automatically call /api/cron/cleanup-tokens daily at midnight UTC"
