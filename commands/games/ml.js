const { checkMobileLegends } = require('../../lib/gameChecker');

module.exports = {
  name: 'ml',
  aliases: ['mlbb', 'mobilelegends'],
  category: 'games',
  description: 'Check Mobile Legends account username, region, server, flag, active passes and subscription offers',
  usage: '.ml <account_id> <zone_id>',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nFormat: `.ml <account_id> <zone_id>`\n*Example:* `.ml 1114917746 13486`'
      }, { quoted: msg });
    }

    const rawId = args[0];
    const zoneId = args[1];
    console.log('[ML Command Input]', { rawId, zoneId, args, text: msg.message?.conversation || msg.message?.extendedTextMessage?.text });

    await sock.sendMessage(from, { text: '🔍 _Fetching Mobile Legends account info..._' }, { quoted: msg });

    try {
      const result = await checkMobileLegends(rawId, zoneId);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
