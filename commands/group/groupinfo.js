const { atlasBox } = require('../../lib/utils');
const config = require('../../config');

module.exports = {
  name: 'groupinfo',
  aliases: ['gcinfo', 'infogroup'],
  category: 'group',
  description: 'View group details, admin list, and active anti-spam rules',
  usage: '.groupinfo',
  async execute({ sock, msg, from, isGroup, groupMetadata }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    const participants = groupMetadata.participants || [];
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');

    const body = `
👥 *Group Name:* ${groupMetadata.subject}
🆔 *Group ID:* ${groupMetadata.id}
👑 *Total Members:* ${participants.length}
🛡️ *Admins:* ${admins.length}

🛡️ *ACTIVE MODERATION RULES:*
• *Sticker Spam:* Warning at ${config.antiSpam.stickerWarningThreshold} | Kick at ${config.antiSpam.stickerKickThreshold}
• *Message Spam:* Warning at ${config.antiSpam.messageWarningThreshold} | Kick at ${config.antiSpam.messageKickThreshold}
• *Admin Immunity:* ✅ Permanently Active (Admins cannot be kicked or warned)
• *Exclusive Commands:* .kick, .add, .tagall, .mute, .unmute
`.trim();

    const output = atlasBox('GROUP INFORMATION', body);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
  }
};
