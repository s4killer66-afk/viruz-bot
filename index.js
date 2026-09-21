/**
 * Atlas-MD WhatsApp Bot & Web Pairing Server
 */

process.on('uncaughtException', (err) => {
  console.log('[System Handled Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('[System Handled Rejection]:', reason?.message || reason);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const waClient = require('./lib/baileys');
const {
  checkMobileLegends,
  checkPUBGMobile,
  checkGenshinImpact,
  checkHonorOfKings,
} = require('./lib/gameChecker');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── 24/7 Keep-Alive Engine for Free Cloud Containers (Back4App / Render) ──
let keepAliveTimer = null;
let detectedPublicUrl = process.env.APP_URL || null;

function startKeepAlive(url) {
  if (keepAliveTimer || !url) return;
  detectedPublicUrl = url.replace(/\/+$/, '');
  console.log(`[KeepAlive] 🟢 Starting 24/7 self-ping loop for: ${detectedPublicUrl}`);
  
  // Ping public URL every 2 minutes (120,000ms) to prevent cloud container from going to sleep
  keepAliveTimer = setInterval(async () => {
    try {
      const pingUrl = `${detectedPublicUrl}/api/status`;
      await axios.get(pingUrl, { timeout: 15000 });
      console.log(`[KeepAlive] ✅ Ping successful to keep container active (${new Date().toLocaleTimeString()})`);
    } catch (err) {
      console.log(`[KeepAlive] Ping note:`, err.message);
    }
  }, 120000);
}

// Auto-detect public URL from the first web request to keep container awake forever
app.use((req, res, next) => {
  if (!detectedPublicUrl && req.headers.host) {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const fullUrl = `${proto}://${host}`;
      startKeepAlive(fullUrl);
    }
  }
  next();
});

// 1. Connection Status API
app.get('/api/status', (req, res) => {
  res.json({
    status: waClient.status,
    pairingCode: waClient.pairingCode,
    hasQr: !!waClient.qrCodeBase64,
    user: waClient.connectedUser ? {
      name: waClient.connectedUser.name || 'VIRUZ Bot',
      id: waClient.connectedUser.id?.split(':')[0],
    } : null,
    botName: config.botName,
    prefix: config.prefix,
  });
});

// 2. Request WhatsApp Pairing Code
app.post('/api/pair', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Phone number is required.' });
  }

  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.length < 9) {
    return res.status(400).json({ success: false, message: 'Invalid phone number length. Include country code.' });
  }

  try {
    console.log(`[Web API] Generating pairing code for +${cleanNumber}...`);
    const code = await waClient.requestNewPairingCode(cleanNumber);
    if (code) {
      res.json({ success: true, pairingCode: code });
    } else {
      res.status(500).json({ success: false, message: 'Failed to generate code in time. Please retry.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Get QR Code data
app.get('/api/qr', (req, res) => {
  if (waClient.qrCodeBase64) {
    res.json({ success: true, qr: waClient.qrCodeBase64 });
  } else {
    res.json({ success: false, message: 'No QR code currently active.' });
  }
});

// 4. Test Game Account Checker directly from web page
app.post('/api/test-game', async (req, res) => {
  const { game, query } = req.body;
  if (!game || !query) {
    return res.status(400).json({ success: false, message: 'Game type and query ID are required.' });
  }

  try {
    let result = '';
    const cleanQuery = query.trim();

    switch (game.toLowerCase()) {
      case 'ml': {
        const parts = cleanQuery.split(/\s+/);
        result = await checkMobileLegends(parts[0], parts[1]);
        break;
      }
      case 'pubg': {
        result = await checkPUBGMobile(cleanQuery);
        break;
      }
      case 'genshin': {
        result = await checkGenshinImpact(cleanQuery);
        break;
      }
      case 'hok': {
        result = await checkHonorOfKings(cleanQuery);
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'Unsupported game type.' });
    }

    res.json({ success: true, formattedText: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Start Express Server
const server = app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VIRUZ BOT & WEB PAIRING DASHBOARD`);
  console.log(`🌐 Dashboard URL: http://localhost:${config.port}`);
  console.log(`======================================================\n`);
  
  // Start Baileys in background
  waClient.start().catch(err => {
    console.log('[Baileys Startup Note] Waiting for pairing code request from web portal.');
  });

  if (process.env.APP_URL) {
    startKeepAlive(process.env.APP_URL);
  }
});

module.exports = { app, server };
