#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════╗"
echo "║         anon V6 - STARTER          ║"
echo "╚════════════════════════════════════╝"
echo -e "${NC}"

# Check dependencies
if ! command -v python &> /dev/null; then
    echo -e "${RED}[✗] Python not found. Install: pkg install python${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[✗] Node.js not found. Install: pkg install nodejs${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[i] Installing Node.js packages...${NC}"
    npm install
fi

if ! pip show flask &> /dev/null; then
    echo -e "${YELLOW}[i] Installing Flask...${NC}"
    pip install flask
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       CHOOSE TUNNEL METHOD         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""
echo "1) Serveo (Recommended - No install needed)"
echo "2) Ngrok (Requires auth token)"
echo "3) Local only (No public URL)"
echo ""

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo -e "${YELLOW}[i] Starting Serveo tunnel...${NC}"
        echo -e "${YELLOW}[i] This will create a public URL for worldwide access${NC}"
        echo ""
        
        # Start serveo in background
        ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 serveo.net > /tmp/serveo.log 2>&1 &
        SERVEO_PID=$!
        
        # Wait for URL
        sleep 8
        
        # Extract URL from log
        URL=$(grep -o 'https://[a-z0-9]*-serveousercontent.com' /tmp/serveo.log | head -n 1)
        
        if [ ! -z "$URL" ]; then
            echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║  PUBLIC URL (Share worldwide):     ║${NC}"
            echo -e "${GREEN}║                                    ║${NC}"
            echo -e "${GREEN}║  ${URL}           ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
            echo ""
        else
            echo -e "${YELLOW}[!] URL not ready yet. Check /tmp/serveo.log${NC}"
        fi
        
        echo -e "${YELLOW}[i] Starting server...${NC}"
        python app.py
        
        # Cleanup
        kill $SERVEO_PID 2>/dev/null
        ;;
        
    2)
        if ! command -v ngrok &> /dev/null; then
            echo -e "${RED}[✗] Ngrok not installed${NC}"
            echo -e "${YELLOW}[i] Download: wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-arm.zip${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}[i] Starting Ngrok...${NC}"
        ngrok http 8080 > /dev/null 2>&1 &
        NGROK_PID=$!
        
        sleep 4
        
        URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4)
        
        if [ ! -z "$URL" ]; then
            echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
            echo -e "${GREEN}║  PUBLIC URL: ${URL}           ║${NC}"
            echo -e "${GREEN}╚════════════════════════════════════╝${NC}"
            echo ""
        fi
        
        python app.py
        kill $NGROK_PID 2>/dev/null
        ;;
        
    3)
        echo -e "${YELLOW}[i] Local mode - Only accessible on this device${NC}"
        echo -e "${GREEN}[i] Open: http://localhost:8080${NC}"
        echo ""
        python app.py
        ;;
        
    *)
        echo -e "${RED}[✗] Invalid choice${NC}"
        exit 1
        ;;
esac
