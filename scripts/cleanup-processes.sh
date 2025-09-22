#!/bin/bash

# Cleanup script for development server processes
# This script kills any existing Node.js/npm processes to prevent port conflicts

echo "🧹 Cleaning up existing development processes..."

# Kill any existing npm processes
if pgrep -f "npm.*dev" > /dev/null; then
  echo "🔄 Killing existing npm dev processes..."
  pkill -f "npm.*dev"
  sleep 2
fi

# Kill any Node.js processes running server/index.ts
if pgrep -f "node.*server/index.ts" > /dev/null; then
  echo "🔄 Killing existing Node.js server processes..."
  pkill -f "node.*server/index.ts"
  sleep 2
fi

# Kill any tsx processes running server/index.ts
if pgrep -f "tsx.*server/index.ts" > /dev/null; then
  echo "🔄 Killing existing tsx server processes..."
  pkill -f "tsx.*server/index.ts"
  sleep 2
fi

# Check if port 3001 is still in use and kill the process
if fuser 3001/tcp >/dev/null 2>&1; then
  echo "🔄 Port 3001 is still in use, killing process..."
  fuser -k 3001/tcp >/dev/null 2>&1
  sleep 1
fi

# Check if port 5000 is still in use and kill the process
if fuser 5000/tcp >/dev/null 2>&1; then
  echo "🔄 Port 5000 is still in use, killing process..."
  fuser -k 5000/tcp >/dev/null 2>&1
  sleep 1
fi

echo "✅ Process cleanup completed!"
echo "🚀 You can now run 'npm run dev' safely"