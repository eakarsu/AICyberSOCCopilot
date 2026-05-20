#!/bin/bash

set -e

# Always run from the script's own directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AI CyberSOC Copilot - Security Ops Platform    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Load env from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^[A-Z_]+=' | xargs)
fi

# Fallback for OpenRouter creds from canonical source
if [ -z "$OPENROUTER_API_KEY" ] && [ -f "/Users/erolakarsu/projects/beauty-wellness-ai/.env" ]; then
  echo -e "${YELLOW}Loading OpenRouter creds from canonical source...${NC}"
  CANON_KEY=$(grep -E '^OPENROUTER_API_KEY=' /Users/erolakarsu/projects/beauty-wellness-ai/.env | cut -d= -f2-)
  CANON_MODEL=$(grep -E '^OPENROUTER_MODEL=' /Users/erolakarsu/projects/beauty-wellness-ai/.env | cut -d= -f2- | tr -d '"')
  export OPENROUTER_API_KEY="$CANON_KEY"
  export OPENROUTER_MODEL="${OPENROUTER_MODEL:-$CANON_MODEL}"
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports — and any nodemon/react-scripts parents for THIS
# app, otherwise a respawned child instantly re-grabs the port before we start.
echo -e "${YELLOW}Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
# 1) kill nodemon / react-scripts parents scoped to this app's path
pkill -9 -f "AICyberSOCCopilot/backend.*nodemon"        2>/dev/null || true
pkill -9 -f "AICyberSOCCopilot/backend.*server\.js"     2>/dev/null || true
pkill -9 -f "AICyberSOCCopilot/frontend.*react-scripts" 2>/dev/null || true
# 2) then kill whatever's still listening on the ports
lsof -ti:$BACKEND_PORT  2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
# 3) wait until both ports are actually free (max ~6s)
for _ in 1 2 3 4 5 6; do
  if ! lsof -i:$BACKEND_PORT -i:$FRONTEND_PORT 2>/dev/null | grep -q LISTEN; then break; fi
  sleep 1
done
echo -e "${GREEN}✓ Ports cleaned${NC}"

# Check PostgreSQL
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}PostgreSQL is not installed. Please install it first.${NC}"
  exit 1
fi

if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
  echo -e "${YELLOW}Starting PostgreSQL...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  else
    sudo systemctl start postgresql 2>/dev/null || true
  fi
  sleep 2
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Create database if not exists
echo -e "${YELLOW}Setting up database...${NC}"
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME:-ai_cyber_soc}'" 2>/dev/null | grep -q 1 || \
  psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -c "CREATE DATABASE ${DB_NAME:-ai_cyber_soc}" 2>/dev/null || \
  createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-ai_cyber_soc} 2>/dev/null || true
echo -e "${GREEN}✓ Database ready${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
( cd "$SCRIPT_DIR/backend"  && npm install --silent 2>/dev/null )
( cd "$SCRIPT_DIR/frontend" && npm install --silent 2>/dev/null )
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Seed database
echo -e "${YELLOW}Seeding database...${NC}"
( cd "$SCRIPT_DIR/backend" && node seed/seed.js )
echo -e "${GREEN}✓ Database seeded${NC}"

# Start backend with nodemon (auto-reload)
echo -e "${BLUE}Starting backend on port $BACKEND_PORT...${NC}"
( cd "$SCRIPT_DIR/backend" && npx nodemon server.js ) &
BACKEND_PID=$!

sleep 2

# Start frontend (React dev server auto-reloads)
echo -e "${BLUE}Starting frontend on port $FRONTEND_PORT...${NC}"
( cd "$SCRIPT_DIR/frontend" && BROWSER=none PORT=$FRONTEND_PORT npm start ) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is starting...                      ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:$FRONTEND_PORT              ║${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:$BACKEND_PORT              ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║  Both servers auto-reload on file changes        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Trap to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Shutdown complete${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait
