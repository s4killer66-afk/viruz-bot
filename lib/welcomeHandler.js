/**
 * VIRUZ Auto-Welcome & Goodbye Handler
 * Handles group participant updates (join, leave, kick)
 * Features:
 * - Auto-welcome when someone joins the GC with exact phone mention and friendly message
 * - Auto-goodbye when someone leaves or is kicked, showing correct phone number and who kicked them
 */

const { atlasBox } = require('./utils');
const config = require('../config');

class WelcomeHandler {
  constructor() {
    // Set of group IDs where welcome/goodbye is disabled: Set<groupId>
    this.disabledGroups = new Set();

    // Cache of recent admin/bot kicks: Map<`${groupId}:${phone}`, { adminJid, time }>
    this.recentKicks = new Map();
  }

  /**
   * Check if welcome/goodbye is enabled for a group
   * @param {string} groupId 
   * @returns {boolean}
   */
  isEnabled(groupId) {
    if (config.welcome && config.welcome.enabled === false) return false;
    return !this.disabledGroups.has(groupId);
  }

  /**
   * Set status for a specific group
   * @param {string} groupId 
   * @param {boolean} enabled 
   * @returns {boolean}
   */
  setGroupStatus(groupId, enabled) {
    if (enabled) {
      this.disabledGroups.delete(groupId);
    } else {
      this.disabledGroups.add(groupId);
    }
    return this.isEnabled(groupId);
  }

  /**
   * Record a kick action to properly attribute who kicked whom
   * @param {string} groupId 
   * @param {string} targetJid 
   * @param {string} adminJid 
   */
  recordKick(groupId, targetJid, adminJid) {
    const cleanTarget = this.extractPhoneNumber(targetJid);
    const key = `${groupId}:${cleanTarget}`;
    this.recentKicks.set(key, { adminJid, time: Date.now() });

    // Clean up cache after 30 seconds
    setTimeout(() => {
      this.recentKicks.delete(key);
    }, 30000);
  }

  /**
   * Extract clean, pure phone digits from any WhatsApp JID format
   * @param {string} jid 
   * @param {object} groupMetadata 
   * @returns {string}
   */
  extractPhoneNumber(jid, groupMetadata = null) {
    if (!jid) return '';
    let raw = jid.split('@')[0].split(':')[0];

    // If it's a LID format, look up participant mapping in groupMetadata
    if (jid.endsWith('@lid') && groupMetadata && groupMetadata.participants) {
      const match = groupMetadata.participants.find(p => p.lid === jid || p.id === jid);
      if (match && match.id && match.id.includes('@s.whatsapp.net')) {
        raw = match.id.split('@')[0].split(':')[0];
      }
    }

    return raw.replace(/[^0-9]/g, '');
  }

  /**
   * Generate welcome message payload
   * @param {string} phone 
   * @param {string} groupName 
   * @returns {{ text: string, mentions: string[] }}
   */
  buildWelcomeMessage(phone, groupName) {
    const mentionJid = `${phone}@s.whatsapp.net`;
    const body = `
👋 Welcome to the group @${phone}!

🎉 Glad to have you join *${groupName}*!
📱 *Member:* +${phone}
📜 Please read the group description & follow group rules.
✨ Be respectful and enjoy your stay!
`.trim();

    const text = atlasBox('WELCOME TO THE GROUP', body, 'VIRUZ • AUTO WELCOME');
    return { text, mentions: [mentionJid] };
  }

  /**
   * Generate goodbye message payload (voluntary leave or kicked)
   * @param {string} phone 
   * @param {string} groupName 
   * @param {boolean} isKicked 
   * @param {string|null} kickerPhone 
   * @param {boolean} isBotKicker 
   * @returns {{ text: string, mentions: string[] }}
   */
  buildGoodbyeMessage(phone, groupName, isKicked = false, kickerPhone = null, isBotKicker = false) {
    const mentionJid = `${phone}@s.whatsapp.net`;
    const mentions = [mentionJid];
    let body = '';
    let title = 'GOODBYE FROM GROUP';

    if (isKicked) {
      title = 'MEMBER REMOVED';
      let kickerDisplay = '';
      if (isBotKicker) {
        kickerDisplay = '🤖 VIRUZ Auto-Moderator';
      } else if (kickerPhone) {
        kickerDisplay = `@${kickerPhone} (+${kickerPhone})`;
        mentions.push(`${kickerPhone}@s.whatsapp.net`);
      } else {
        kickerDisplay = 'Group Admin';
      }

      body = `
👋 Goodbye @${phone}!

🚪 *Kicked Member:* @${phone} (+${phone})
👑 *Removed By:* ${kickerDisplay}
📍 *Group:* *${groupName}*

Farewell and best of luck ahead! ✨
`.trim();
    } else {
      body = `
👋 Goodbye @${phone}!

🚶 *Member Left:* @${phone} (+${phone})
📍 *Group:* *${groupName}*

We are sad to see you leave. Take care! ✨
`.trim();
    }

    const text = atlasBox(title, body, 'VIRUZ • AUTO GOODBYE');
    return { text, mentions };
  }

  /**
   * Process group-participants.update event from Baileys
   * @param {object} sock 
   * @param {object} update 
   */
  async handleParticipantUpdate(sock, { id, author, participants, action }) {
    if (!this.isEnabled(id)) return;
    if (!participants || !Array.isArray(participants) || participants.length === 0) return;

    let groupMetadata = null;
    try {
      groupMetadata = await sock.groupMetadata(id);
    } catch (e) {}

    const groupName = groupMetadata?.subject || 'the group';
    const botJid = sock.user?.id;
    const botPhone = this.extractPhoneNumber(botJid);

    // 1. ACTION: ADD (User joins or is added)
    if (action === 'add') {
      for (const participant of participants) {
        const phone = this.extractPhoneNumber(participant, groupMetadata);
        if (!phone) continue;

        // Skip welcoming the bot itself
        if (botPhone && phone === botPhone) continue;

        const payload = this.buildWelcomeMessage(phone, groupName);
        await sock.sendMessage(id, {
          text: payload.text,
          mentions: payload.mentions
        });
      }
    }

    // 2. ACTION: REMOVE (User leaves or is kicked)
    if (action === 'remove') {
      for (const participant of participants) {
        const phone = this.extractPhoneNumber(participant, groupMetadata);
        if (!phone) continue;

        // Skip goodbye for the bot itself
        if (botPhone && phone === botPhone) continue;

        const key = `${id}:${phone}`;
        const recordedKick = this.recentKicks.get(key);

        let isKicked = false;
        let kickerPhone = null;
        let isBotKicker = false;

        if (recordedKick) {
          isKicked = true;
          kickerPhone = this.extractPhoneNumber(recordedKick.adminJid, groupMetadata);
          isBotKicker = botPhone && kickerPhone === botPhone;
          this.recentKicks.delete(key);
        } else if (author && this.extractPhoneNumber(author) !== phone) {
          isKicked = true;
          kickerPhone = this.extractPhoneNumber(author, groupMetadata);
          isBotKicker = botPhone && kickerPhone === botPhone;
        }

        const payload = this.buildGoodbyeMessage(phone, groupName, isKicked, kickerPhone, isBotKicker);
        await sock.sendMessage(id, {
          text: payload.text,
          mentions: payload.mentions
        });
      }
    }
  }
}

module.exports = new WelcomeHandler();
