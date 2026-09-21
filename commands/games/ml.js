const { checkMobileLegends } = require('../../lib/gameChecker');
const safety = require('../../lib/safety');

module.exports = {
  name: 'ml',
  aliases: ['mlbb', 'mobilelegends'],
  category: 'games',
  description: 'Check Mobile Legends account username, region, server, flag, active passes and subscription offers',
  usage: '.ml <account_id> <zone_id>',
  async execute({ sock, msg, from, args }) {
    const rawId = args[0];
    const zoneId = args[1];

    // Validate that inputs contain actual IDs before triggering any server lookups
    const combined = `${rawId || ''} ${zoneId || ''}`.trim();
    const digits = combined.match(/\d+/g) || [];
    if (digits.length === 0 || (digits.length === 1 && digits[0].length < 12)) {
      const sent = await sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nPlease provide both Account ID and Server/Zone ID.\n*Format:* `.ml <account_id> <zone_id>`\n*Example:* `.ml 1114917746 13486`'
      }, { quoted: msg });
      if (sent?.key?.id) safety.markSentByBot(sent.key.id);
      return;
    }

    console.log('[ML Command Input]', { rawId, zoneId, args });

    const sentWait = await sock.sendMessage(from, { text: '🔍 _Fetching Mobile Legends account info..._' }, { quoted: msg });
    if (sentWait?.key?.id) safety.markSentByBot(sentWait.key.id);

    try {
      const result = await checkMobileLegends(rawId, zoneId);
      const sentRes = await sock.sendMessage(from, { text: result }, { quoted: msg });
      if (sentRes?.key?.id) safety.markSentByBot(sentRes.key.id);
    } catch (err) {
      const sentErr = await sock.sendMessage(from, { text: `❌ ${err.message}` }, { quoted: msg });
      if (sentErr?.key?.id) safety.markSentByBot(sentErr.key.id);
    }
  }
};
