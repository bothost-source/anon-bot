#!/bin/bash
# Anon Bot Auto-Installer for Termux
# One-time setup - run this first

clear

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Anon Bot Auto-Installer         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running in Termux
if [ -z "$PREFIX" ]; then
    echo -e "${RED}[!] This script is designed for Termux${NC}"
    echo -e "${YELLOW}[i] Please install Termux from F-Droid${NC}"
    exit 1
fi

echo -e "${YELLOW}[i] Updating packages...${NC}"
pkg update -y

echo -e "${YELLOW}[i] Installing Python...${NC}"
pkg install python -y

echo -e "${YELLOW}[i] Installing OpenSSH (for tunnel)...${NC}"
pkg install openssh -y

echo -e "${YELLOW}[i] Installing required Python packages...${NC}"
pip install flask requests

echo -e "${YELLOW}[i] Creating necessary directories...${NC}"
mkdir -p $PREFIX/tmp
mkdir -p $PREFIX/var/log

# Make scripts executable
if [ -f "run.sh" ]; then
    chmod +x run.sh
    echo -e "${GREEN}[✓] run.sh made executable${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ Installation Complete!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}To start your bot, run:${NC}"
echo -e "${GREEN}   bash run.sh${NC}"
echo ""
echo -e "${YELLOW}Optional - For better public URLs:${NC}"
echo -e "   1. Get free token from: ${GREEN}ngrok.com${NC}"
echo -e "   2. Run: ${GREEN}pkg install ngrok${NC}"
echo -e "   3. Run: ${GREEN}ngrok config add-authtoken <your-token>${NC}"
echo ""
