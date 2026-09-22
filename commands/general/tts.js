const { resolveCharacter, generateAnimeTts, CHARACTERS } = require('../../lib/animeTts');
const safety = require('../../lib/safety');
const config = require('../../config');

module.exports = {
  name: 'tts',
  aliases: ['animetts', 'voice', 'say'],
  category: 'general',
  description: 'Generate anime character voice notes (Goku, Gojo, Sukuna, Makima, Eren...)',
  usage: '.tts <character> <message>',
  async execute({ sock, msg, from, args }) {
    const p = config.prefix || '.';

    // If no arguments provided, show attractive character guide & usage
    if (!args || args.length === 0) {
      const charList = [
        '• *Goku / Dragon Ball* (`goku`, `dbz`) - Saiyan Warrior',
        '• *Gojo Satoru* (`gojo`) - The Honored One',
        '• *Ryomen Sukuna* (`sukuna`, `sakuna`) - King of Curses',
        '• *Makima* (`makima`) - Control Devil',
        '• *Eren Yeager* (`eren`) - Attack Titan',
        '• *Naruto Uzumaki* (`naruto`) - 7th Hokage',
        '• *Vegeta* (`vegeta`) - Saiyan Prince',
        '• *Levi Ackerman* (`levi`) - Humanity\'s Strongest'
      ].join('\n');

      const helpText = `🎙️ *VIRUZ ANIME TTS (VOICE NOTE)* 🎙️\n\n` +
        `Convert your text into an anime character voice note!\n\n` +
        `*Usage:*\n` +
        `• \`${p}tts <character> <message>\`\n\n` +
        `*Examples:*\n` +
        `• \`${p}tts goku Kamehameha is my attack!\`\n` +
        `• \`${p}tts gojo Throughout heaven and earth, I alone am the honored one.\`\n` +
        `• \`${p}tts sukuna Know your place, fool.\`\n` +
        `• \`${p}tts makima A dog must obey its master.\`\n` +
        `• \`${p}tts eren If we kill all our enemies, will we be free?\`\n\n` +
        `🎭 *Supported Characters:*\n` +
        `${charList}`;

      const sent = await sock.sendMessage(from, { text: helpText }, { quoted: msg });
      if (sent?.key?.id) safety.markSentByBot(sent.key.id);
      return;
    }

    let targetCharKey = 'goku';
    let textToSpeak = '';

    const firstWord = args[0].toLowerCase();
    const matched = resolveCharacter(firstWord);

    if (matched) {
      targetCharKey = matched.id;
      textToSpeak = args.slice(1).join(' ').trim();
    } else {
      // First word is not a recognized character -> Default to Goku and use all args as text
      targetCharKey = 'goku';
      textToSpeak = args.join(' ').trim();
    }

    if (!textToSpeak) {
      const charObj = CHARACTERS[targetCharKey] || CHARACTERS.goku;
      const sent = await sock.sendMessage(from, {
        text: `⚠️ *VIRUZ TTS:* Please provide a message for *${charObj.name}* to say!\n\n*Example:* \`${p}tts ${targetCharKey} Hello there!\``
      }, { quoted: msg });
      if (sent?.key?.id) safety.markSentByBot(sent.key.id);
      return;
    }

    // Limit text to 300 chars to avoid timeout or excessive duration
    if (textToSpeak.length > 300) {
      textToSpeak = textToSpeak.slice(0, 300);
    }

    try {
      const result = await generateAnimeTts(targetCharKey, textToSpeak);

      const sent = await sock.sendMessage(from, {
        audio: result.buffer,
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: msg });

      if (sent?.key?.id) {
        safety.markSentByBot(sent.key.id);
      }
    } catch (err) {
      console.error('[Command: tts] Generation error:', err);
      const sent = await sock.sendMessage(from, {
        text: `❌ *TTS Error:* Failed to generate voice note. ${err.message}`
      }, { quoted: msg });
      if (sent?.key?.id) safety.markSentByBot(sent.key.id);
    }
  }
};
