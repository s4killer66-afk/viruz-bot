const moderator = require('../../lib/groupModerator');
const { atlasBox } = require('../../lib/utils');

module.exports = {
  name: 'tagall',
  aliases: ['everyone', 'all'],
  category: 'group',
  description: 'Mention all group members (Admin exclusive)',
  usage: '.tagall [announcement_message]',
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
        text: '⛔ *Access Denied!*\nOnly Group Admins can mention everyone.'
      }, { quoted: msg });
    }

    const subject = groupMetadata?.subject || 'Group';
    const participants = groupMetadata?.participants || [];
    const mentions = participants.map(p => p.id).filter(Boolean);
    const customMsg = args.join(' ') || 'Attention everyone!';

    let list = `📢 *Announcement:* ${customMsg}\n👥 *Total Members:* ${participants.length}\n\n`;
    participants.forEach((p, idx) => {
      list += `${idx + 1}. @${p.id.split('@')[0]}\n`;
    });

    const output = atlasBox(`TAG ALL • ${subject}`, list.trim());
    await sock.sendMessage(from, { text: output, mentions }, { quoted: msg });
  }
};
