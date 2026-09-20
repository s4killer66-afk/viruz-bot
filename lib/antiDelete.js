/**
 * Atlas-MD Anti-Delete Engine
 * Caches incoming messages and detects when messages are revoked/deleted
 */

const NodeCache = require('node-cache');
const { atlasBox } = require('./utils');

// Cache up to 24 hours of messages (86400 seconds)
const messageCache = new NodeCache({ stdTTL: 86400, checkperiod: 600, maxKeys: 3000 });

class AntiDeleteManager {
  constructor() {
    this.enabled = true; // Enabled by default
  }

  /**
   * Store incoming message in memory
   */
  storeMessage(msg) {
    if (!msg || !msg.key || !msg.key.id || !msg.message) return;
    // Don't store protocol messages (revokes) as content
    if (msg.message.protocolMessage) return;

    messageCache.set(msg.key.id, msg);
  }

  /**
   * Handle when a message is revoked / deleted
   */
  async handleRevoke(sock, msg) {
    if (!this.enabled) return;

    const protocolMsg = msg.message?.protocolMessage;
    if (!protocolMsg || protocolMsg.type !== 0) return; // 0 = REVOKE

    const revokedId = protocolMsg.key?.id;
    if (!revokedId) return;

    const originalMsg = messageCache.get(revokedId);
    if (!originalMsg) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = protocolMsg.key?.participant || originalMsg.key?.participant || from;
    const senderPhone = sender.split('@')[0];

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // 1. Text Message
    const text = originalMsg.message?.conversation ||
      originalMsg.message?.extendedTextMessage?.text;

    if (text) {
      const body = `
👤 *Deleted By:* @${senderPhone}
🕒 *Time:* ${timeStr}
💬 *Message Content:*
${text}
`.trim();

      const output = atlasBox('ANTI-DELETE RECOVERED', body);
      await sock.sendMessage(from, {
        text: output,
        mentions: [sender]
      });
      return;
    }

    // 2. Media Message (Image, Video, Audio, Sticker)
    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      if (originalMsg.message?.imageMessage) {
        const stream = await downloadContentFromMessage(originalMsg.message.imageMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = originalMsg.message.imageMessage.caption || '';
        const body = `👤 *Deleted By:* @${senderPhone}\n🕒 *Time:* ${timeStr}${caption ? `\n💬 *Caption:* ${caption}` : ''}`;
        const output = atlasBox('ANTI-DELETE RECOVERED IMAGE', body);
        await sock.sendMessage(from, {
          image: buffer,
          caption: output,
          mentions: [sender]
        });
        return;
      }

      if (originalMsg.message?.videoMessage) {
        const stream = await downloadContentFromMessage(originalMsg.message.videoMessage, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = originalMsg.message.videoMessage.caption || '';
        const body = `👤 *Deleted By:* @${senderPhone}\n🕒 *Time:* ${timeStr}${caption ? `\n💬 *Caption:* ${caption}` : ''}`;
        const output = atlasBox('ANTI-DELETE RECOVERED VIDEO', body);
        await sock.sendMessage(from, {
          video: buffer,
          caption: output,
          mentions: [sender]
        });
        return;
      }

      if (originalMsg.message?.stickerMessage) {
        const stream = await downloadContentFromMessage(originalMsg.message.stickerMessage, 'sticker');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        await sock.sendMessage(from, {
          text: `🚫 *[ANTI-DELETE]* @${senderPhone} deleted a sticker at ${timeStr}:`,
          mentions: [sender]
        });
        await sock.sendMessage(from, { sticker: buffer });
        return;
      }
    } catch (err) {
      console.error('[AntiDelete] Error recovering media:', err.message);
    }
  }
}

module.exports = new AntiDeleteManager();
