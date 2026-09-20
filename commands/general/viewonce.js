/**
 * View Once Media Downloader — SILENT MODE
 * Downloads view-once media and sends it to the bot owner's OWN inbox (DM to self).
 * Other users in the chat are NOT notified.
 * Supports: .viewonce, .videwonce, .vv, .rvo
 */

const safety = require('../../lib/safety');

module.exports = {
  name: 'viewonce',
  aliases: ['videwonce', 'vv', 'rvo', 'readviewonce'],
  category: 'general',
  description: 'Silently download View Once media to your own inbox',
  usage: 'Reply to any View-Once message with .viewonce or .videwonce',
  async execute({ sock, msg, from }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const directMsg = msg.message;

    // Check inside quoted message or current message for view-once wrappers
    const targetMsg = quoted?.viewOnceMessage?.message ||
      quoted?.viewOnceMessageV2?.message ||
      quoted?.viewOnceMessageV2Extension?.message ||
      quoted ||
      directMsg?.viewOnceMessage?.message ||
      directMsg?.viewOnceMessageV2?.message ||
      null;

    if (!targetMsg) {
      // Send error silently to the user's own chat, not the group
      const ownerJid = safety.getOwnerJid();
      return sock.sendMessage(ownerJid, {
        text: '❌ *Usage Error!*\nPlease reply to a *View Once* photo or video with `.viewonce` or `.videwonce` to download it.'
      });
    }

    const imageMsg = targetMsg.imageMessage;
    const videoMsg = targetMsg.videoMessage;
    const audioMsg = targetMsg.audioMessage;

    if (!imageMsg && !videoMsg && !audioMsg) {
      const ownerJid = safety.getOwnerJid();
      return sock.sendMessage(ownerJid, {
        text: '❌ The quoted message is not a View Once image, video, or voice note!'
      });
    }

    // Determine where to send: always to the bot owner's own private chat (silent)
    const ownerJid = safety.getOwnerJid();

    // React with a tiny emoji on the command message to acknowledge silently
    try {
      await sock.sendMessage(from, {
        react: { text: '🔓', key: msg.key }
      });
    } catch (e) {
      // Reaction failed — not critical, continue
    }

    try {
      const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');

      if (imageMsg) {
        const stream = await downloadContentFromMessage(imageMsg, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }
        const caption = imageMsg.caption
          ? `🔓 *View Once Photo Saved*\n📸 *Caption:* ${imageMsg.caption}`
          : '🔓 *View Once Photo Saved Silently*';
        await sock.sendMessage(ownerJid, {
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
          ? `🔓 *View Once Video Saved*\n🎬 *Caption:* ${videoMsg.caption}`
          : '🔓 *View Once Video Saved Silently*';
        await sock.sendMessage(ownerJid, {
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
        await sock.sendMessage(ownerJid, {
          audio: buffer,
          mimetype: audioMsg.mimetype || 'audio/mp4',
          ptt: true
        });
        return;
      }
    } catch (err) {
      console.error('[ViewOnce] Error downloading media:', err);
      await sock.sendMessage(ownerJid, {
        text: `❌ *Failed to download View Once media:* ${err.message}`
      });
    }
  }
};
