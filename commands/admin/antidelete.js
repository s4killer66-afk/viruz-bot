const antiDelete = require('../../lib/antiDelete');
const safety = require('../../lib/safety');

module.exports = {
  name: 'antidelete',
  aliases: ['antidelet', 'antidel', 'antirevoke'],
  category: 'admin',
  description: 'Enable, disable or check stealth Anti-Delete message recovery',
  usage: '.antidelete [on/off/status]',
  async execute({ sock, msg, from, sender, args }) {
    const isOwner = safety.isOwner(sender) || msg.key.fromMe;
    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'enable' || action === '1') {
      if (!isOwner) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly the bot owner can configure Anti-Delete.'
        }, { quoted: msg });
      }
      antiDelete.setEnabled(true);
      return sock.sendMessage(from, {
        text: '🛡️ *Anti-Delete Enabled!* 🟢\n\nAll deleted messages (text, photos, videos, voice notes, stickers) will be caught stealthily and sent directly to your private inbox.\nNo notifications or tags will be sent to the group or chat.'
      }, { quoted: msg });
    }

    if (action === 'off' || action === 'disable' || action === '0') {
      if (!isOwner) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly the bot owner can configure Anti-Delete.'
        }, { quoted: msg });
      }
      antiDelete.setEnabled(false);
      return sock.sendMessage(from, {
        text: '⚠️ *Anti-Delete Disabled!* 🔴\nDeleted messages will not be recovered.'
      }, { quoted: msg });
    }

    if (action === 'toggle') {
      if (!isOwner) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly the bot owner can configure Anti-Delete.'
        }, { quoted: msg });
      }
      antiDelete.setEnabled(!antiDelete.isEnabled());
      const newStatus = antiDelete.isEnabled() ? '🟢 *ENABLED* (Stealth Private DM)' : '🔴 *DISABLED*';
      return sock.sendMessage(from, {
        text: `🛡️ *Anti-Delete Status Changed:* ${newStatus}`
      }, { quoted: msg });
    }

    // Default: Show current status WITHOUT toggling!
    const status = antiDelete.isEnabled() ? '🟢 *ENABLED* (Stealth Private DM)' : '🔴 *DISABLED*';
    await sock.sendMessage(from, {
      text: `🛡️ *Anti-Delete Status:* ${status}\n\n• Use \`.antidelete on\` to activate.\n• Use \`.antidelete off\` to deactivate.\n\n_When enabled, all deleted messages are recovered silently and sent to your private inbox._`
    }, { quoted: msg });
  }
};
