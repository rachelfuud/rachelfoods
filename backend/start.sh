#!/bin/sh

# Railway startup script for backend
# This runs before the application starts

echo "🔍 Running pre-startup tasks..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run CMS migration
echo "🚀 Running CMS migration..."
npx ts-node scripts/auto-migrate-cms.ts || echo "⚠️ Migration skipped or failed (may already exist)"

# Start the application
echo "✅ Starting application..."
npm run start:prod
