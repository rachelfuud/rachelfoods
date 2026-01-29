#!/bin/bash

# CMS Migration Runner Script
# This script triggers the CMS migration via the admin API endpoint

# Configuration
API_URL="${API_URL:-https://your-backend-url.railway.app}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@rachelfoods.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

echo "🔐 Logging in as admin..."

# Login and get JWT token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login successful!"
echo ""
echo "🚀 Running CMS migration..."

# Trigger migration
MIGRATION_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/migrations/run-cms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo $MIGRATION_RESPONSE | python3 -m json.tool 2>/dev/null || echo $MIGRATION_RESPONSE

# Check if successful
if echo $MIGRATION_RESPONSE | grep -q '"success":true'; then
  echo ""
  echo "✅ CMS migration completed successfully!"
  exit 0
else
  echo ""
  echo "❌ CMS migration failed!"
  exit 1
fi
