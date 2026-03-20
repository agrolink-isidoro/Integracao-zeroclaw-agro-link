#!/bin/bash
# Test weather API endpoints

BASE_URL="http://localhost:8001"
ADMIN_USER="admin"
ADMIN_PASS="admin123"

echo "🔐 Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}")

echo "Response: $TOKEN_RESPONSE"

# Extract token if available
ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token"
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."

echo ""
echo "📋 Testing weather endpoints..."
echo ""

# Test 1: Get all weather forecasts
echo "1️⃣  GET /api/agricultura-weather/weather-forecasts/"
curl -s -X GET "${BASE_URL}/api/agricultura-weather/weather-forecasts/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | head -c 200
echo ""
echo ""

# Test 2: Get active alerts
echo "2️⃣  GET /api/agricultura-weather/weather-alerts/"
curl -s -X GET "${BASE_URL}/api/agricultura-weather/weather-alerts/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | head -c 200
echo ""
echo ""

echo "✅ API tests completed!"
