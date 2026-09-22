/**
 * Bot On/Off Master Switch — Group Admins & Owner
 * .bot on  — Enable all bot features
 * .bot off — Disable all bot features
 */

const safety = require('../../lib/safety');
const moderator = require('../../lib/groupModerator');

module.exports = {
  name: 'bot',
  aliases: ['viruz', 'switch', 'power'],
  category: 'admin',
  description: 'Turn the bot on or off (Group Admins & Owner)',
  usage: '.bot [on/off]',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args }) {
    const isOwner = safety.isOwner(sender) || msg.key.fromMe;
    const isAdmin = isGroup && moderator.isGroupAdmin(sender, groupMetadata);

    if (!isOwner && !isAdmin) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly Group Admins and the Bot Owner can turn the bot on or off.'
      }, { quoted: msg });
    }

    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'enable' || action === '1') {
      safety.setBotEnabled(true);
      return sock.sendMessage(from, {
        text: '✅ *VIRUZ Bot is now ONLINE!*\nAll commands, moderation, and features are active.'
      }, { quoted: msg });
    }

    if (action === 'off' || action === 'disable' || action === '0') {
      safety.setBotEnabled(false);
      return sock.sendMessage(from, {
        text: '🔴 *VIRUZ Bot is now OFFLINE!*\nAll commands are temporarily disabled.\nGroup Admins or the Owner can re-enable the bot anytime with `.bot on`.'
      }, { quoted: msg });
    }

    // No argument — show current status
    const status = safety.isBotEnabled() ? '🟢 *ONLINE*' : '🔴 *OFFLINE*';
    await sock.sendMessage(from, {
      text: `🤖 *VIRUZ Bot Status:* ${status}\n\n• Use \`.bot on\` to enable.\n• Use \`.bot off\` to disable.\n\n_Available to Group Admins and the Bot Owner._`
    }, { quoted: msg });
  }
};
