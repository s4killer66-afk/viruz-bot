const os = require('os');
const { atlasBox, formatUptime } = require('../../lib/utils');
const config = require('../../config');

module.exports = {
  name: 'info',
  aliases: ['botinfo', 'status'],
  category: 'general',
  description: 'View system and bot operational status',
  usage: '.info',
  async execute({ sock, msg, from }) {
    const uptime = formatUptime(process.uptime());
    const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);

    const body = `
🤖 *Bot Name:* ${config.botName}
👑 *Owner:* ${config.ownerName}
⏱️ *Uptime:* ${uptime}
💾 *Memory Usage:* ${ramUsed} MB / ${totalRam} GB
🖥️ *Platform:* ${os.platform()} (${os.arch()})
🔗 *Web Dashboard:* http://localhost:${config.port}
`.trim();

    const output = atlasBox('SYSTEM STATUS', body);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
  }
};
