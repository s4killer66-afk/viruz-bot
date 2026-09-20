const antiDelete = require('../../lib/antiDelete');

module.exports = {
  name: 'antidelete',
  aliases: ['antidelet', 'antidel', 'antirevoke'],
  category: 'admin',
  description: 'Enable or disable Anti-Delete message recovery',
  usage: '.antidelete [on/off]',
  async execute({ sock, msg, from, args }) {
    const action = args[0]?.toLowerCase();

    if (action === 'on' || action === 'enable' || action === '1') {
      antiDelete.enabled = true;
      return sock.sendMessage(from, {
        text: '🛡️ *Anti-Delete Enabled!*\nThe bot will now automatically recover deleted messages and media in this chat.'
      }, { quoted: msg });
    }

    if (action === 'off' || action === 'disable' || action === '0') {
      antiDelete.enabled = false;
      return sock.sendMessage(from, {
        text: '⚠️ *Anti-Delete Disabled!*\nDeleted messages will not be recovered.'
      }, { quoted: msg });
    }

    // Toggle if no argument
    antiDelete.enabled = !antiDelete.enabled;
    const status = antiDelete.enabled ? '🟢 *ENABLED*' : '🔴 *DISABLED*';
    await sock.sendMessage(from, {
      text: `🛡️ *Anti-Delete Status:* ${status}\n\nUse \`.antidelete on\` to activate or \`.antidelete off\` to deactivate.`
    }, { quoted: msg });
  }
};
