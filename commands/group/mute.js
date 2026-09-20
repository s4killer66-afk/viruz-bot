const moderator = require('../../lib/groupModerator');

module.exports = {
  name: 'mute',
  aliases: ['closegroup', 'close'],
  category: 'group',
  description: 'Mute group chat so only admins can send messages',
  usage: '.mute',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    if (!moderator.isGroupAdmin(sender, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly Group Admins can mute the group.'
      }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(from, 'announcement');
      await sock.sendMessage(from, {
        text: '🔒 *Group Muted!*\nOnly group admins can now send messages.'
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ *Failed to mute group:* ${err.message}`
      }, { quoted: msg });
    }
  }
};
