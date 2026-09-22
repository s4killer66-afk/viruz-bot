/**
 * Baileys WhatsApp Connection Manager with Anti-Ban Safety & Dedup
 */

const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');
const messageStore = require('./messageStore');
const config = require('../config');
const commandHandler = require('./commandHandler');
const moderator = require('./groupModerator');
const antiDelete = require('./antiDelete');
const welcomeHandler = require('./welcomeHandler');
const safety = require('./safety');
const groupMetadataCache = require('./groupMetadataCache');

let baileysModule = null;
async function loadBaileys() {
  if (!baileysModule) {
    baileysModule = await import('@whiskeysockets/baileys');
  }
  return baileysModule;
}

class WhatsAppClient {
  constructor() {
    this.sock = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'waiting_pair' | 'connected'
    this.pairingCode = null;
    this.qrCodeBase64 = null;
    this.connectedUser = null;
    this.reconnectTimer = null;
    this.isStarting = false;
    this.bootTime = Date.now();
  }

  /**
   * Start or restart the Baileys socket ensuring single active connection
   */
  async start() {
    if (this.isStarting) {
      console.log('[Baileys] Socket is already starting, skipping redundant start.');
      return this.sock;
    }
    this.isStarting = true;

    // Clean up any previous socket instance
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners();
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }

    try {
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
        Browsers,
        proto
      } = await loadBaileys();

      const authFolder = path.resolve(config.sessionDir);
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      let version = [2, 3000, 1015901307];
      try {
        const v = await fetchLatestBaileysVersion();
        version = v.version;
      } catch (e) {}

      console.log(`[Baileys] Connecting to WhatsApp Web (v${version.join('.')})...`);

      // NodeCache for tracking message retries (prevents retry loop and decrypt failures)
      const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

// Filter noisy libsignal internal decryption warnings during automatic session re-sync
const _origConsoleError = console.error;
console.error = (...args) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : '';
  if (
    firstArg.includes('Failed to decrypt message with any known session') ||
    firstArg.includes('Session error:Error: Bad MAC')
  ) {
    return;
  }
  _origConsoleError.apply(console, args);
};

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        msgRetryCounterCache,
        retryRequestDelayMs: 250,
        getMessage: async (key) => {
          if (!key) return undefined;
          const protoMsg = messageStore.getMessageProto(key);
          return protoMsg || undefined;
        },
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: false,  // Reduced activity — anti-ban
        syncFullHistory: false,
        markOnlineOnConnect: false,  // Don't mark online — anti-ban
        defaultQueryTimeoutMs: 60000,
        maxMsgRetryCount: 5
      });

      // Wrap sendMessage to cache all outgoing bot command replies for retry decryption
      const rawSendMessage = this.sock.sendMessage.bind(this.sock);
      this.sock.sendMessage = async (jid, content, options = {}) => {
        const result = await rawSendMessage(jid, content, options);
        if (result && result.key?.id) {
          messageStore.set(result.key.id, result);
        }
        return result;
      };

      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeBase64 = await QRCode.toDataURL(qr);
          } catch (e) {}
        }

        if (connection === 'connecting') {
          this.status = 'connecting';
          console.log('[Baileys] Connection status: Connecting...');
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.pairingCode = null;
          this.qrCodeBase64 = null;
          this.connectedUser = this.sock.user;
          const userIdentifier = this.sock.user?.name || this.sock.user?.id?.split(':')[0] || 'Bot';
          console.log(`[Baileys] ✅ Connected successfully as: ${userIdentifier}`);

          // Pre-warm group participant rosters for accurate phone resolution (welcome/goodbye/anti-delete/moderation)
          if (typeof this.sock.groupFetchAllParticipating === 'function') {
            this.sock.groupFetchAllParticipating().then(groups => {
              for (const [id, g] of Object.entries(groups || {})) {
                if (id) {
                  antiDelete.cacheGroupMetadata(id, g);
                  welcomeHandler.cacheGroupMetadata(id, g);
                  groupMetadataCache.set(id, g);
                }
              }
            }).catch(() => {});
          }
        }

        if (connection === 'close') {
          this.status = 'disconnected';
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason?.loggedOut;
          console.log(`[Baileys] Connection closed. StatusCode: ${statusCode}, LoggedOut: ${isLoggedOut}`);

          if (!isLoggedOut) {
            if (!this.reconnectTimer) {
              // Longer delay on reconnect to avoid ban — 8 seconds
              console.log('[Baileys] Reconnecting in 8 seconds...');
              this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.start().catch(err => console.error('[Baileys] Reconnect error:', err.message));
              }, 8000);
            }
          } else {
            console.log('[Baileys] Device was logged out. Session files need to be re-paired.');
            try {
              fs.rmSync(authFolder, { recursive: true, force: true });
            } catch (e) {}
          }
        }
      });

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async (chatUpdate) => {
        // ── 1. Guard against historical chat syncs / appends ──
        // WhatsApp sends past message batches on initial sync or reconnect.
        // Only live incoming notifications ('notify') should trigger commands!
        if (chatUpdate.type && chatUpdate.type !== 'notify') {
          if (chatUpdate.messages) {
            for (const m of chatUpdate.messages) {
              if (m?.message) antiDelete.storeMessage(m);
            }
          }
          return;
        }

        const messages = chatUpdate.messages || [];
        for (const msg of messages) {
          try {
            if (!msg || !msg.message) continue;

            // ── Anti-Delete: Check if message is a Revoke/Delete ──
            const unwrapped = antiDelete.unwrapMessage ? antiDelete.unwrapMessage(msg.message) : null;
            const protocolMsg = msg.message.protocolMessage ||
              unwrapped?.protocolMessage ||
              msg.message.ephemeralMessage?.message?.protocolMessage ||
              msg.message.viewOnceMessage?.message?.protocolMessage;
            
            const isRevoke = protocolMsg && (
              protocolMsg.type === 0 ||
              protocolMsg.type === '0' ||
              protocolMsg.type === 'REVOKE' ||
              protocolMsg.type === 5 ||
              (!protocolMsg.type && protocolMsg.key?.id && !protocolMsg.editedMessage && !protocolMsg.ephemeralExpiration)
            );

            if (isRevoke) {
              await antiDelete.handleRevoke(this.sock, msg);
              continue;
            }

            // ── Safety: skip junk messages (statuses, newsletters) ──
            if (safety.shouldIgnoreMessage(msg)) continue;

            // ── Anti-Delete: Store message in memory for recovery ──
            antiDelete.storeMessage(msg);

            // ── 2. Guard: Never process messages sent directly by this bot ──
            if (safety.isSentByBot(msg.key?.id)) {
              continue;
            }

            // ── 3. Stale Backlog Guard: Ignore messages sent while bot was offline ──
            const rawTs = typeof msg.messageTimestamp === 'number'
              ? msg.messageTimestamp
              : Number(msg.messageTimestamp?.low || msg.messageTimestamp || 0);
            const msgTs = rawTs * 1000;
            if (msgTs > 0) {
              const age = Date.now() - msgTs;
              if (age > 60_000 || msgTs < (this.bootTime - 10_000)) {
                // Stale message backlog from WhatsApp history sync — skip command processing
                continue;
              }
            }

            // ── Safety: deduplicate (prevents double-response bug) ──
            if (safety.isDuplicate(msg.key.id)) {
              continue;
            }

          // ── Safety: if bot is turned OFF, skip command processing ──
          // (anti-delete still works, but only .bot from Admin/Owner re-enables it)
          if (!safety.isBotEnabled()) {
            const text = (
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text || ''
            ).trim();
            const prefixes = config.prefixes || ['.', ',', '!', '#', '/'];
            const isCmd = prefixes.some(p => text.startsWith(p));
            if (isCmd) {
              const withoutPrefix = text.slice(1).trim().split(/\s+/);
              const cmdWord = withoutPrefix[0]?.toLowerCase();
              if (cmdWord === 'bot' || cmdWord === 'viruz' || cmdWord === 'switch' || cmdWord === 'power') {
                const isOwner = msg.key.fromMe || safety.isOwner(msg.key.participant || msg.key.remoteJid);
                let canTurnOn = isOwner;
                if (!canTurnOn && msg.key.remoteJid.endsWith('@g.us')) {
                  try {
                    const meta = await groupMetadataCache.getGroupMetadata(this.sock, msg.key.remoteJid);
                    canTurnOn = moderator.isGroupAdmin(msg.key.participant, meta);
                  } catch (e) {}
                }
                if (canTurnOn) {
                  await commandHandler.handleMessage(this.sock, msg);
                }
              }
            }
            return;
          }

          const from = msg.key.remoteJid;
          const isGroup = from.endsWith('@g.us');
          const sender = isGroup ? (msg.key.participant || from) : from;

          // Group Moderation & Anti-Spam (Sticker & Message)
          // Only track regular members in groups, skip fromMe and admins
          if (isGroup && !msg.key.fromMe) {
            let groupMetadata = null;
            try {
              groupMetadata = await groupMetadataCache.getGroupMetadata(this.sock, from);
            } catch (e) {}

            // 1. Check for Sticker Spam (4 warn, 5 kick)
            if (msg.message.stickerMessage) {
              await moderator.handleStickerSpam(this.sock, from, sender, groupMetadata);
            }

            // 2. Check for Repeated Message Spam (5 warn, 6 kick)
            const textContent = msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              msg.message.imageMessage?.caption ||
              '';

            const prefixes = config.prefixes || ['.', ',', '!', '#', '/'];
            const isCmd = prefixes.some(p => textContent.startsWith(p));
            if (textContent && !isCmd) {
              await moderator.handleMessageSpam(this.sock, from, sender, textContent, groupMetadata);
            }
          }

          // Execute WhatsApp bot commands
          await commandHandler.handleMessage(this.sock, msg);

        } catch (err) {
          console.error('[Baileys] Error handling message:', err.message);
        }
      }
    });

      // ── Anti-Delete: Catch revokes emitted via messages.update ──
      this.sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
          try {
            const isRevokeUpdate = update.update?.messageStubType === 68 ||
              update.update?.messageStubType === 'REVOKE' ||
              (update.update?.message === null && update.key?.id);

            if (isRevokeUpdate && update.key?.id) {
              await antiDelete.handleRevokeUpdate(this.sock, update);
            }
          } catch (err) {
            console.error('[AntiDelete] messages.update error:', err.message);
          }
        }
      });

      // Handle group participant updates (Auto-welcome & Auto-goodbye / kick)
      this.sock.ev.on('group-participants.update', async (update) => {
        try {
          if (update?.id) groupMetadataCache.invalidate(update.id);
          if (!safety.isBotEnabled()) return;
          await welcomeHandler.handleParticipantUpdate(this.sock, update);
        } catch (err) {
          console.error('[Baileys] Error handling participant update:', err.message);
        }
      });

      // Maintain LID to real phone number mapping from contacts & groups
      this.sock.ev.on('contacts.upsert', (contacts) => {
        try { antiDelete.learnContacts(contacts); } catch (e) {}
      });
      this.sock.ev.on('contacts.update', (updates) => {
        try { antiDelete.learnContacts(updates); } catch (e) {}
      });
      this.sock.ev.on('groups.upsert', (groups) => {
        try {
          for (const g of groups) {
            if (g.id) {
              antiDelete.cacheGroupMetadata(g.id, g);
              welcomeHandler.cacheGroupMetadata(g.id, g);
              groupMetadataCache.set(g.id, g);
            }
          }
        } catch (e) {}
      });
      this.sock.ev.on('groups.update', (updates) => {
        try {
          for (const g of updates) {
            if (g.id) {
              antiDelete.cacheGroupMetadata(g.id, g);
              welcomeHandler.cacheGroupMetadata(g.id, g);
              groupMetadataCache.set(g.id, g);
            }
          }
        } catch (e) {}
      });

      return this.sock;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Request pairing code dynamically from web dashboard
   */
  async requestNewPairingCode(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    this.pairingCode = null;

    // Reset session folder if re-pairing
    const authFolder = path.resolve(config.sessionDir);
    try {
      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
      }
    } catch (e) {}

    // Start fresh socket instance
    await this.start();

    // Wait a brief moment for socket connection initialization
    await new Promise(r => setTimeout(r, 1500));

    try {
      console.log(`[Baileys] Requesting pairing code for ${cleanNumber}...`);
      const code = await this.sock.requestPairingCode(cleanNumber);
      this.pairingCode = code?.match(/.{1,4}/g)?.join('-') || code;
      this.status = 'waiting_pair';
      console.log(`[Baileys] Pairing code generated: ${this.pairingCode}`);
      return this.pairingCode;
    } catch (err) {
      console.error('[Baileys] Pairing code generation error:', err.message);
      throw err;
    }
  }
}

module.exports = new WhatsAppClient();
