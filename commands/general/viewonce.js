/**
 * View Once Media Downloader — STEALTH PRIVATE MODE
 * Automatically deletes the command message from the chat so no one notices.
 * Delivers the revealed View-Once photo, video, or voice note directly to your private inbox.
 * Supports: .viewonce, .videwonce, .vv, .rvo
 */

const safety = require('../../lib/safety');

function extractMediaMessage(m) {
  if (!m) return null;
  if (m.imageMessage || m.videoMessage || m.audioMessage) return m;
  if (m.ephemeralMessage?.message) return extractMediaMessage(m.ephemeralMessage.message);
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
    // 1. Instantly delete the command message from the chat so others don't notice
    try {
      await sock.sendMessage(from, { delete: msg.key });
    } catch (delErr) {
      // If delete fails, continue silently
    }

    // Determine target recipient (user's personal private inbox)
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const senderPhone = (senderJid || '').split('@')[0].split(':')[0];
    let targetInbox = null;
    if (senderPhone && safety.isOwner(senderPhone)) {
      targetInbox = `${senderPhone}@s.whatsapp.net`;
    } else if (sock.user?.id) {
      const myNum = sock.user.id.split(':')[0].split('@')[0];
      targetInbox = `${myNum}@s.whatsapp.net`;
    } else {
      targetInbox = safety.getOwnerJid();
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;
    const directMsg = msg.message;

    // Check inside quoted message or current message for media
    const targetMsg = extractMediaMessage(quoted) || extractMediaMessage(directMsg);

    if (!targetMsg) {
      return sock.sendMessage(targetInbox, {
        text: '❌ *Usage Error!*\nPlease reply to a *View Once* photo, video, or voice note with `.viewonce`.'
      });
    }

    const imageMsg = targetMsg.imageMessage;
    const videoMsg = targetMsg.videoMessage;
    const audioMsg = targetMsg.audioMessage;

    if (!imageMsg && !videoMsg && !audioMsg) {
      return sock.sendMessage(targetInbox, {
        text: '❌ The quoted message does not contain any View Once photo, video, or voice note.'
      });
    }

    const isGroup = from.endsWith('@g.us');
    let chatTitle = isGroup ? 'Group Chat' : 'Direct Message';
    if (isGroup && sock.groupMetadata) {
      try {
        const meta = await sock.groupMetadata(from);
        if (meta?.subject) chatTitle = meta.subject;
      } catch (e) {}
    }

    const quotedAuthor = contextInfo?.participant || (isGroup ? null : from);
    const authorPhone = quotedAuthor ? quotedAuthor.split('@')[0].split(':')[0] : 'Unknown';
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const baseHeader = `╭───『 🔓 VIEW ONCE REVEALED 』───╮\n👥 *Chat:* ${chatTitle}\n👤 *Sender:* +${authorPhone}\n🕒 *Time:* ${timeStr}`;

    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      if (imageMsg) {
        const stream = await downloadContentFromMessage(imageMsg, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = imageMsg.caption
          ? `${baseHeader}\n📸 *Caption:* ${imageMsg.caption}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
          : `${baseHeader}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`;

        await sock.sendMessage(targetInbox, {
          image: buffer,
          caption
        });
        return;
      }

      if (videoMsg) {
        const stream = await downloadContentFromMessage(videoMsg, 'video');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = videoMsg.caption
          ? `${baseHeader}\n🎬 *Caption:* ${videoMsg.caption}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
          : `${baseHeader}\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`;

        await sock.sendMessage(targetInbox, {
          video: buffer,
          caption
        });
        return;
      }

      if (audioMsg) {
        const stream = await downloadContentFromMessage(audioMsg, 'audio');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        await sock.sendMessage(targetInbox, {
          text: `${baseHeader}\n🎤 *Voice Note / Audio Recovered*\n╰───『 VIRUZ • PRIVATE MEDIA 』───╯`
        });
        await sock.sendMessage(targetInbox, {
          audio: buffer,
          mimetype: audioMsg.mimetype || 'audio/mp4',
          ptt: true
        });
        return;
      }
    } catch (err) {
      console.error('[ViewOnce] Error downloading media:', err.message);
      await sock.sendMessage(targetInbox, {
        text: `❌ *Failed to download View Once media:* ${err.message}`
      });
    }
  }
};
