const { checkClashOfClans } = require('../../lib/gameChecker');

module.exports = {
  name: 'coc',
  aliases: ['clashofclans'],
  category: 'games',
  description: 'Check Clash of Clans player tag, Town Hall, Clan, Gold Pass, and active subscription offers',
  usage: '.coc <player_tag>',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nFormat: `.coc <player_tag>`\n*Example:* `.coc #8P0Y8L9V`'
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '🔍 _Searching Clash of Clans village profile..._' }, { quoted: msg });

    try {
      const result = await checkClashOfClans(args[0]);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
