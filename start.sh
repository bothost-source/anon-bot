#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════╗"
echo "║         anon V6 - STARTER          ║"
echo "╚════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[✗] Node.js not found. Install with: pkg install nodejs${NC}"
    exit 1
fi

# Check Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}[✗] Python not found. Install with: pkg install python${NC}"
    exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[i] Installing Node.js dependencies...${NC}"
    npm install
fi

if ! pip show flask &> /dev/null; then
    echo -e "${YELLOW}[i] Installing Flask...${NC}"
    pip install flask
fi

# Start
echo -e "${GREEN}[✓] Starting anon V6...${NC}"
echo -e "${YELLOW}[i] Open browser: http://localhost:8080${NC}"
echo ""

python app.py
