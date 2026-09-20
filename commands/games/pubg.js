const { checkPUBGMobile } = require('../../lib/gameChecker');

module.exports = {
  name: 'pubg',
  aliases: ['pubgm', 'pubgmobile'],
  category: 'games',
  description: 'Check PUBG Mobile player nickname, server, region, country flag, Royale Pass, Prime Plus and offers',
  usage: '.pubg <player_id>',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nFormat: `.pubg <player_id>`\n*Example:* `.pubg 5123456789`'
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '🔍 _Searching PUBG Mobile player profile..._' }, { quoted: msg });

    try {
      const result = await checkPUBGMobile(args[0]);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
