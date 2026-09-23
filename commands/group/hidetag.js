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

    // Ensure we have valid groupMetadata with participants
    if ((!groupMetadata || !Array.isArray(groupMetadata.participants) || groupMetadata.participants.length === 0) && typeof sock.groupMetadata === 'function') {
      try {
        groupMetadata = await sock.groupMetadata(from);
      } catch (e) {}
    }

    // Verify sender is admin (with automatic fresh fetch retry in case of recent promotions)
    let isAdmin = moderator.isGroupAdmin(sender, groupMetadata, msg);
    if (!isAdmin && typeof sock.groupMetadata === 'function') {
      try {
        const freshMeta = await sock.groupMetadata(from);
        if (freshMeta && Array.isArray(freshMeta.participants) && freshMeta.participants.length > 0) {
          groupMetadata = freshMeta;
          const groupMetadataCache = require('../../lib/groupMetadataCache');
          groupMetadataCache.set(from, freshMeta);
          isAdmin = moderator.isGroupAdmin(sender, groupMetadata, msg);
        }
      } catch (e) {}
    }

    if (!isAdmin) {
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
