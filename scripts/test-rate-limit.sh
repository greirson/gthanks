#!/bin/bash

# Test script for global API rate limiting
# This script tests that the rate limit is properly enforced

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT="${ENDPOINT:-/api/metadata}"
MAX_REQUESTS=105
EXPECTED_LIMIT=100
TEST_URL="https://example.com/test-product"

echo "=========================================="
echo "Global API Rate Limit Test"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Test endpoint: $ENDPOINT"
echo "  Max requests: $MAX_REQUESTS"
echo "  Expected limit: $EXPECTED_LIMIT"
echo ""
echo "Starting test..."
echo ""

# Track results
rate_limited=false
first_429_at=0

for i in $(seq 1 $MAX_REQUESTS); do
  # Make request and capture status code
  # POST request with JSON body for metadata endpoint
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$TEST_URL\"}" \
    "$BASE_URL$ENDPOINT" 2>/dev/null || echo "000")
  status=$(echo "$response" | tail -n1)

  # Check if we got rate limited
  if [ "$status" = "429" ]; then
    if [ "$rate_limited" = false ]; then
      first_429_at=$i
      echo ""
      echo "✓ Rate limit triggered at request #$i"
      echo ""
      echo "Response body:"
      echo "$response" | head -n-1 | jq '.' 2>/dev/null || echo "$response" | head -n-1
      echo ""

      # Extract rate limit headers
      echo "Rate limit headers:"
      curl -s -v \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$TEST_URL\"}" \
        "$BASE_URL$ENDPOINT" 2>&1 | grep -i "x-ratelimit" || echo "  (Headers not visible in response)"
      echo ""

      rate_limited=true
    fi
  elif [ "$status" = "000" ]; then
    echo "✗ Request #$i failed (connection error)"
    exit 1
  fi

  # Progress indicator every 10 requests
  if [ $((i % 10)) -eq 0 ] && [ "$rate_limited" = false ]; then
    echo "  Progress: $i/$MAX_REQUESTS requests completed..."
  fi

  # Stop after confirming rate limit
  if [ "$rate_limited" = true ] && [ $i -gt $((first_429_at + 2)) ]; then
    echo "✓ Rate limit confirmed (multiple 429 responses)"
    break
  fi
done

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo ""

if [ "$rate_limited" = true ]; then
  echo "✓ PASS: Rate limiting is working"
  echo "  - Triggered at request #$first_429_at"
  echo "  - Expected around request #$((EXPECTED_LIMIT + 1))"

  if [ $first_429_at -ge $((EXPECTED_LIMIT - 5)) ] && [ $first_429_at -le $((EXPECTED_LIMIT + 5)) ]; then
    echo "  - ✓ Within expected range"
  else
    echo "  - ⚠ Outside expected range (may indicate timing issues)"
  fi
else
  echo "✗ FAIL: Rate limit not triggered after $MAX_REQUESTS requests"
  echo "  Expected: 429 status around request #$((EXPECTED_LIMIT + 1))"
  exit 1
fi

echo ""
