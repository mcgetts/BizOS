#!/bin/bash

# Enhanced cleanup script for development server processes
# This script aggressively kills all development-related processes to prevent port conflicts

echo "🧹 Cleaning up existing development processes..."

# Detect environment
IS_REPLIT=${REPL_ID:+true}
IS_REPLIT=${REPLIT_ENV:-$IS_REPLIT}

if [ "$IS_REPLIT" = "true" ]; then
    echo "🔧 Replit environment detected - using gentle cleanup to avoid conflicts"
else
    echo "🔧 Local development environment - using aggressive cleanup"
fi

# Function to kill processes by pattern with verification
kill_processes_by_pattern() {
  local pattern="$1"
  local description="$2"

  if pgrep -f "$pattern" > /dev/null; then
    echo "🔄 Killing $description..."

    # Get PIDs and kill them
    local pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
    if [ ! -z "$pids" ]; then
      # In Replit, use gentler SIGTERM first, then SIGKILL if necessary
      if [ "$IS_REPLIT" = "true" ]; then
        echo "$pids" | xargs -r kill -TERM 2>/dev/null || true
        sleep 3
        # Check if still running, then use SIGKILL
        if pgrep -f "$pattern" > /dev/null; then
          echo "$pids" | xargs -r kill -9 2>/dev/null || true
        fi
      else
        echo "$pids" | xargs -r kill -9
      fi

      sleep 2

      # Verify they're dead
      if pgrep -f "$pattern" > /dev/null; then
        echo "⚠️  Some $description may still be running"
        ps aux | grep "$pattern" | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13}'
      else
        echo "✅ All $description terminated"
      fi
    fi
  else
    echo "✅ No $description found"
  fi
}

# Kill processes by specific patterns
kill_processes_by_pattern "npm.*dev" "npm dev processes"
kill_processes_by_pattern "tsx.*server/index.ts" "tsx server processes"
kill_processes_by_pattern "node.*server/index.ts" "Node.js server processes"
kill_processes_by_pattern "tsx server/index.ts" "tsx server processes (alt pattern)"

# Additional cleanup for any remaining Node.js processes with our patterns
echo "🔄 Additional cleanup of Node.js processes..."
ps aux | grep -E "(node.*tsx.*server|node.*--require.*tsx)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
sleep 1

# Kill processes by port if available tools exist
echo "🔄 Killing processes by port..."
if command -v lsof >/dev/null 2>&1; then
  # Kill anything on ports 3001 and 5000
  for port in 3001 5000; do
    pids=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
      echo "🔄 Killing processes on port $port..."
      echo "$pids" | xargs -r kill -9 2>/dev/null
    fi
  done
elif command -v fuser >/dev/null 2>&1; then
  # Alternative using fuser
  fuser -k 3001/tcp 5000/tcp 2>/dev/null || true
fi

# Verify ports are free (using alternative methods since fuser/lsof might not be available)
echo "🔍 Checking port availability..."

# Check if anything is listening on our ports using netstat alternative
check_port() {
  local port=$1
  local description=$2
  # Try to connect to the port to see if it's in use
  if timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
    echo "⚠️  Port $port ($description) appears to be in use"
    return 1
  else
    echo "✅ Port $port ($description) is available"
    return 0
  fi
}

check_port 3001 "development"
check_port 5000 "legacy/fallback"

# Final verification - check for any remaining development processes
echo "🔍 Final process verification..."
remaining=$(ps aux | grep -E "(npm.*dev|tsx.*server|node.*server/index.ts)" | grep -v grep | wc -l)
if [ "$remaining" -gt 0 ]; then
  echo "⚠️  Warning: $remaining development processes may still be running:"
  ps aux | grep -E "(npm.*dev|tsx.*server|node.*server/index.ts)" | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13}'
  echo "🔄 Attempting final cleanup..."
  ps aux | grep -E "(npm.*dev|tsx.*server|node.*server/index.ts)" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
  sleep 1
else
  echo "✅ No development processes detected"
fi

echo ""
echo "🔄 Clearing Node.js cache and build artifacts..."
rm -rf node_modules/.cache dist .tsx_cache 2>/dev/null || true
rm -f .server.lock 2>/dev/null || true
echo "✅ Cache and lock files cleared"

echo ""
echo "✅ Enhanced process cleanup completed!"
echo "🚀 You can now run 'npm run dev' safely"
echo "💡 For best results, use 'npm run dev:clean' which runs this script automatically"