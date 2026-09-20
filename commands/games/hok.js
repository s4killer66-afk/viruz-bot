const { checkHonorOfKings } = require('../../lib/gameChecker');

module.exports = {
  name: 'hok',
  aliases: ['honorofkings'],
  category: 'games',
  description: 'Check Honor of Kings player nickname, server, Honor Pass, and token rebate subscription offers',
  usage: '.hok <player_id>',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nFormat: `.hok <player_id>`\n*Example:* `.hok 1234567890`'
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '🔍 _Searching Honor of Kings player profile..._' }, { quoted: msg });

    try {
      const result = await checkHonorOfKings(args[0]);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
