const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

let qrDataURL = '';
let isConnected = false;
let statusMessage = 'Initializing...';

const fs = require('fs');
let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;

if (!chromePath) {
    const possiblePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            chromePath = p;
            break;
        }
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ 
        dataPath: './.wwebjs_auth',
        clientId: "mass-bill-client" 
    }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1046596687-alpha.html',
    },
    puppeteer: {
        headless: true,
        executablePath: chromePath || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--force-color-profile=srgb',
            '--js-flags=--max-old-space-size=180',
            '--disable-blink-features=AutomationControlled',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        ]
    }
});

const qrcode_term = require('qrcode-terminal');

client.on('qr', async (qr) => {
    // Generate QR Code as Data URL
    qrDataURL = await qrcode.toDataURL(qr);
    statusMessage = 'QR Code generated. Please scan to log in.';
    isConnected = false;
    console.log('QR Code ready');
    
    // Display QR code in terminal
    console.log('\nScan this QR code with WhatsApp:\n');
    qrcode_term.generate(qr, { small: true });
});

client.on('ready', () => {
    isConnected = true;
    qrDataURL = '';
    statusMessage = 'Connected and ready to send messages!';
    console.log('Client is ready!');
});

client.on('authenticated', () => {
    statusMessage = 'Authenticated. Connecting...';
    console.log('Authenticated!');
});

client.on('auth_failure', msg => {
    statusMessage = 'Authentication failure: ' + msg;
    isConnected = false;
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    statusMessage = 'Client was logged out: ' + reason;
    isConnected = false;
    qrDataURL = '';
    console.log('Client was logged out', reason);
});

client.initialize();

// API Endpoints
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
    .qr-box { background: #fff; padding: 16px; border-radius: 16px; display: inline-block; margin-bottom: 20px; }
    .btn { display: inline-block; background: linear-gradient(135deg,#0284c7,#2563eb); color: #fff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 44px; margin-bottom: 12px;">💬</div>
    <div class="title">WhatsApp Cloud Engine</div>
    <div style="color: #94a3b8; font-size: 13px;">24/7 Automation Server · MessMate35</div>
    
    <div class="badge ${isConnected ? 'online' : 'waiting'}">
      <span style="width:8px; height:8px; border-radius:50%; background: ${isConnected ? '#22c55e' : '#f59e0b'};"></span>
      ${statusMessage}
    </div>

    ${qrDataURL && !isConnected ? `
      <div class="qr-box">
        <img src="${qrDataURL}" style="width: 220px; height: 220px; display: block;" alt="Scan QR">
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

app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        status: statusMessage,
        qr: qrDataURL
    });
});

let messageQueue = [];
let isSending = false;

async function processQueue() {
    if (isSending || messageQueue.length === 0) return;
    isSending = true;

    while (messageQueue.length > 0) {
        const { chatId, message } = messageQueue.shift();
        try {
            await client.sendMessage(chatId, message);
            console.log('Sent queued message to', chatId);
        } catch (error) {
            console.error('Error sending message to', chatId, ':', error);
        }
        // Wait 1.5 to 3 seconds to avoid spam detection
        const delay = Math.floor(Math.random() * 1500) + 1500;
        await new Promise(r => setTimeout(r, delay));
    }
    isSending = false;
}

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    
    if (!isConnected) {
        return res.status(503).json({ success: false, error: 'WhatsApp is not connected. Please scan the QR code in the settings.' });
    }
    
    try {
        // WhatsApp ID format: countrycode + number + @c.us
        const cleanNumber = number.replace(/\D/g, '');
        let finalNumber = cleanNumber;
        if (cleanNumber.startsWith('01') && cleanNumber.length === 11) {
            finalNumber = '88' + cleanNumber;
        } else if (cleanNumber.length === 10) {
            finalNumber = '880' + cleanNumber;
        } else if (!cleanNumber.startsWith('88') && cleanNumber.length > 10) {
           finalNumber = cleanNumber; 
        }
        
        const chatId = finalNumber + '@c.us';
        
        messageQueue.push({ chatId, message });
        processQueue(); // start queue if not running
        
        res.json({ success: true, message: 'Message queued successfully' });
    } catch (error) {
        console.error('Error queuing message:', error);
        res.status(500).json({ success: false, error: error.toString() });
    }
});

app.post('/logout', async (req, res) => {
    try {
        await client.logout();
        isConnected = false;
        qrDataURL = '';
        statusMessage = 'Logged out successfully.';
        client.initialize(); // Re-initialize to get a new QR code
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.toString() });
    }
});

const ngrok = require('ngrok');
const localtunnel = require('localtunnel');

const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`WhatsApp API server running on port ${PORT}`);
    
    let url = '';
    try {
        console.log('Starting LocalTunnel (subdomain: massbillwhatsapp2)...');
        const tunnel = await localtunnel({ port: PORT, subdomain: 'massbillwhatsapp2' });
        url = tunnel.url;
        
        tunnel.on('close', () => {
            console.log('LocalTunnel closed');
        });
        tunnel.on('error', (err) => {
            console.error('LocalTunnel error:', err);
        });
    } catch (ltErr) {
        console.log('Subdomain busy or failed, retrying random localtunnel...');
        try {
            const tunnel = await localtunnel({ port: PORT });
            url = tunnel.url;
        } catch (err2) {
            console.error('All tunnel attempts failed:', err2.message);
        }
    }
    
    if (url) {
        console.log(`\n========================================================`);
        console.log(`   ✅ SECURE TUNNEL IS LIVE: ${url}`);
        console.log(`========================================================\n`);
        
        const IONOS_SITE_URL = 'https://mass.kj04.online'; 
        console.log(`Syncing Tunnel URL to IONOS Server...`);
        
        fetch(IONOS_SITE_URL + '/actions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'update_tunnel',
                secret: 'massbill_secret_123',
                url: url
            })
        }).then(res => res.json())
          .then(data => {
              if (data.success) console.log('✅ Successfully synced URL to IONOS!');
              else console.log('❌ Failed to sync URL to IONOS. Check your secret.');
          }).catch(err => console.log('❌ Could not reach IONOS Server:', err.message));
    }
});
