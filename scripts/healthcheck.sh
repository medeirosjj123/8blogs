#!/bin/bash

echo "🏥 Tatame Platform Health Check"
echo "================================"

# Check API
echo -n "API (port 3001): "
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Running"
    API_STATUS=$(curl -s http://localhost:3001/health | jq -r '.status')
    DB_STATUS=$(curl -s http://localhost:3001/health | jq -r '.database')
    echo "  - Status: $API_STATUS"
    echo "  - Database: $DB_STATUS"
else
    echo "❌ Not responding"
fi

# Check Frontend
echo -n "Frontend (port 5173): "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Running"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "✅ Running on port 5174"
else
    echo "❌ Not responding"
fi

echo ""
echo "📝 Quick Commands:"
echo "  - Start services: pnpm dev"
echo "  - Run tests: pnpm test"
echo "  - Run E2E tests: pnpm test:e2e"
echo ""
echo "🔑 Login Credentials:"
echo "  - Admin: admin@tatame.com / admin123"
echo "  - User: user@tatame.com / user123"