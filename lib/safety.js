/**
 * VIRUZ Anti-Ban Safety Layer
 * Protects the bot owner's WhatsApp account from getting banned by:
 * 1. Rate-limiting outgoing messages (per-chat and global cooldowns)
 * 2. Adding human-like random delays between responses
 * 3. Deduplicating message processing (prevents double-reply bug)
 * 4. Skipping status broadcasts and newsletter messages
 * 5. Providing a master on/off switch for the bot
 */

const config = require('../config');

class SafetyManager {
  constructor() {
    // ── Bot Master Switch ──
    this.botEnabled = true;

    // ── Deduplication: track processed message IDs ──
    // Map<messageId, timestamp> — auto-expires after 60 seconds
    this.processedMessages = new Map();
    this.DEDUP_TTL_MS = 60_000; // 60s

    // Cleanup interval every 30 seconds
    this._cleanupInterval = setInterval(() => this._cleanupDedup(), 30_000);

    // ── Rate Limiter: per-chat send timestamps ──
    // Map<chatJid, number[]> — last N send timestamps
    this.chatSendLog = new Map();

    // Safety thresholds (conservative to avoid ban)
    this.MIN_DELAY_MS = 800;          // Minimum delay between any two sends
    this.MAX_SENDS_PER_CHAT_PER_MIN = 5;   // Max msgs to one chat in 60s
    this.MAX_GLOBAL_SENDS_PER_MIN = 20;    // Max total msgs in 60s
    this.globalSendLog = [];
  }

  // ── Bot On/Off ──

  /**
   * Check if the bot is currently active
   * @returns {boolean}
   */
  isBotEnabled() {
    return this.botEnabled;
  }

  /**
   * Enable or disable the bot
   * @param {boolean} enabled
   */
  setBotEnabled(enabled) {
    this.botEnabled = enabled;
  }

  // ── Deduplication ──

  /**
   * Check if this message was already processed.
   * If not, mark it as processed and return false.
   * If yes, return true (skip it).
   * @param {string} messageId
   * @returns {boolean} true if duplicate
   */
  isDuplicate(messageId) {
    if (!messageId) return false;
    if (this.processedMessages.has(messageId)) {
      return true;
    }
    this.processedMessages.set(messageId, Date.now());
    return false;
  }

  /**
   * Cleanup expired dedup entries
   * @private
   */
  _cleanupDedup() {
    const now = Date.now();
    for (const [id, ts] of this.processedMessages) {
      if (now - ts > this.DEDUP_TTL_MS) {
        this.processedMessages.delete(id);
      }
    }
  }

  // ── Junk Message Filter ──

  /**
   * Check if a message should be completely ignored (status, newsletter, etc.)
   * @param {object} msg
   * @returns {boolean} true if message should be skipped
   */
  shouldIgnoreMessage(msg) {
    if (!msg || !msg.key) return true;

    const jid = msg.key.remoteJid || '';

    // Skip WhatsApp status broadcasts
    if (jid === 'status@broadcast') return true;

    // Skip newsletter / channel messages
    if (jid.endsWith('@newsletter')) return true;

    // Skip messages with no content
    if (!msg.message) return true;

    // Skip protocol messages (they're handled separately for anti-delete)
    // But don't skip them here — let baileys.js handle protocolMessage routing

    return false;
  }

  // ── Rate Limiter ──

  /**
   * Record that we're about to send a message to a chat
   * @param {string} chatJid
   */
  recordSend(chatJid) {
    const now = Date.now();

    // Global
    this.globalSendLog.push(now);
    this.globalSendLog = this.globalSendLog.filter(t => now - t < 60_000);

    // Per-chat
    if (!this.chatSendLog.has(chatJid)) {
      this.chatSendLog.set(chatJid, []);
    }
    const chatLog = this.chatSendLog.get(chatJid);
    chatLog.push(now);
    // Keep only last 60s
    this.chatSendLog.set(chatJid, chatLog.filter(t => now - t < 60_000));
  }

  /**
   * Check if we're allowed to send another message right now.
   * Returns true if safe, false if we should hold off.
   * @param {string} chatJid
   * @returns {boolean}
   */
  canSend(chatJid) {
    const now = Date.now();

    // Global rate check
    const recentGlobal = this.globalSendLog.filter(t => now - t < 60_000);
    if (recentGlobal.length >= this.MAX_GLOBAL_SENDS_PER_MIN) {
      return false;
    }

    // Per-chat rate check
    const chatLog = this.chatSendLog.get(chatJid) || [];
    const recentChat = chatLog.filter(t => now - t < 60_000);
    if (recentChat.length >= this.MAX_SENDS_PER_CHAT_PER_MIN) {
      return false;
    }

    return true;
  }

  /**
   * Get a randomized human-like delay in ms
   * @returns {number}
   */
  getHumanDelay() {
    // Random delay between 800ms and 2000ms
    return this.MIN_DELAY_MS + Math.floor(Math.random() * 1200);
  }

  /**
   * Wait for a human-like delay (call before sending)
   * @returns {Promise<void>}
   */
  async waitHumanDelay() {
    const delay = this.getHumanDelay();
    await new Promise(r => setTimeout(r, delay));
  }

  /**
   * Safe send wrapper — adds delay, checks rate limits, records the send.
   * @param {object} sock - Baileys socket
   * @param {string} jid - Chat JID to send to
   * @param {object} content - Message content
   * @param {object} [options] - Send options (e.g. { quoted: msg })
   * @returns {Promise<object|null>} sent message or null if rate-limited
   */
  async safeSend(sock, jid, content, options = {}) {
    if (!this.canSend(jid)) {
      console.log(`[Safety] Rate limited: skipping send to ${jid.substring(0, 15)}...`);
      return null;
    }

    await this.waitHumanDelay();
    this.recordSend(jid);
    return sock.sendMessage(jid, content, options);
  }

  // ── Owner Check ──

  /**
   * Check if a JID belongs to the bot owner
   * @param {string} jid
   * @returns {boolean}
   */
  isOwner(jid) {
    if (!jid) return false;
    const phone = jid.split('@')[0].split(':')[0];
    return (config.ownerNumbers || []).some(num => phone === num || phone.includes(num) || num.includes(phone));
  }

  /**
   * Get the owner's JID for sending DMs
   * @returns {string}
   */
  getOwnerJid() {
    const primary = (config.ownerNumbers || [])[0] || '923116469820';
    return `${primary}@s.whatsapp.net`;
  }
}

module.exports = new SafetyManager();
