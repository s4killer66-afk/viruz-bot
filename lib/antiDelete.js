/**
 * VIRUZ Anti-Delete Engine (Stealth Private Mode)
 * Caches incoming messages and silently forwards any revoked/deleted messages
 * directly to the bot owner's private inbox without notifying the chat or sender.
 */

const messageStore = require('./messageStore');
const { atlasBox } = require('./utils');
const safety = require('./safety');

function unwrapMessage(m) {
  if (!m) return null;
  let curr = m;
  while (
    curr.ephemeralMessage?.message ||
    curr.viewOnceMessage?.message ||
    curr.viewOnceMessageV2?.message ||
    curr.viewOnceMessageV2Extension?.message ||
    curr.documentWithCaptionMessage?.message
  ) {
    curr = curr.ephemeralMessage?.message ||
           curr.viewOnceMessage?.message ||
           curr.viewOnceMessageV2?.message ||
           curr.viewOnceMessageV2Extension?.message ||
           curr.documentWithCaptionMessage?.message;
  }
  return curr;
}

class AntiDeleteManager {
  constructor() {
    this.enabled = true; // Enabled by default
  }

  /**
   * Store incoming message in memory for recovery
   */
  storeMessage(msg) {
    if (!msg || !msg.key || !msg.key.id || !msg.message) return;

    // Check protocol message
    const protoMsg = msg.message.protocolMessage ||
      msg.message.ephemeralMessage?.message?.protocolMessage;
    if (protoMsg) return; // Don't store revoke packets as regular messages

    messageStore.set(msg.key.id, msg);
  }

  /**
   * Handle when a message is revoked / deleted
   * Silently delivers the deleted content directly to the bot owner's private inbox
   */
  async handleRevoke(sock, msg) {
    if (!this.enabled || !sock) return;

    const protocolMsg = msg.message?.protocolMessage ||
      msg.message?.ephemeralMessage?.message?.protocolMessage;
    if (!protocolMsg) return;

    const isRevoke = protocolMsg.type === 0 ||
      protocolMsg.type === 'REVOKE' ||
      protocolMsg.type === 5;
    if (!isRevoke) return;

    const revokedId = protocolMsg.key?.id;
    if (!revokedId) return;

    const remoteJid = msg.key.remoteJid || protocolMsg.key?.remoteJid || '';
    const originalMsg = messageStore.get({ id: revokedId, remoteJid });
    if (!originalMsg) return;

    // Target inbox: Always send to the bot owner's personal private chat
    let targetInbox = null;
    if (sock.user?.id) {
      const botPhone = sock.user.id.split(':')[0].split('@')[0];
      targetInbox = `${botPhone}@s.whatsapp.net`;
    } else {
      targetInbox = safety.getOwnerJid();
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

    const sender = protocolMsg.key?.participant ||
      originalMsg.key?.participant ||
      originalMsg.participant ||
      from;
    const senderPhone = (sender || '').split('@')[0].split(':')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const content = unwrapMessage(originalMsg.message);
    if (!content) return;

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
      await sock.sendMessage(targetInbox, {
        text: output,
        mentions: sender ? [sender] : []
      });
      return;
    }

    // 2. Media Message (Image, Video, Audio, Sticker, Document)
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
        await sock.sendMessage(targetInbox, {
          image: buffer,
          caption: output,
          mentions: sender ? [sender] : []
        });
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
        await sock.sendMessage(targetInbox, {
          video: buffer,
          caption: output,
          mentions: sender ? [sender] : []
        });
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
        await sock.sendMessage(targetInbox, { text: output });
        await sock.sendMessage(targetInbox, {
          audio: buffer,
          mimetype: content.audioMessage.mimetype || 'audio/mp4',
          ptt: true
        });
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
        await sock.sendMessage(targetInbox, { text: output });
        await sock.sendMessage(targetInbox, { sticker: buffer });
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
        await sock.sendMessage(targetInbox, {
          document: buffer,
          fileName,
          mimetype: content.documentMessage.mimetype,
          caption: output
        });
        return;
      }
    } catch (err) {
      console.error('[AntiDelete] Error recovering media:', err.message);
    }
  }
}

module.exports = new AntiDeleteManager();
