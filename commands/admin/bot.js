/**
 * Bot On/Off Master Switch — Owner Only
 * .bot on  — Enable all bot features
 * .bot off — Disable all bot features (only .bot still works for owner)
 */

const safety = require('../../lib/safety');
const groupModerator = require('../../lib/groupModerator');

module.exports = {
  name: 'bot',
  aliases: ['viruz', 'switch', 'power'],
  category: 'admin',
  description: 'Turn the bot on or off (Admins and Owner)',
  usage: '.bot [on/off]',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args }) {
    const isOwner = safety.isOwner(sender) || msg.key.fromMe;
    const isAdmin = isGroup ? groupModerator.isGroupAdmin(sender, groupMetadata) : false;

    // Must be either a group admin or the bot owner
    if (!isOwner && !isAdmin) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly group admins or the bot owner can turn the bot on or off.'
      }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'enable' || action === '1') {
      if (isGroup) {
        groupModerator.setBotEnabledInGroup(from, true);
      }
      if (isOwner) {
        safety.setBotEnabled(true);
      }
      return sock.sendMessage(from, {
        text: isGroup
          ? '✅ *VIRUZ Bot is now ONLINE in this group!*\nAll commands, moderation, and features are active.'
          : '✅ *VIRUZ Bot is now ONLINE globally!*\nAll commands and features are active.'
      }, { quoted: msg });
    }

    if (action === 'off' || action === 'disable' || action === '0') {
      if (isGroup) {
        groupModerator.setBotEnabledInGroup(from, false);
      } else if (isOwner) {
        safety.setBotEnabled(false);
      }
      return sock.sendMessage(from, {
        text: isGroup
          ? '🔴 *VIRUZ Bot is now OFFLINE in this group!*\nCommands are paused in this chat.\nAdmins or the owner can turn it back on anytime with `.bot on`.'
          : '🔴 *VIRUZ Bot is now OFFLINE globally!*\nAll commands disabled. Only `.bot on` from owner will re-enable.'
      }, { quoted: msg });
    }

    // No argument — show current status
    const groupStatus = isGroup
      ? (groupModerator.isBotEnabledInGroup(from) ? '🟢 *ONLINE*' : '🔴 *OFFLINE*')
      : (safety.isBotEnabled() ? '🟢 *ONLINE*' : '🔴 *OFFLINE*');

    await sock.sendMessage(from, {
      text: `🤖 *VIRUZ Bot Status:* ${groupStatus}\n\n• Use \`.bot on\` to enable.\n• Use \`.bot off\` to disable.\n\n_Available to group admins and bot owner._`
    }, { quoted: msg });
  }
};
