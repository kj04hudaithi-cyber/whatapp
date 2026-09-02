const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const qrcode_term = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const AUTH_DIR = path.join(__dirname, 'baileys_auth_info');

let sock = null;
let qrDataURL = '';
let isConnected = false;
let statusMessage = 'Initializing WhatsApp Engine...';

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        console.log(`Using Baileys version: ${version.join('.')}`);

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['MessMate35 Desktop', 'Chrome', '124.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrDataURL = await qrcode.toDataURL(qr);
                isConnected = false;
                statusMessage = 'QR Code generated. Please scan with WhatsApp to link.';
                console.log('\n--- SCAN THIS QR CODE WITH WHATSAPP ---');
                qrcode_term.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                isConnected = false;
                statusMessage = `Connection closed (${lastDisconnect?.error?.message || 'reconnecting'}). Reconnecting...`;
                console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
                
                if (shouldReconnect) {
                    setTimeout(connectToWhatsApp, 3000);
                } else {
                    statusMessage = 'Device logged out. Please re-authenticate.';
                    qrDataURL = '';
                    if (fs.existsSync(AUTH_DIR)) {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    }
                    setTimeout(connectToWhatsApp, 2000);
                }
            } else if (connection === 'open') {
                isConnected = true;
                qrDataURL = '';
                statusMessage = 'Connected and ready to send messages!';
                console.log('✅ WhatsApp connection opened successfully!');
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (err) {
        console.error('Error in connectToWhatsApp:', err.message);
        setTimeout(connectToWhatsApp, 5000);
    }
}

// Start connection
connectToWhatsApp();

// ── Web Dashboard (Root /) ─────────────────────────────────────────────
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MessMate35 WhatsApp Cloud Engine</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #060913; color: #f8fafc; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px 24px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    .title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 6px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 14px 0 20px; }
    .badge.online { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    .badge.waiting { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .btn { display: inline-block; background: linear-gradient(135deg,#0284c7,#2563eb); color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 44px; margin-bottom: 12px;">⚡</div>
    <div class="title">WhatsApp Cloud Engine</div>
    <div style="color: #94a3b8; font-size: 13px;">Ultra-Fast Baileys Multi-Device · MessMate35</div>
    
    <div class="badge ${isConnected ? 'online' : 'waiting'}">
      <span style="width:8px; height:8px; border-radius:50%; background: ${isConnected ? '#22c55e' : '#f59e0b'};"></span>
      ${statusMessage}
    </div>

    ${qrDataURL && !isConnected ? `
      <div class="qr-box">
        <img src="${qrDataURL}" style="width: 220px; height: 220px; display: block; border-radius: 8px;" alt="Scan QR">
        <div style="color: #0f172a; font-size: 11px; font-weight: 800; margin-top: 8px;">SCAN WITH WHATSAPP</div>
      </div>
    ` : ''}

    <div style="margin-top: 10px;">
      <a href="http://mess.freedev.app/" class="btn">Open MessMate35 App &rarr;</a>
    </div>
  </div>
</body>
</html>`;
    res.send(html);
});

// ── API Endpoints ──────────────────────────────────────────────────────
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        status: statusMessage,
        qr: qrDataURL,
        engine: 'baileys_multi_device'
    });
});

app.post('/send', async (req, res) => {
    let { number, phone, message } = req.body;
    number = number || phone;

    if (!isConnected || !sock) {
        return res.status(400).json({ success: false, error: 'WhatsApp is not connected yet. Please scan the QR code first.' });
    }

    if (!number || !message) {
        return res.status(400).json({ success: false, error: 'Number and message are required.' });
    }

    try {
        let cleanNumber = String(number).replace(/\D/g, '');
        if (cleanNumber.startsWith('05') && cleanNumber.length === 10) cleanNumber = '966' + cleanNumber.substring(1);
        else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;
        else if (cleanNumber.startsWith('01') && cleanNumber.length === 11) cleanNumber = '88' + cleanNumber;
        else if (cleanNumber.length === 10) cleanNumber = '880' + cleanNumber;

        const jid = `${cleanNumber}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: message });

        return res.json({ success: true, messageId: result?.key?.id, jid });
    } catch (err) {
        console.error('Error sending message:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/broadcast', async (req, res) => {
    const { messages } = req.body;
    if (!isConnected || !sock) {
        return res.status(400).json({ success: false, error: 'WhatsApp is not connected yet.' });
    }
    if (!Array.isArray(messages)) {
        return res.status(400).json({ success: false, error: 'Invalid messages array.' });
    }

    let sent = 0;
    let failed = 0;

    for (const item of messages) {
        try {
            let cleanNumber = String(item.number || item.phone).replace(/\D/g, '');
            if (cleanNumber.startsWith('05') && cleanNumber.length === 10) cleanNumber = '966' + cleanNumber.substring(1);
            else if (cleanNumber.startsWith('5') && cleanNumber.length === 9) cleanNumber = '966' + cleanNumber;
            else if (cleanNumber.startsWith('01') && cleanNumber.length === 11) cleanNumber = '88' + cleanNumber;

            const jid = `${cleanNumber}@s.whatsapp.net`;
            await sock.sendMessage(jid, { text: item.message });
            sent++;
            await new Promise(r => setTimeout(r, 1200)); // anti-spam delay
        } catch (e) {
            failed++;
        }
    }

    return res.json({ success: true, sent, failed, total: messages.length });
});

app.listen(PORT, () => {
    console.log(`🚀 Baileys WhatsApp Cloud Server running on port ${PORT}`);
});
