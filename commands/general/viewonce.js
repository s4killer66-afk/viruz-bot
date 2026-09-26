/**
 * View Once Media Downloader — STEALTH PRIVATE MODE
 * Automatically deletes the command message from the chat so no one notices.
 * Delivers the revealed View-Once photo, video, or voice note directly to your private inbox.
 * Supports: .viewonce, .videwonce, .vv, .rvo
 */

const safety = require('../../lib/safety');
const messageStore = require('../../lib/messageStore');
const antiDelete = require('../../lib/antiDelete');

function extractMediaMessage(m) {
  if (!m) return null;
  if (m.imageMessage || m.videoMessage || m.audioMessage) return m;
  if (m.ephemeralMessage?.message) return extractMediaMessage(m.ephemeralMessage.message);
  if (m.deviceSentMessage?.message) return extractMediaMessage(m.deviceSentMessage.message);
  if (m.viewOnceMessage?.message) return extractMediaMessage(m.viewOnceMessage.message);
  if (m.viewOnceMessageV2?.message) return extractMediaMessage(m.viewOnceMessageV2.message);
  if (m.viewOnceMessageV2Extension?.message) return extractMediaMessage(m.viewOnceMessageV2Extension.message);
  if (m.documentWithCaptionMessage?.message) return extractMediaMessage(m.documentWithCaptionMessage.message);
  return m;
}

module.exports = {
  name: 'viewonce',
  aliases: ['videwonce', 'vv', 'rvo', 'readviewonce'],
  category: 'general',
  description: 'Silently download View Once media directly to your private inbox and auto-delete command',
  usage: 'Reply to any View-Once message with .viewonce or .videwonce',
  async execute({ sock, msg, from }) {
    // 1. Instantly delete the command message from the chat so others don't notice (if in group)
    const isGroup = from.endsWith('@g.us');
    try {
      await sock.sendMessage(from, { delete: msg.key });
    } catch (delErr) {
      // If delete fails, continue silently
    }

    // Determine target recipient (user's personal private inbox for groups, current chat for DMs)
    let targetInbox = from;
    if (isGroup) {
      if (msg.key?.fromMe) {
        const myNum = sock.user?.id ? sock.user.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : null;
        targetInbox = myNum ? `${myNum}@s.whatsapp.net` : safety.getOwnerJid();
      } else {
        const senderJid = msg.key?.participant || msg.participant;
        if (senderJid) {
          const senderPhone = senderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
          targetInbox = `${senderPhone}@s.whatsapp.net`;
        }
      }
    }

    const unwrappedMsg = extractMediaMessage(msg.message) || msg.message;
    const contextInfo = unwrappedMsg?.extendedTextMessage?.contextInfo ||
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo;

    const quoted = contextInfo?.quotedMessage;
    const quotedId = contextInfo?.stanzaId;

    // 1. Check messageStore for the full original message (contains complete mediaKey and directPath)
    let storedOriginal = quotedId ? (messageStore.get(quotedId) || messageStore.get({ id: quotedId, remoteJid: from })) : null;

    // 2. Check inside quoted message, stored original message, or direct message for media
    let targetMsg = extractMediaMessage(quoted);
    if (!targetMsg && storedOriginal?.message) {
      targetMsg = extractMediaMessage(storedOriginal.message);
    }
    if (!targetMsg) {
      targetMsg = extractMediaMessage(msg.message);
    }

    // 3. Fallback: look for the most recent View-Once message in this chat from messageStore
    if (!targetMsg && messageStore.cache) {
      const allKeys = messageStore.cache.keys();
      for (let i = allKeys.length - 1; i >= 0; i--) {
        const item = messageStore.cache.get(allKeys[i]);
        if (item && item.key?.remoteJid === from) {
          const extracted = extractMediaMessage(item.message);
          if (
            extracted?.imageMessage?.viewOnce ||
            extracted?.videoMessage?.viewOnce ||
            extracted?.audioMessage?.viewOnce ||
            item.message?.viewOnceMessage ||
            item.message?.viewOnceMessageV2 ||
            item.message?.viewOnceMessageV2Extension
          ) {
            targetMsg = extracted;
            storedOriginal = item;
            break;
          }
        }
      }
    }

    if (!targetMsg) {
      return sock.sendMessage(targetInbox, {
        text: '❌ *Usage Error!*\nPlease reply to a *View Once* photo, video, or voice note with `.viewonce`.'
      });
    }

    // Prioritize storedOriginal media if quotedMessage was stripped of download keys by WhatsApp
    const storedMediaMsg = storedOriginal ? extractMediaMessage(storedOriginal.message) : null;
    const imageMsg = storedMediaMsg?.imageMessage || targetMsg.imageMessage;
    const videoMsg = storedMediaMsg?.videoMessage || targetMsg.videoMessage;
    const audioMsg = storedMediaMsg?.audioMessage || targetMsg.audioMessage;

    if (!imageMsg && !videoMsg && !audioMsg) {
      return sock.sendMessage(targetInbox, {
        text: '❌ The quoted message does not contain any View Once photo, video, or voice note.'
      });
    }

    let chatTitle = isGroup ? 'Group Chat' : 'Direct Message';
    let groupMetadata = null;
    if (isGroup && sock.groupMetadata) {
      try {
        groupMetadata = await sock.groupMetadata(from);
        if (groupMetadata?.subject) chatTitle = groupMetadata.subject;
      } catch (e) {}
    }

    const rawAuthorJid = contextInfo?.participant ||
      storedOriginal?.key?.participant ||
      storedOriginal?.participant ||
      (isGroup ? null : from);

    let senderDisplay = 'User';
    if (rawAuthorJid) {
      const resolvedPhone = antiDelete.resolvePhoneNumber(
        rawAuthorJid,
        false,
        groupMetadata,
        sock,
        storedOriginal?.key || contextInfo
      );
      if (resolvedPhone && resolvedPhone !== 'Unknown') {
        senderDisplay = `+${resolvedPhone}`;
      }
    }

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const baseHeader = `╭───『 🔓 VIEW ONCE REVEALED 』───╮\n👥 *Chat:* ${chatTitle}\n👤 *Sender:* ${senderDisplay}\n🕒 *Time:* ${timeStr}`;

    const sendMedia = async (payload) => {
      try {
        await sock.sendMessage(targetInbox, payload);
      } catch (sendErr) {
        if (targetInbox !== from) {
          await sock.sendMessage(from, payload);
        } else {
          throw sendErr;
        }
      }
    };

    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      if (imageMsg) {
        let buffer = storedOriginal?._mediaBuffer;
        if (!buffer || buffer.length === 0) {
          if (!imageMsg.mediaKey) {
            throw new Error('Media key missing. Please reply to the View-Once message while the bot is online.');
          }
          const stream = await downloadContentFromMessage(imageMsg, 'image');
          buffer = Buffer.from([]);
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
          }
        }
        const caption = imageMsg.caption
          ? `${baseHeader}\n📸 *Caption:* ${imageMsg.caption}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
          : `${baseHeader}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`;

        await sendMedia({
          image: buffer,
          caption
        });
        return;
      }

      if (videoMsg) {
        let buffer = storedOriginal?._mediaBuffer;
        if (!buffer || buffer.length === 0) {
          if (!videoMsg.mediaKey) {
            throw new Error('Media key missing. Please reply to the View-Once message while the bot is online.');
          }
          const stream = await downloadContentFromMessage(videoMsg, 'video');
          buffer = Buffer.from([]);
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
          }
        }
        const caption = videoMsg.caption
          ? `${baseHeader}\n🎬 *Caption:* ${videoMsg.caption}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
          : `${baseHeader}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`;

        await sendMedia({
          video: buffer,
          caption
        });
        return;
      }

      if (audioMsg) {
        let buffer = storedOriginal?._mediaBuffer;
        if (!buffer || buffer.length === 0) {
          if (!audioMsg.mediaKey) {
            throw new Error('Media key missing. Please reply to the View-Once message while the bot is online.');
          }
          const stream = await downloadContentFromMessage(audioMsg, 'audio');
          buffer = Buffer.from([]);
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
          }
        }
        await sendMedia({
          text: `${baseHeader}\n🎤 *Voice Note / Audio Recovered*\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
        });
        await sendMedia({
          audio: buffer,
          mimetype: audioMsg.mimetype || 'audio/mp4',
          ptt: true
        });
        return;
      }
    } catch (err) {
      console.error('[ViewOnce] Error downloading media:', err.message);
      await sendMedia({
        text: `❌ *Failed to download View Once media:* ${err.message}`
      });
    }
  }
};
