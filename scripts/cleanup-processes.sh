#!/bin/bash

# Enhanced cleanup script for development server processes
# This script aggressively kills all development-related processes to prevent port conflicts

echo "🧹 Cleaning up existing development processes..."

# Function to kill processes by pattern with verification
kill_processes_by_pattern() {
  local pattern="$1"
  local description="$2"

  if pgrep -f "$pattern" > /dev/null; then
    echo "🔄 Killing $description..."

    # Get PIDs and kill them
    local pids=$(ps aux | grep "$pattern" | grep -v grep | awk '{print $2}')
    if [ ! -z "$pids" ]; then
      echo "$pids" | xargs -r kill -9
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

# Verify ports are free (using alternative methods since fuser/lsof might not be available)
echo "🔍 Checking port availability..."

# Check if anything is listening on our ports using netstat alternative
check_port() {
  local port=$1
  # Try to connect to the port to see if it's in use
  if timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
    echo "⚠️  Port $port appears to be in use"
    return 1
  else
    echo "✅ Port $port is available"
    return 0
  fi
}

check_port 3001
check_port 5000

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
echo "✅ Enhanced process cleanup completed!"
echo "🚀 You can now run 'npm run dev' safely"
echo "💡 For best results, use 'npm run dev:clean' which runs this script automatically"