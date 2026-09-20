const { checkGenshinImpact } = require('../../lib/gameChecker');

module.exports = {
  name: 'genshin',
  aliases: ['gi', 'genshinimpact'],
  category: 'games',
  description: 'Check Genshin Impact Traveler UID, server, region, Welkin Moon, Battle Pass, and crystal offers',
  usage: '.genshin <uid>',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nFormat: `.genshin <uid>`\n*Example:* `.genshin 700012345`'
      }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '🔍 _Searching Genshin Impact Traveler profile..._' }, { quoted: msg });

    try {
      const result = await checkGenshinImpact(args[0]);
      await sock.sendMessage(from, { text: result }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
    }
  }
};
