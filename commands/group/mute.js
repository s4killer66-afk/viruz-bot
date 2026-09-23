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

    // Fallback: If groupMetadata was not cached, attempt direct fetch
    if (!groupMetadata && typeof sock.groupMetadata === 'function') {
      try {
        groupMetadata = await sock.groupMetadata(from);
      } catch (e) {}
    }

    if (!moderator.isGroupAdmin(sender, groupMetadata, msg)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly Group Admins can mute the group.'
      }, { quoted: msg });
    }

    // Verify bot has admin permissions in the group
    if (groupMetadata && !moderator.isBotAdmin(sock, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⚠️ *Bot is not an Admin!*\nPlease promote the bot to Group Admin so it can change group settings.'
      }, { quoted: msg });
    }

    try {
      await sock.groupSettingUpdate(from, 'announcement');
      await sock.sendMessage(from, {
        text: '🔒 *Group Muted!*\nOnly group admins can now send messages.'
      }, { quoted: msg });
    } catch (err) {
      const errMsg = (err.message || '').toLowerCase();
      if (errMsg.includes('not-authorized') || errMsg.includes('forbidden') || errMsg.includes('401') || errMsg.includes('403')) {
        await sock.sendMessage(from, {
          text: '⚠️ *Action Failed: Bot is not an Admin!*\nPlease promote the bot to Group Admin to mute the group.'
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `❌ *Failed to mute group:* ${err.message}`
        }, { quoted: msg });
      }
    }
  }
};
