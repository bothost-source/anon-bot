#!/bin/bash
# Anon Bot Auto-Installer for Termux
# One-time setup - clones from GitHub and installs everything

clear

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Your GitHub repo (CHANGE THIS TO YOUR ACTUAL REPO)
GITHUB_REPO="https://github.com/bothost-source/loner-bantool.git"
REPO_NAME="loner-bantool"

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

echo -e "${YELLOW}[i] Installing Git...${NC}"
pkg install git -y

echo -e "${YELLOW}[i] Installing Python...${NC}"
pkg install python -y

echo -e "${YELLOW}[i] Installing OpenSSH (for tunnel)...${NC}"
pkg install openssh -y

echo -e "${YELLOW}[i] Creating necessary directories...${NC}"
mkdir -p $PREFIX/tmp
mkdir -p $PREFIX/var/log

# Clone the repository
echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    Downloading Anon Bot from GitHub    ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

if [ -d "$REPO_NAME" ]; then
    echo -e "${YELLOW}[i] Folder '$REPO_NAME' already exists${NC}"
    echo -e "${YELLOW}[i] Updating to latest version...${NC}"
    cd $REPO_NAME
    git pull
else
    echo -e "${YELLOW}[i] Cloning from: $GITHUB_REPO${NC}"
    git clone $GITHUB_REPO
    cd $REPO_NAME
fi

echo ""
echo -e "${YELLOW}[i] Installing Python packages...${NC}"
pip install flask requests

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
echo -e "${CYAN}📁 Installed in: $(pwd)${NC}"
echo ""
echo -e "${YELLOW}To start your bot, run:${NC}"
echo -e "${GREEN}   cd $REPO_NAME${NC}"
echo -e "${GREEN}   bash run.sh${NC}"
echo ""
echo -e "${YELLOW}Optional - For better public URLs:${NC}"
echo -e "   1. Get free token from: ${GREEN}ngrok.com${NC}"
echo -e "   2. Run: ${GREEN}pkg install ngrok${NC}"
echo -e "   3. Run: ${GREEN}ngrok config add-authtoken <your-token>${NC}"
echo ""
