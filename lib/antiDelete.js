/**
 * VIRUZ Anti-Delete Engine (Stealth Private Mode)
 * Caches incoming messages and silently forwards any revoked/deleted messages
 * directly to the bot owner's private inbox without notifying the chat or sender.
 */

const fs = require('fs');
const path = require('path');
const messageStore = require('./messageStore');
const { atlasBox } = require('./utils');
const safety = require('./safety');
const config = require('../config');

const STATE_FILE = path.join(__dirname, '../antidelete_state.json');

function unwrapMessage(m) {
  if (!m) return null;
  let curr = m;
  while (
    curr.ephemeralMessage?.message ||
    curr.viewOnceMessage?.message ||
    curr.viewOnceMessageV2?.message ||
    curr.viewOnceMessageV2Extension?.message ||
    curr.documentWithCaptionMessage?.message ||
    curr.editedMessage?.message?.protocolMessage?.editedMessage
  ) {
    curr = curr.ephemeralMessage?.message ||
           curr.viewOnceMessage?.message ||
           curr.viewOnceMessageV2?.message ||
           curr.viewOnceMessageV2Extension?.message ||
           curr.documentWithCaptionMessage?.message ||
           curr.editedMessage?.message?.protocolMessage?.editedMessage;
  }
  return curr;
}

class AntiDeleteManager {
  constructor() {
    this.enabled = true; // Enabled by default
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        if (typeof data.enabled === 'boolean') {
          this.enabled = data.enabled;
        }
      }
    } catch (e) {}

    // Deduplicate handled revokes to prevent double-forwarding
    this.handledRevokes = new Set();
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = !!val;
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify({ enabled: this.enabled }, null, 2));
    } catch (e) {}
  }

  /**
   * Determine target inboxes:
   * Always sends directly to the bot owner's personal WhatsApp DM
   */
  getTargetInboxes(sock) {
    const inboxes = new Set();

    // 1. Connected bot user itself (Message Yourself chat)
    if (sock?.user?.id) {
      const botPhone = sock.user.id.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
      if (botPhone) {
        inboxes.add(`${botPhone}@s.whatsapp.net`);
      }
    }

    // 2. Configured owner numbers (if bot is running on a secondary phone)
    const ownerJid = safety.getOwnerJid();
    if (ownerJid && (!sock?.user?.id || !safety.isOwner(sock.user.id))) {
      inboxes.add(ownerJid);
    }

    if (inboxes.size === 0) {
      inboxes.add(safety.getOwnerJid());
    }

    return Array.from(inboxes);
  }

  /**
   * Send message payload to all target owner inboxes
   */
  async sendToTargets(sock, messagePayload) {
    const targets = this.getTargetInboxes(sock);
    for (const target of targets) {
      try {
        await sock.sendMessage(target, messagePayload);
      } catch (err) {
        console.error(`[AntiDelete] Failed to deliver to ${target}:`, err.message);
      }
    }
  }

  /**
   * Store incoming message in memory for recovery
   */
  storeMessage(msg) {
    if (!msg || !msg.key || !msg.key.id || !msg.message) return;

    const unwrapped = unwrapMessage(msg.message);
    const protoMsg = msg.message.protocolMessage ||
      unwrapped?.protocolMessage ||
      msg.message.ephemeralMessage?.message?.protocolMessage;
    if (protoMsg) return; // Don't store revoke packets as regular messages

    messageStore.set(msg.key.id, msg);
  }

  /**
   * Handle when a message is revoked / deleted from messages.upsert
   */
  async handleRevoke(sock, msg) {
    if (!this.enabled || !sock) return;

    const unwrapped = unwrapMessage(msg.message);
    const protocolMsg = msg.message?.protocolMessage ||
      unwrapped?.protocolMessage ||
      msg.message?.ephemeralMessage?.message?.protocolMessage;
    if (!protocolMsg) return;

    const isRevoke = protocolMsg.type === 0 ||
      protocolMsg.type === '0' ||
      protocolMsg.type === 'REVOKE' ||
      protocolMsg.type === 5 ||
      (!protocolMsg.type && protocolMsg.key?.id && !protocolMsg.editedMessage && !protocolMsg.ephemeralExpiration);
    if (!isRevoke) return;

    const revokedId = protocolMsg.key?.id;
    if (!revokedId) return;

    const remoteJid = msg.key.remoteJid || protocolMsg.key?.remoteJid || '';
    const sender = protocolMsg.key?.participant ||
      msg.key.participant ||
      msg.key.remoteJid;

    await this.recoverAndForward(sock, { revokedId, remoteJid, sender });
  }

  /**
   * Handle when a message is revoked / deleted from messages.update
   */
  async handleRevokeUpdate(sock, update) {
    if (!this.enabled || !sock) return;

    const revokedId = update.key?.id;
    if (!revokedId) return;

    const remoteJid = update.key.remoteJid || '';
    const sender = update.key.participant || update.update?.key?.participant || remoteJid;

    await this.recoverAndForward(sock, { revokedId, remoteJid, sender });
  }

  /**
   * Core recovery & forward engine:
   * Retrieves original message from messageStore and forwards to owner DM silently.
   */
  async recoverAndForward(sock, { revokedId, remoteJid, sender }) {
    if (!this.enabled || !sock || !revokedId) return;

    // Deduplicate: prevent double forwarding if both upsert and update fire
    if (this.handledRevokes.has(revokedId)) return;
    this.handledRevokes.add(revokedId);
    setTimeout(() => this.handledRevokes.delete(revokedId), 60000);

    // Look up original message
    let originalMsg = messageStore.get({ id: revokedId, remoteJid }) || messageStore.get(revokedId);
    if (!originalMsg) {
      // Race condition fallback: wait 500ms and retry once
      await new Promise(r => setTimeout(r, 500));
      originalMsg = messageStore.get({ id: revokedId, remoteJid }) || messageStore.get(revokedId);
    }
    if (!originalMsg) {
      console.log(`[AntiDelete] Message ${revokedId} not found in cache (may have been sent before bot started).`);
      return;
    }

    const from = originalMsg.key?.remoteJid || remoteJid;
    const isGroup = from.endsWith('@g.us');
    let chatTitle = isGroup ? 'Group Chat' : 'Direct Message (DM)';
    if (isGroup && sock.groupMetadata) {
      try {
        const meta = await sock.groupMetadata(from);
        if (meta?.subject) chatTitle = meta.subject;
      } catch (e) {}
    }

    const effectiveSender = originalMsg.key?.participant ||
      originalMsg.participant ||
      sender ||
      from;
    const senderPhone = (effectiveSender || '').split('@')[0].split(':')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const content = unwrapMessage(originalMsg.message);
    if (!content) return;

    console.log(`[AntiDelete] 🗑️ Silently recovering message deleted by +${senderPhone} in "${chatTitle}"...`);

    // 1. Text Message
    const text = content.conversation || content.extendedTextMessage?.text;
    if (text) {
      const body = `
👥 *Chat:* ${chatTitle}
👤 *Deleted By:* +${senderPhone} (@${senderPhone})
🕒 *Time Deleted:* ${timeStr}
💬 *Message Content:*
${text}
`.trim();

      const output = atlasBox('🗑️ ANTI-DELETE RECOVERED', body, 'VIRUZ • PRIVATE INBOX');
      await this.sendToTargets(sock, {
        text: output,
        mentions: effectiveSender ? [effectiveSender] : []
      });
      return;
    }

    // 2. Media Message (Image, Video, Audio, Sticker, Document)
    let downloaded = false;
    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      if (content.imageMessage) {
        const stream = await downloadContentFromMessage(content.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const captionText = content.imageMessage.caption || '';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* +${senderPhone} (@${senderPhone})\n🕒 *Time Deleted:* ${timeStr}${captionText ? `\n📸 *Original Caption:* ${captionText}` : ''}`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED IMAGE', body, 'VIRUZ • PRIVATE INBOX');
        await this.sendToTargets(sock, {
          image: buffer,
          caption: output,
          mentions: effectiveSender ? [effectiveSender] : []
        });
        downloaded = true;
        return;
      }

      if (content.videoMessage) {
        const stream = await downloadContentFromMessage(content.videoMessage, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const captionText = content.videoMessage.caption || '';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* +${senderPhone} (@${senderPhone})\n🕒 *Time Deleted:* ${timeStr}${captionText ? `\n🎬 *Original Caption:* ${captionText}` : ''}`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED VIDEO', body, 'VIRUZ • PRIVATE INBOX');
        await this.sendToTargets(sock, {
          video: buffer,
          caption: output,
          mentions: effectiveSender ? [effectiveSender] : []
        });
        downloaded = true;
        return;
      }

      if (content.audioMessage) {
        const stream = await downloadContentFromMessage(content.audioMessage, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* +${senderPhone} (@${senderPhone})\n🕒 *Time Deleted:* ${timeStr}\n🎤 *Deleted Voice Note Recovered:*`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED AUDIO', body, 'VIRUZ • PRIVATE INBOX');
        await this.sendToTargets(sock, { text: output });
        await this.sendToTargets(sock, {
          audio: buffer,
          mimetype: content.audioMessage.mimetype || 'audio/mp4',
          ptt: true
        });
        downloaded = true;
        return;
      }

      if (content.stickerMessage) {
        const stream = await downloadContentFromMessage(content.stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* +${senderPhone} (@${senderPhone})\n🕒 *Time Deleted:* ${timeStr}\n🎨 *Deleted Sticker Recovered:*`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED STICKER', body, 'VIRUZ • PRIVATE INBOX');
        await this.sendToTargets(sock, { text: output });
        await this.sendToTargets(sock, { sticker: buffer });
        downloaded = true;
        return;
      }

      if (content.documentMessage) {
        const stream = await downloadContentFromMessage(content.documentMessage, 'document');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const fileName = content.documentMessage.fileName || 'document';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* +${senderPhone} (@${senderPhone})\n🕒 *Time Deleted:* ${timeStr}\n📄 *Document Name:* ${fileName}`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED FILE', body, 'VIRUZ • PRIVATE INBOX');
        await this.sendToTargets(sock, {
          document: buffer,
          fileName,
          mimetype: content.documentMessage.mimetype,
          caption: output
        });
        downloaded = true;
        return;
      }
    } catch (err) {
      console.error('[AntiDelete] Error downloading media:', err.message);
    }

    // 3. Fallback: If media could not be streamed or other message types
    if (!downloaded) {
      let desc = 'Media / Message';
      if (content.imageMessage) desc = 'Photo / Image';
      else if (content.videoMessage) desc = 'Video';
      else if (content.audioMessage) desc = 'Voice Note / Audio';
      else if (content.stickerMessage) desc = 'Sticker';
      else if (content.documentMessage) desc = `Document (${content.documentMessage.fileName || 'file'})`;
      else if (content.contactMessage) desc = `Contact: ${content.contactMessage.displayName || ''}`;
      else if (content.locationMessage) desc = `Location (${content.locationMessage.degreesLatitude}, ${content.locationMessage.degreesLongitude})`;

      const body = `
👥 *Chat:* ${chatTitle}
👤 *Deleted By:* +${senderPhone} (@${senderPhone})
🕒 *Time Deleted:* ${timeStr}
📎 *Content Type:* ${desc}
${content.imageMessage?.caption || content.videoMessage?.caption ? `📸 *Caption:* ${content.imageMessage?.caption || content.videoMessage?.caption}\n` : ''}_(Media binary expired on WhatsApp servers, but deletion details were recovered.)_
`.trim();

      const output = atlasBox('🗑️ ANTI-DELETE RECOVERED (MEDIA NOTICE)', body, 'VIRUZ • PRIVATE INBOX');
      await this.sendToTargets(sock, {
        text: output,
        mentions: effectiveSender ? [effectiveSender] : []
      });
    }
  }
}

const managerInstance = new AntiDeleteManager();
module.exports = managerInstance;
module.exports.unwrapMessage = unwrapMessage;
module.exports.AntiDeleteManager = AntiDeleteManager;
