const moderator = require('../../lib/groupModerator');

module.exports = {
  name: 'unmute',
  aliases: ['opengroup', 'open'],
  category: 'group',
  description: 'Unmute group chat so all members can send messages',
  usage: '.unmute',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    if (!moderator.isGroupAdmin(sender, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly Group Admins can unmute the group.'
      }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(from, 'not_announcement');
      await sock.sendMessage(from, {
        text: '🔓 *Group Unmuted!*\nAll members can now send messages.'
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ *Failed to unmute group:* ${err.message}`
      }, { quoted: msg });
    }
  }
};
