#!/bin/sh

# Common utilities for Husky hooks

# Fix for Windows compatibility
command_exists () {
  command -v "$1" >/dev/null 2>&1
}

# Workaround for Windows 10, Git Bash, and pnpm/yarn
if command_exists winpty && test -t 1; then
  exec < /dev/tty
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_error() {
  echo "${RED}❌ $1${NC}"
}

print_success() {
  echo "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo "${YELLOW}⚠️  $1${NC}"
}