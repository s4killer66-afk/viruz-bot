const moderator = require('../../lib/groupModerator');

module.exports = {
  name: 'hidetag',
  aliases: ['htag', 'tag'],
  category: 'group',
  description: 'Send a message with invisible mentions to all members',
  usage: '.hidetag <message>',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata, args }) {
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
        text: '⛔ *Access Denied!*\nOnly Group Admins can use hidetag.'
      }, { quoted: msg });
    }

    const participants = groupMetadata?.participants || [];
    const mentions = participants.map(p => p.id).filter(Boolean);
    const text = args.join(' ') || '📢 Group Notification';

    await sock.sendMessage(from, { text, mentions });
  }
};
