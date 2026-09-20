const moderator = require('../../lib/groupModerator');
const welcomeHandler = require('../../lib/welcomeHandler');

module.exports = {
  name: 'kick',
  aliases: ['remove', 'ban'],
  category: 'group',
  description: 'Kick a member from the group (Admin exclusive, Admins protected)',
  usage: '.kick @user (or reply to user message)',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata, botJid, args }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    // REQUIREMENT: Admin exclusive command
    if (!moderator.isGroupAdmin(sender, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nThe `.kick` command is exclusively reserved for Group Admins.'
      }, { quoted: msg });
    }

    // Determine target user
    let targetJid = null;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (quoted) {
      targetJid = quoted;
    } else if (mentioned) {
      targetJid = mentioned;
    } else if (args[0]) {
      const cleanNum = args[0].replace(/[^0-9]/g, '');
      if (cleanNum.length >= 7) {
        targetJid = `${cleanNum}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nPlease mention `@user` or reply to their message to kick.\n*Example:* `.kick @user`'
      }, { quoted: msg });
    }

    // REQUIREMENT: Check if target can be kicked (Admins protected, no one can kick admins)
    const check = moderator.canKickUser(targetJid, botJid, groupMetadata);
    if (!check.allowed) {
      return sock.sendMessage(from, { text: check.reason }, { quoted: msg });
    }

    try {
      welcomeHandler.recordKick(from, targetJid, sender);
      await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
      if (!welcomeHandler.isEnabled(from)) {
        await sock.sendMessage(from, {
          text: `🚪 *Member Kicked!*\nSuccessfully removed @${targetJid.split('@')[0]} from the group.`,
          mentions: [targetJid]
        }, { quoted: msg });
      }
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ *Failed to kick:* ${err.message}\n(Make sure the bot has Admin rights in this group!)`
      }, { quoted: msg });
    }
  }
};
