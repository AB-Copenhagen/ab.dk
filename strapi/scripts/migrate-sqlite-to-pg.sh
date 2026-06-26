#!/usr/bin/env bash
# migrate-sqlite-to-pg.sh — Export data from SQLite and re-import into Supabase PostgreSQL
#
# Run this ONCE when switching from SQLite to Supabase.
# Prerequisites:
#   • Strapi is stopped
#   • DATABASE_URL is set in strapi/.env (Supabase connection string)
#   • Node 20 is active (nvm use 20)
#
# Usage (from project root):
#   bash strapi/scripts/migrate-sqlite-to-pg.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STRAPI_DIR="$SCRIPT_DIR/.."       # strapi/
PROJECT_ROOT="$STRAPI_DIR/.."     # ab.dk/

echo "=== Step 1: Export all data from SQLite ==="
# Must cd into strapi/ so Strapi finds its config files
cd "$STRAPI_DIR"
DATABASE_CLIENT=sqlite npx strapi export \
  --no-encrypt \
  --file "$PROJECT_ROOT/strapi-export"

echo ""
echo "=== Step 2: DATABASE_URL is already set to Supabase in strapi/.env ==="
echo "Press Enter to continue and bootstrap the PostgreSQL schema."
read -r

echo ""
echo "=== Step 3: Bootstrap schema on PostgreSQL (Strapi runs migrations) ==="
echo "Starting Strapi — press Ctrl+C once you see 'Server started'."
yarn develop &
STRAPI_PID=$!
echo "Waiting for Strapi to finish migrations (up to 120s)..."
sleep 120
kill $STRAPI_PID 2>/dev/null || true

echo ""
echo "=== Step 4: Import data into PostgreSQL ==="
npx strapi import \
  --file "$PROJECT_ROOT/strapi-export.tar.gz" \
  --force-yes

echo ""
echo "Done. Remove the export file when you're satisfied:"
echo "  rm strapi-export.tar.gz"
