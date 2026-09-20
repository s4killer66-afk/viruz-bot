/**
 * Bot On/Off Master Switch — Owner Only
 * .bot on  — Enable all bot features
 * .bot off — Disable all bot features (only .bot still works for owner)
 */

const safety = require('../../lib/safety');

module.exports = {
  name: 'bot',
  aliases: ['viruz', 'switch', 'power'],
  category: 'admin',
  description: 'Turn the bot on or off (Owner exclusive)',
  usage: '.bot [on/off]',
  async execute({ sock, msg, from, sender, args }) {
    // OWNER-ONLY command
    const senderPhone = (sender || '').split('@')[0].split(':')[0];
    if (!safety.isOwner(sender) && !msg.key.fromMe) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nOnly the bot owner can turn the bot on or off.'
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
        text: '🔴 *VIRUZ Bot is now OFFLINE!*\nAll commands are disabled.\nOnly `.bot on` from the owner will re-enable the bot.'
      }, { quoted: msg });
    }

    // No argument — show current status
    const status = safety.isBotEnabled() ? '🟢 *ONLINE*' : '🔴 *OFFLINE*';
    await sock.sendMessage(from, {
      text: `🤖 *VIRUZ Bot Status:* ${status}\n\n• Use \`.bot on\` to enable.\n• Use \`.bot off\` to disable.\n\n_Only the bot owner can use this command._`
    }, { quoted: msg });
  }
};
