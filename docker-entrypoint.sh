#!/bin/sh
set -e

# Push Prisma schema to database (creates tables if they don't exist)
echo "Syncing database schema..."
npx prisma db push --skip-generate || true

# Start the Node.js server, binding to 0.0.0.0
echo "Starting Next.js server on 0.0.0.0:${PORT:-3082}"
export HOST=0.0.0.0

exec node server.js
