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
const { checkMobileLegends } = require('./lib/gameChecker');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── 24/7 Keep-Alive Engine (Only enabled if explicitly configured to avoid NAT loopback hangs) ──
let keepAliveTimer = null;
let detectedPublicUrl = process.env.APP_URL || null;

function startKeepAlive(url) {
  if (keepAliveTimer || !url) return;
  detectedPublicUrl = url.replace(/\/+$/, '');
  console.log(`[KeepAlive] 🟢 Starting 24/7 self-ping loop for: ${detectedPublicUrl}`);

  // Ping public URL every 5 minutes (300,000ms) with short timeout
  keepAliveTimer = setInterval(async () => {
    try {
      const pingUrl = `${detectedPublicUrl}/api/status`;
      await axios.get(pingUrl, { timeout: 5000 });
      console.log(`[KeepAlive] ✅ Ping successful (${new Date().toLocaleTimeString()})`);
    } catch (err) {
      // Non-blocking log
    }
  }, 300000);
}

// Only enable keepalive if explicitly requested via environment variable (e.g. for Render free tier)
if (process.env.ENABLE_KEEP_ALIVE === 'true' && process.env.APP_URL) {
  startKeepAlive(process.env.APP_URL);
}

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

    const g = game.toLowerCase();
    if (g === 'ml' || g === 'mlbb' || g === 'mobilelegends') {
      const parts = cleanQuery.split(/\s+/);
      result = await checkMobileLegends(parts[0], parts[1]);
    } else {
      return res.status(400).json({ success: false, message: 'Only Mobile Legends (.ml) is supported.' });
    }

    res.json({ success: true, formattedText: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Setup console pairing input for Pterodactyl / KataBump terminals
const readline = require('readline');

function setupConsolePairing(waClient) {
  if (process.env.NODE_ENV === 'test') return;

  const targetNumber = process.env.PAIR_NUMBER || process.env.PHONE_NUMBER;
  if (targetNumber) {
    const clean = targetNumber.replace(/[^0-9]/g, '');
    console.log(`[Auto-Pair] Requesting pairing code for +${clean}...`);
    setTimeout(() => {
      waClient.requestNewPairingCode(clean).catch(err => {
        console.error('[Auto-Pair Error]:', err.message);
      });
    }, 2500);
    return;
  }

  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    console.log(`👉 Or type your WhatsApp phone number below (e.g. 923116469820) and press Enter to pair:`);
    rl.on('line', async (line) => {
      const clean = line.trim().replace(/[^0-9]/g, '');
      if (clean.length >= 9) {
        console.log(`[Console] Generating pairing code for +${clean}...`);
        try {
          await waClient.requestNewPairingCode(clean);
        } catch (err) {
          console.error(`[Console Error]: ${err.message}. Please retry.`);
        }
      } else if (line.trim()) {
        console.log('❌ Invalid phone number length. Include country code (e.g. 923116469820).');
      }
    });

    rl.on('error', () => {});
    if (typeof process.stdin.unref === 'function') {
      process.stdin.unref();
    }
  } catch (e) {}
}

// Start Express Server
const server = app.listen(config.port, async () => {
  let publicIp = null;
  try {
    const ipRes = await axios.get('https://api.ipify.org', { timeout: 3500 });
    if (ipRes.data) {
      publicIp = ipRes.data.trim();
    }
  } catch (e) {}

  const webUrl = publicIp ? `http://${publicIp}:${config.port}` : `http://localhost:${config.port}`;
  console.log(`\n======================================================`);
  console.log(`🚀 VIRUZ BOT & WEB PAIRING DASHBOARD`);
  console.log(`🌐 Public Webpage: ${webUrl}`);
  if (publicIp) {
    console.log(`🌐 Localhost:     http://localhost:${config.port}`);
  }
  console.log(`👉 Open the Public Webpage in your browser or phone to link!`);
  console.log(`======================================================\n`);
  
  // Start Baileys in background
  waClient.start().then(() => {
    if (!waClient.sock?.authState?.creds?.registered) {
      setupConsolePairing(waClient);
    }
  }).catch(err => {
    console.log('[Baileys Startup Note] Waiting for pairing code request from web portal.');
    setupConsolePairing(waClient);
  });

  if (process.env.APP_URL) {
    startKeepAlive(process.env.APP_URL);
  }
});

module.exports = { app, server };
