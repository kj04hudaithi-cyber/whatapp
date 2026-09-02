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
    authStrategy: new LocalAuth({ clientId: "mass-bill-client" }),
    puppeteer: {
        headless: true,
        executablePath: chromePath || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
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
