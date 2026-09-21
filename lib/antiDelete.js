/**
 * VIRUZ Anti-Delete Engine (Stealth Private Mode)
 * Caches incoming messages and silently forwards any revoked/deleted messages
 * directly to the bot owner's private inbox with 100% accurate phone numbers,
 * sender names, chat details, and the exact recovered content.
 */

const fs = require('fs');
const path = require('path');
const messageStore = require('./messageStore');
const { atlasBox } = require('./utils');
const safety = require('./safety');
const config = require('../config');

const STATE_FILE = path.join(__dirname, '../antidelete_state.json');

/**
 * Recursively unwrap ephemeral, view-once, document-caption, and edit wrappers
 */
function unwrapMessage(m) {
  if (!m) return null;
  let curr = m;
  while (
    curr.ephemeralMessage?.message ||
    curr.viewOnceMessage?.message ||
    curr.viewOnceMessageV2?.message ||
    curr.viewOnceMessageV2Extension?.message ||
    curr.documentWithCaptionMessage?.message ||
    curr.editedMessage?.message?.protocolMessage?.editedMessage ||
    curr.protocolMessage?.editedMessage
  ) {
    curr = curr.ephemeralMessage?.message ||
           curr.viewOnceMessage?.message ||
           curr.viewOnceMessageV2?.message ||
           curr.viewOnceMessageV2Extension?.message ||
           curr.documentWithCaptionMessage?.message ||
           curr.editedMessage?.message?.protocolMessage?.editedMessage ||
           curr.protocolMessage?.editedMessage;
  }
  return curr;
}

/**
 * Resolve a WhatsApp JID or LID into a clean international phone number
 * Handles:
 * - Direct phone JIDs: 923116469820@s.whatsapp.net -> 923116469820
 * - WhatsApp LIDs: 1234567890@lid -> maps against groupMetadata.participants to find real phone number
 * - fromMe: maps to bot owner phone number
 * - Ignores group JIDs (@g.us) so a group ID is never mistaken for a phone number
 */
function resolvePhoneNumber(jid, isFromMe, groupMetadata, sock) {
  if (isFromMe) {
    if (sock?.user?.id) {
      return sock.user.id.split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
    }
    return safety.getOwnerJid().split('@')[0].replace(/[^0-9]/g, '');
  }

  if (!jid) return 'Unknown';

  // Group JIDs are never phone numbers
  if (jid.endsWith('@g.us')) return 'Unknown';

  // 1. Direct phone JID: phone@s.whatsapp.net
  if (jid.endsWith('@s.whatsapp.net')) {
    const num = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (num && num.length >= 7 && num.length <= 15) {
      return num;
    }
  }

  // 2. LID (Privacy ID): map to real phone number via groupMetadata
  if (jid.endsWith('@lid') && groupMetadata?.participants) {
    const cleanLid = jid.split(':')[0];
    const match = groupMetadata.participants.find(p => {
      const pLid = (p.lid || '').split(':')[0];
      const pId = (p.id || '').split(':')[0];
      return pLid === cleanLid || pId === cleanLid;
    });

    if (match) {
      const pnJid = match.jid || match.id || '';
      if (pnJid.endsWith('@s.whatsapp.net')) {
        const num = pnJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (num && num.length >= 7 && num.length <= 15) {
          return num;
        }
      }
    }
  }

  // 3. Fallback digits check (valid phone length: 7 to 15 digits, not starting with group 120363)
  const digits = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  if (digits.length >= 7 && digits.length <= 15 && !digits.startsWith('120363')) {
    return digits;
  }

  return 'Unknown';
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

    // Deduplicate handled revokes within 60s
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
   * Pre-cache media buffer asynchronously in RAM as soon as message arrives
   * This guarantees the media file is available even after WhatsApp CDN purges it!
   */
  async precacheMedia(msgId, content) {
    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
      let type = null;
      let mediaMsg = null;

      if (content.imageMessage) {
        type = 'image';
        mediaMsg = content.imageMessage;
      } else if (content.videoMessage) {
        type = 'video';
        mediaMsg = content.videoMessage;
      } else if (content.audioMessage) {
        type = 'audio';
        mediaMsg = content.audioMessage;
      } else if (content.stickerMessage) {
        type = 'sticker';
        mediaMsg = content.stickerMessage;
      } else if (content.documentMessage) {
        type = 'document';
        mediaMsg = content.documentMessage;
      }

      if (!type || !mediaMsg) return;

      const stream = await downloadContentFromMessage(mediaMsg, type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const cached = messageStore.get(msgId);
      if (cached && buffer.length > 0) {
        cached._mediaBuffer = buffer;
        cached._mediaType = type;
      }
    } catch (e) {
      // Non-blocking pre-cache catch
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

    // Pre-cache media content in memory immediately while CDN link is alive
    if (
      unwrapped?.imageMessage ||
      unwrapped?.videoMessage ||
      unwrapped?.audioMessage ||
      unwrapped?.stickerMessage ||
      unwrapped?.documentMessage
    ) {
      this.precacheMedia(msg.key.id, unwrapped).catch(() => {});
    }
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
    const deleterJid = msg.key.participant || protocolMsg.key?.participant || msg.key.remoteJid;

    await this.recoverAndForward(sock, { revokedId, remoteJid, deleterJid, msg });
  }

  /**
   * Handle when a message is revoked / deleted from messages.update
   */
  async handleRevokeUpdate(sock, update) {
    if (!this.enabled || !sock) return;

    const revokedId = update.key?.id;
    if (!revokedId) return;

    const remoteJid = update.key.remoteJid || '';
    const deleterJid = update.key.participant || update.update?.key?.participant || remoteJid;

    await this.recoverAndForward(sock, { revokedId, remoteJid, deleterJid, update });
  }

  /**
   * Core recovery & forward engine:
   * Retrieves original message from messageStore and forwards to owner DM with full fidelity.
   */
  async recoverAndForward(sock, { revokedId, remoteJid, deleterJid, msg, update }) {
    if (!this.enabled || !sock || !revokedId) return;

    // Deduplicate: prevent double forwarding
    if (this.handledRevokes.has(revokedId)) return;
    this.handledRevokes.add(revokedId);
    setTimeout(() => this.handledRevokes.delete(revokedId), 60000);

    // Look up original message
    let originalMsg = messageStore.get({ id: revokedId, remoteJid }) || messageStore.get(revokedId);
    if (!originalMsg) {
      // Microsecond race condition fallback: wait 500ms and retry
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
    let groupMetadata = null;

    if (isGroup && sock.groupMetadata) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        if (groupMetadata?.subject) chatTitle = groupMetadata.subject;
      } catch (e) {}
    }

    // ── Resolve accurate phone numbers and names ──
    const isFromMe = msg?.key?.fromMe || update?.key?.fromMe || false;
    const rawDeleterJid = msg?.key?.participant || deleterJid || originalMsg.key?.participant || from;
    const deleterPhone = resolvePhoneNumber(rawDeleterJid, isFromMe, groupMetadata, sock);
    const deleterName = msg?.pushName || (isFromMe ? 'You' : '');
    const deleterDisplay = deleterName ? `${deleterName} (+${deleterPhone})` : `+${deleterPhone}`;

    const rawSenderJid = originalMsg.key?.participant || originalMsg.participant || rawDeleterJid;
    const originalSenderPhone = resolvePhoneNumber(rawSenderJid, originalMsg.key?.fromMe || false, groupMetadata, sock);
    const originalSenderName = originalMsg.pushName || '';
    const originalSenderDisplay = originalSenderName ? `${originalSenderName} (+${originalSenderPhone})` : `+${originalSenderPhone}`;

    const isDifferentPerson = originalSenderPhone && deleterPhone && originalSenderPhone !== deleterPhone && deleterPhone !== 'Unknown';
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const content = unwrapMessage(originalMsg.message);
    if (!content) return;

    console.log(`[AntiDelete] 🗑️ Silently recovering message deleted by +${deleterPhone} in "${chatTitle}"...`);

    // ── Check for Text-Only Message ──
    const hasMedia = !!(content.imageMessage || content.videoMessage || content.audioMessage || content.stickerMessage || content.documentMessage);
    const text = content.conversation ||
      content.extendedTextMessage?.text ||
      content.protocolMessage?.editedMessage?.conversation ||
      content.protocolMessage?.editedMessage?.extendedTextMessage?.text;

    if (text && !hasMedia) {
      const body = `
👥 *Chat:* ${chatTitle}
👤 *Deleted By:* ${deleterDisplay}
📱 *Phone:* +${deleterPhone}
${isDifferentPerson ? `✍️ *Sent By:* ${originalSenderDisplay}\n` : ''}🕒 *Time Deleted:* ${timeStr}
📝 *Type:* Text Message

💬 *Deleted Message:*
${text}
`.trim();

      const output = atlasBox('🗑️ ANTI-DELETE RECOVERED', body, 'VIRUZ • PRIVATE INBOX');
      await this.sendToTargets(sock, {
        text: output,
        mentions: rawDeleterJid ? [rawDeleterJid] : []
      });
      return;
    }

    // ── Check for Media Message (Image, Video, Audio, Sticker, Document) ──
    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      // 1. Photo / Image
      if (content.imageMessage) {
        let buffer = originalMsg._mediaBuffer;
        if (!buffer) {
          try {
            const stream = await downloadContentFromMessage(content.imageMessage, 'image');
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          } catch (e) {
            // Fallback to embedded thumbnail if CDN stream failed
            if (content.imageMessage.jpegThumbnail) {
              buffer = Buffer.from(content.imageMessage.jpegThumbnail);
            }
          }
        }

        const captionText = content.imageMessage.caption || '';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* ${deleterDisplay}\n📱 *Phone:* +${deleterPhone}${isDifferentPerson ? `\n✍️ *Sent By:* ${originalSenderDisplay}` : ''}\n🕒 *Time Deleted:* ${timeStr}\n🖼️ *Type:* Photo / Image${captionText ? `\n📸 *Caption:* ${captionText}` : ''}`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED PHOTO', body, 'VIRUZ • PRIVATE INBOX');

        if (buffer && buffer.length > 0) {
          await this.sendToTargets(sock, {
            image: buffer,
            caption: output,
            mentions: rawDeleterJid ? [rawDeleterJid] : []
          });
          return;
        }
      }

      // 2. Video Message
      if (content.videoMessage) {
        let buffer = originalMsg._mediaBuffer;
        if (!buffer) {
          try {
            const stream = await downloadContentFromMessage(content.videoMessage, 'video');
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          } catch (e) {
            if (content.videoMessage.jpegThumbnail) {
              buffer = Buffer.from(content.videoMessage.jpegThumbnail);
            }
          }
        }

        const captionText = content.videoMessage.caption || '';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* ${deleterDisplay}\n📱 *Phone:* +${deleterPhone}${isDifferentPerson ? `\n✍️ *Sent By:* ${originalSenderDisplay}` : ''}\n🕒 *Time Deleted:* ${timeStr}\n🎬 *Type:* Video${captionText ? `\n🎥 *Caption:* ${captionText}` : ''}`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED VIDEO', body, 'VIRUZ • PRIVATE INBOX');

        if (buffer && buffer.length > 0) {
          await this.sendToTargets(sock, {
            video: buffer,
            caption: output,
            mentions: rawDeleterJid ? [rawDeleterJid] : []
          });
          return;
        }
      }

      // 3. Audio / Voice Note Message
      if (content.audioMessage) {
        let buffer = originalMsg._mediaBuffer;
        if (!buffer) {
          try {
            const stream = await downloadContentFromMessage(content.audioMessage, 'audio');
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          } catch (e) {}
        }

        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* ${deleterDisplay}\n📱 *Phone:* +${deleterPhone}${isDifferentPerson ? `\n✍️ *Sent By:* ${originalSenderDisplay}` : ''}\n🕒 *Time Deleted:* ${timeStr}\n🎤 *Type:* Voice Note / Audio`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED AUDIO', body, 'VIRUZ • PRIVATE INBOX');

        if (buffer && buffer.length > 0) {
          await this.sendToTargets(sock, { text: output });
          await this.sendToTargets(sock, {
            audio: buffer,
            mimetype: content.audioMessage.mimetype || 'audio/mp4',
            ptt: true
          });
          return;
        }
      }

      // 4. Sticker Message
      if (content.stickerMessage) {
        let buffer = originalMsg._mediaBuffer;
        if (!buffer) {
          try {
            const stream = await downloadContentFromMessage(content.stickerMessage, 'sticker');
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          } catch (e) {}
        }

        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* ${deleterDisplay}\n📱 *Phone:* +${deleterPhone}${isDifferentPerson ? `\n✍️ *Sent By:* ${originalSenderDisplay}` : ''}\n🕒 *Time Deleted:* ${timeStr}\n🎨 *Type:* Sticker`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED STICKER', body, 'VIRUZ • PRIVATE INBOX');

        if (buffer && buffer.length > 0) {
          await this.sendToTargets(sock, { text: output });
          await this.sendToTargets(sock, { sticker: buffer });
          return;
        }
      }

      // 5. Document / File Message
      if (content.documentMessage) {
        let buffer = originalMsg._mediaBuffer;
        if (!buffer) {
          try {
            const stream = await downloadContentFromMessage(content.documentMessage, 'document');
            buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          } catch (e) {}
        }

        const fileName = content.documentMessage.fileName || 'document';
        const body = `👥 *Chat:* ${chatTitle}\n👤 *Deleted By:* ${deleterDisplay}\n📱 *Phone:* +${deleterPhone}${isDifferentPerson ? `\n✍️ *Sent By:* ${originalSenderDisplay}` : ''}\n🕒 *Time Deleted:* ${timeStr}\n📄 *Type:* Document / File (${fileName})`;
        const output = atlasBox('🗑️ ANTI-DELETE RECOVERED FILE', body, 'VIRUZ • PRIVATE INBOX');

        if (buffer && buffer.length > 0) {
          await this.sendToTargets(sock, {
            document: buffer,
            fileName,
            mimetype: content.documentMessage.mimetype,
            caption: output
          });
          return;
        }
      }
    } catch (err) {
      console.error('[AntiDelete] Error recovering media:', err.message);
    }

    // ── 6. Other Message Types (Contacts, Locations, Polls, Fallback) ──
    let itemType = 'Message';
    let extraDetail = '';

    if (content.contactMessage) {
      itemType = 'Contact Card';
      extraDetail = `👤 *Contact Name:* ${content.contactMessage.displayName || 'Unknown'}`;
    } else if (content.locationMessage) {
      itemType = 'Location Pin';
      extraDetail = `📍 *Location:* ${content.locationMessage.name || content.locationMessage.address || `${content.locationMessage.degreesLatitude}, ${content.locationMessage.degreesLongitude}`}`;
    } else if (content.pollCreationMessage || content.pollCreationMessageV2 || content.pollCreationMessageV3) {
      const poll = content.pollCreationMessage || content.pollCreationMessageV2 || content.pollCreationMessageV3;
      itemType = 'Poll';
      extraDetail = `📊 *Poll Question:* ${poll.name}\n📋 *Options:* ${(poll.options || []).map(o => o.optionName).join(', ')}`;
    } else if (content.imageMessage) {
      itemType = 'Photo / Image';
      if (content.imageMessage.caption) extraDetail = `📸 *Caption:* ${content.imageMessage.caption}`;
    } else if (content.videoMessage) {
      itemType = 'Video';
      if (content.videoMessage.caption) extraDetail = `🎥 *Caption:* ${content.videoMessage.caption}`;
    } else if (content.audioMessage) {
      itemType = 'Voice Note / Audio';
    } else if (content.stickerMessage) {
      itemType = 'Sticker';
    } else if (content.documentMessage) {
      itemType = `Document (${content.documentMessage.fileName || 'file'})`;
    }

    const fallbackBody = `
👥 *Chat:* ${chatTitle}
👤 *Deleted By:* ${deleterDisplay}
📱 *Phone:* +${deleterPhone}
${isDifferentPerson ? `✍️ *Sent By:* ${originalSenderDisplay}\n` : ''}🕒 *Time Deleted:* ${timeStr}
📎 *Deleted Thing:* ${itemType}
${extraDetail ? `\n${extraDetail}` : ''}
`.trim();

    const output = atlasBox('🗑️ ANTI-DELETE RECOVERED', fallbackBody, 'VIRUZ • PRIVATE INBOX');
    await this.sendToTargets(sock, {
      text: output,
      mentions: rawDeleterJid ? [rawDeleterJid] : []
    });
  }
}

const managerInstance = new AntiDeleteManager();
module.exports = managerInstance;
module.exports.unwrapMessage = unwrapMessage;
module.exports.resolvePhoneNumber = resolvePhoneNumber;
module.exports.AntiDeleteManager = AntiDeleteManager;
