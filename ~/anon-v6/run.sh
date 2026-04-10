#!/bin/bash
# Anon Bot Runner - Fully Automated
# Just run: bash run.sh

clear

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Kill existing processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}[i] Shutting down...${NC}"
    pkill -f "ssh.*serveo" 2>/dev/null
    pkill -f "ngrok" 2>/dev/null
    pkill -f "python app.py" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Anon Bot v6 - STARTER        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if already running
if pgrep -f "python app.py" > /dev/null; then
    echo -e "${RED}[!] Bot is already running!${NC}"
    echo -e "${YELLOW}[i] Stop it first or open a new session${NC}"
    exit 1
fi

# Check dependencies
if ! command -v python &> /dev/null; then
    echo -e "${RED}[!] Python not found!${NC}"
    echo -e "${YELLOW}[i] Run: bash install.sh${NC}"
    exit 1
fi

# Create temp directory
mkdir -p $PREFIX/tmp

# Get local IP for display
LOCAL_IP=$(ifconfig 2>/dev/null | grep -o 'inet [0-9.]*' | grep -v '127.0.0.1' | head -1 | cut -d' ' -f2)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
fi

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Setting up public access...       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

PUBLIC_URL=""
TUNNEL_TYPE=""

# Method 1: Try Ngrok first (if installed and configured)
if command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}[i] Checking Ngrok...${NC}"
    # Test if ngrok is configured
    ngrok http 8080 --log=stdout > $PREFIX/tmp/ngrok.log 2>&1 &
    sleep 4
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | grep -o 'https://[^"]*' | head -1)
    
    if [ ! -z "$NGROK_URL" ]; then
        PUBLIC_URL="$NGROK_URL"
        TUNNEL_TYPE="ngrok"
        echo -e "${GREEN}[✓] Ngrok tunnel active!${NC}"
    else
        # Kill ngrok if it didn't work
        pkill -f "ngrok" 2>/dev/null
    fi
fi

# Method 2: Try Serveo (works without any install)
if [ -z "$PUBLIC_URL" ]; then
    echo -e "${YELLOW}[i] Trying Serveo tunnel (no install needed)...${NC}"
    
    # Start Serveo tunnel
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ExitOnForwardFailure=yes -R 80:localhost:8080 serveo.net > $PREFIX/tmp/serveo.log 2>&1 &
    SSH_PID=$!
    
    # Wait for connection
    for i in {1..8}; do
        sleep 1
        SERVEO_URL=$(grep -o 'https://[a-z0-9-]*\.serveo\.net' $PREFIX/tmp/serveo.log 2>/dev/null | head -1)
        if [ ! -z "$SERVEO_URL" ]; then
            PUBLIC_URL="$SERVEO_URL"
            TUNNEL_TYPE="serveo"
            break
        fi
    done
    
    if [ ! -z "$PUBLIC_URL" ]; then
        echo -e "${GREEN}[✓] Serveo tunnel active!${NC}"
    else
        kill $SSH_PID 2>/dev/null
    fi
fi

# Display results
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✓ Bot is Ready!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

if [ ! -z "$PUBLIC_URL" ]; then
    echo -e "${CYAN}🌐 Public URL (share this):${NC}"
    echo -e "${GREEN}   $PUBLIC_URL${NC}"
    echo ""
    echo -e "${YELLOW}Tunnel type: $TUNNEL_TYPE${NC}"
else
    echo -e "${YELLOW}[!] Public tunnel failed${NC}"
    echo -e "${YELLOW}[i] You can still use local network:${NC}"
fi

echo ""
echo -e "${CYAN}📱 Local Access:${NC}"
echo -e "${GREEN}   http://localhost:8080${NC}"
echo -e "${GREEN}   http://$LOCAL_IP:8080${NC} (same WiFi)"
echo ""
echo -e "${YELLOW}Press CTRL+C to stop${NC}"
echo ""

# Start the Flask app
echo -e "${YELLOW}[i] Starting server...${NC}"
python app.py
