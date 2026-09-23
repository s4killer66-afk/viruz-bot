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

    // Fallback: If groupMetadata was not cached, attempt direct fetch
    if (!groupMetadata && typeof sock.groupMetadata === 'function') {
      try {
        groupMetadata = await sock.groupMetadata(from);
      } catch (e) {}
    }

    // REQUIREMENT: Admin exclusive command
    if (!moderator.isGroupAdmin(sender, groupMetadata, msg)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nThe `.kick` command is exclusively reserved for Group Admins.'
      }, { quoted: msg });
    }

    // Verify bot has admin permissions in the group
    if (groupMetadata && !moderator.isBotAdmin(sock, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⚠️ *Bot is not an Admin!*\nPlease promote the bot to Group Admin so it can remove members.'
      }, { quoted: msg });
    }

    // Determine target user using universal resolution (quoted message, mention, or typed number)
    const resolved = moderator.resolveTarget(msg, args, groupMetadata);
    const targetJid = resolved.targetJid;

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
      const errMsg = (err.message || '').toLowerCase();
      if (errMsg.includes('not-authorized') || errMsg.includes('forbidden') || errMsg.includes('401') || errMsg.includes('403')) {
        await sock.sendMessage(from, {
          text: '⚠️ *Failed to kick:* Bot is not an Admin in this group! Please promote the bot to Admin.'
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `❌ *Failed to kick:* ${err.message}\n(Make sure the bot has Admin rights in this group!)`
        }, { quoted: msg });
      }
    }
  }
};
