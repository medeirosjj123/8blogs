#!/bin/bash

# Kill any existing processes on our ports
echo "🔧 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

# Wait a moment for ports to be released
sleep 2

# Start the development servers
echo "🚀 Starting Tatame development servers..."
echo "📡 API will run on http://localhost:3001"
echo "🌐 Frontend will run on http://localhost:5173 or 5174"
echo ""

# Run pnpm dev
pnpm dev