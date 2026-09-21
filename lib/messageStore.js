/**
 * VIRUZ Unified Message Store
 * Caches both incoming and outgoing messages with their cryptographic proto payloads.
 * Solves the WhatsApp Multi-Device "Waiting for this message. This may take a while" issue
 * by enabling Baileys to re-encrypt and fulfill retry requests (getMessage).
 */

const NodeCache = require('node-cache');

class MessageStore {
  constructor() {
    // Retain up to 15,000 messages for 24 hours (86,400s), useClones: false allows in-place buffer caching & zero memory overhead
    this.cache = new NodeCache({ stdTTL: 86400, checkperiod: 600, maxKeys: 15000, useClones: false });
  }

  /**
   * Store incoming or outgoing message
   * @param {string} id - Message ID
   * @param {object} msg - Full Baileys message object
   */
  set(id, msg) {
    if (!id || !msg) return;
    this.cache.set(id, msg);

    // Also index by composite remoteJid_id if remoteJid is present
    const remoteJid = msg.key?.remoteJid;
    if (remoteJid) {
      this.cache.set(`${remoteJid}_${id}`, msg);
    }
  }

  /**
   * Retrieve message by ID or key object
   * @param {string|object} key - Message ID string or Baileys key object
   * @returns {object|null}
   */
  get(key) {
    if (!key) return null;
    const id = typeof key === 'string' ? key : key.id;
    if (!id) return null;

    let found = this.cache.get(id);
    if (!found && typeof key === 'object' && key.remoteJid) {
      found = this.cache.get(`${key.remoteJid}_${id}`);
    }
    return found || null;
  }

  /**
   * Extract the proto.Message payload needed for getMessage retries
   * @param {string|object} key
   * @returns {object|null}
   */
  getMessageProto(key) {
    const found = this.get(key);
    if (!found) return null;
    return found.message || found;
  }

  /**
   * Clear cache
   */
  flush() {
    this.cache.flushAll();
  }
}

module.exports = new MessageStore();
