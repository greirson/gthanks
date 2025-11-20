#!/bin/bash

# Test rate limiting for expensive endpoints
# Usage: ./scripts/test-rate-limit-endpoints.sh

BASE_URL=${BASE_URL:-http://localhost:3000}

echo "Testing rate limiting for expensive endpoints"
echo "=============================================="
echo ""

# Test 1: Metadata extraction (5 req/min per IP)
echo "Test 1: Metadata extraction endpoint (/api/metadata)"
echo "------------------------------------------------------"
echo "Limit: 5 requests per minute per IP"
echo ""

for i in {1..7}; do
  echo -n "Request $i: "
  RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/response.json \
    -X POST "$BASE_URL/api/metadata" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}')

  HTTP_CODE=$(echo "$RESPONSE" | tail -c 4)

  if [ "$HTTP_CODE" = "429" ]; then
    echo "Rate limited (429) ✓"
    RETRY_AFTER=$(cat /tmp/response.json | grep -o '"retryAfter":[0-9]*' | cut -d: -f2)
    echo "  Retry after: ${RETRY_AFTER}s"
    break
  elif [ "$HTTP_CODE" = "200" ]; then
    echo "Success (200)"
  else
    echo "Unexpected status: $HTTP_CODE"
    cat /tmp/response.json
  fi

  sleep 0.5
done

echo ""
echo "Test 2: Image upload endpoint (/api/upload/image)"
echo "--------------------------------------------------"
echo "Limit: 10 requests per hour per user (requires authentication)"
echo "Note: Cannot test without valid authentication token"
echo "Manual test required after starting dev server"
echo ""

echo "Test 3: Reservation endpoint (/api/reservations)"
echo "-------------------------------------------------"
echo "Limit: 10 requests per minute per IP (already configured)"
echo "Note: This endpoint already had rate limiting configured"
echo ""

# Cleanup
rm -f /tmp/response.json

echo ""
echo "Rate limiting tests complete!"
echo ""
echo "To test image uploads:"
echo "1. Start dev server: pnpm dev"
echo "2. Login to the app"
echo "3. Upload 11 images within 1 hour"
echo "4. 11th request should return 429"
