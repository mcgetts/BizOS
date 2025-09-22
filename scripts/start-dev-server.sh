#!/bin/bash

# Smart development server startup script
# This script ensures clean startup with port conflict prevention

echo "🚀 Starting development server with conflict prevention..."

# Default port
DEFAULT_PORT=3001
PORT=${PORT:-$DEFAULT_PORT}

# Function to check if a port is available
is_port_available() {
  local port=$1
  if timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
    return 1  # Port is in use
  else
    return 0  # Port is available
  fi
}

# Function to find an available port
find_available_port() {
  local start_port=$1
  local max_attempts=10

  for ((i=0; i<max_attempts; i++)); do
    local test_port=$((start_port + i))
    if is_port_available $test_port; then
      echo $test_port
      return 0
    fi
  done

  return 1  # No available port found
}

# First, run cleanup
echo "🧹 Running cleanup script..."
bash "$(dirname "$0")/cleanup-processes.sh"

echo ""
echo "🔍 Checking port availability..."

# Check if the desired port is available
if is_port_available $PORT; then
  echo "✅ Port $PORT is available"
else
  echo "⚠️  Port $PORT is in use, finding alternative..."
  AVAILABLE_PORT=$(find_available_port $PORT)

  if [ $? -eq 0 ]; then
    echo "✅ Found available port: $AVAILABLE_PORT"
    PORT=$AVAILABLE_PORT
  else
    echo "❌ Could not find an available port starting from $PORT"
    echo "💡 Try running the cleanup script manually: bash scripts/cleanup-processes.sh"
    exit 1
  fi
fi

# Set the PORT environment variable and start the server
echo ""
echo "🌟 Starting development server on port $PORT..."
echo "🌐 Application will be available at: http://localhost:$PORT"
echo ""

# Export the port and start the server
export PORT=$PORT
exec npm run dev