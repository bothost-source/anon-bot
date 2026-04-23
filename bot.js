const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers,
    delay
} = require("@whiskeysockets/baileys"); 
const pino = require("pino");
const sharp = require("sharp");
const fs = require("fs");
const sessionPath = './session_new';
let sock = null;
let isShuttingDown = false;

async function getSharpBuffer(path) {
    return await sharp(path)
        .resize(640, 640, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toBuffer();
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

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
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("[✓] Bot connected and online!");
            
            // Update profile status
            try {
                await sock.updateProfileStatus("ψ ☠︎︎ ANON BOT ONLINE ☠︎︎ ψ");
                console.log("[✓] Status updated");
            } catch (e) {
                console.log("[✗] Status update failed:", e.message);
            }
            
            // Update profile picture
            try {
                const localImagePath = './lure.jpg';
                if (fs.existsSync(localImagePath)) {
                    const buffer = await getSharpBuffer(localImagePath);
                    const jid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    await sock.updateProfilePicture(jid, buffer);
                    console.log("[✓] Profile picture updated");
                }
            } catch (e) {
                console.log("[✗] Profile picture failed:", e.message);
            }
            
            // Keep alive loop
            while (!isShuttingDown) {
                await delay(60000);
                try { 
                    await sock.sendPresenceUpdate('available');
                    console.log("[i] Keepalive ping");
                } catch (e) {}
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut && !isShuttingDown) {
                console.log("[!] Connection lost, reconnecting in 5s...");
                await delay(5000);
                return startBot();
            }
        }
    });
}

startBot();

process.on('SIGTERM', () => {
    isShuttingDown = true;
    if (sock) sock.end();
    process.exit(0);
});

process.on('SIGINT', () => {
    isShuttingDown = true;
    if (sock) sock.end();
    process.exit(0);
});

