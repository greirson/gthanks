#!/bin/bash
# gthanks Health Check Script
#
# Verifies application health, database connectivity, disk space, and container status
#
# Usage:
#   ./scripts/health-check.sh                                    # Check localhost:3000
#   HEALTH_URL=https://gthanks.app/api/health ./scripts/health-check.sh  # Check production

set -e  # Exit on error

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
MAX_RETRIES="${MAX_RETRIES:-5}"
RETRY_DELAY="${RETRY_DELAY:-3}"
DISK_USAGE_WARNING_THRESHOLD=80
DISK_USAGE_CRITICAL_THRESHOLD=90

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 gthanks Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Endpoint:      $HEALTH_URL"
echo "Max Retries:   $MAX_RETRIES"
echo "Retry Delay:   ${RETRY_DELAY}s"
echo ""

# Function to check health endpoint
check_health() {
  # Make HTTP request and capture both response body and status code
  RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null || echo -e "\n000")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"

    # Pretty-print JSON if jq is available, otherwise show raw
    if command -v jq &> /dev/null; then
      echo "$BODY" | jq .
    else
      echo "$BODY"
    fi

    # Store body for later checks
    HEALTH_RESPONSE="$BODY"
    return 0
  elif [ "$HTTP_CODE" -eq 503 ]; then
    echo "❌ Service unavailable (HTTP $HTTP_CODE)"
    if command -v jq &> /dev/null; then
      echo "$BODY" | jq .
    else
      echo "$BODY"
    fi
    return 1
  elif [ "$HTTP_CODE" -eq 000 ]; then
    echo "❌ Connection failed (cannot reach endpoint)"
    return 1
  else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "$BODY"
    return 1
  fi
}

# Retry logic
HEALTH_SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES..."

  if check_health; then
    HEALTH_SUCCESS=true
    break
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "⏳ Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

if [ "$HEALTH_SUCCESS" = false ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Health check failed after $MAX_RETRIES attempts"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo ""

# Check database connectivity (from health response)
echo "📊 Additional Checks:"
echo ""

if command -v jq &> /dev/null && echo "$HEALTH_RESPONSE" | jq -e '.database == "connected"' > /dev/null 2>&1; then
  echo "✅ Database: connected"
elif echo "$HEALTH_RESPONSE" | grep -q '"database":"connected"'; then
  echo "✅ Database: connected"
else
  echo "⚠️  Database: status unknown or disconnected"
fi

# Check disk space (only for local deployments with data directory)
if [ -d "data/" ]; then
  DISK_USAGE=$(df -h data/ 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")

  if [ "$DISK_USAGE" -gt "$DISK_USAGE_CRITICAL_THRESHOLD" ]; then
    echo "❌ Disk usage: ${DISK_USAGE}% (CRITICAL - above ${DISK_USAGE_CRITICAL_THRESHOLD}%)"
    DISK_CHECK_FAILED=true
  elif [ "$DISK_USAGE" -gt "$DISK_USAGE_WARNING_THRESHOLD" ]; then
    echo "⚠️  Disk usage: ${DISK_USAGE}% (WARNING - above ${DISK_USAGE_WARNING_THRESHOLD}%)"
  elif [ "$DISK_USAGE" -gt 0 ]; then
    echo "✅ Disk usage: ${DISK_USAGE}%"
  fi
else
  echo "ℹ️  Disk check: skipped (no local data directory)"
fi

# Check container status (only if docker compose is available)
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
  RUNNING=$(docker compose ps -q 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RUNNING" -eq 0 ]; then
    echo "❌ Containers: none running"
    CONTAINER_CHECK_FAILED=true
  else
    echo "✅ Containers: $RUNNING running"

    # Show container names and status
    echo ""
    echo "   Container Status:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null | sed 's/^/   /'
  fi
else
  echo "ℹ️  Container check: skipped (not a Docker deployment)"
fi

echo ""

# Final result
if [ "${DISK_CHECK_FAILED:-false}" = true ] || [ "${CONTAINER_CHECK_FAILED:-false}" = true ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  Health check passed with warnings"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ All checks passed!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
