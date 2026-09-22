const { resolveHero, generateHeroTTS, getHeroCatalog, HERO_VOICES } = require('../../lib/heroVoices');
const safety = require('../../lib/safety');

module.exports = {
  name: 'tts',
  aliases: ['tt', 'mltts', 'herotts', 'vn', 'voicenote'],
  category: 'games',
  description: 'Convert text to Mobile Legends hero voice notes (Vale, Valir, Vexana, Gusion, Layla, and more)',
  usage: '.tts <hero> <message> | .tt <hero> <message> | .tts list',
  async execute({ sock, msg, from, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *Mobile Legends Hero Voice TTS (For Everyone)*\n\n*Format:* `.tts <hero> <message>` or `.tt <hero> <message>`\n*Examples:*\n• `.tts vale Wind is my power!`\n• `.tts valir Everything shall burn to ashes!`\n• `.tts vexana Fear the undead queen!`\n• `.tts gusion Break the limits of speed!`\n• `.tt layla Keep it up, we can do it!`\n• `.tts list` (View all 20+ MLBB heroes)'
      }, { quoted: msg });
    }

    const firstWord = args[0].toLowerCase();

    // ── Subcommand: View list of heroes ──
    if (firstWord === 'list' || firstWord === 'heroes' || firstWord === 'help') {
      const catalog = getHeroCatalog();
      return sock.sendMessage(from, { text: catalog }, { quoted: msg });
    }

    // Determine target hero and speech text
    let targetHero = null;
    let messageText = '';

    const matchedHero = resolveHero(firstWord);
    if (matchedHero) {
      targetHero = matchedHero;
      messageText = args.slice(1).join(' ').trim();
    } else {
      // Default to Vale if no hero was specified
      targetHero = HERO_VOICES.vale;
      messageText = args.join(' ').trim();
    }

    if (!messageText) {
      return sock.sendMessage(from, {
        text: `❌ *Missing Message!*\nPlease provide the text for ${targetHero.emoji} *${targetHero.name}* to speak.\n*Example:* \`.tts ${targetHero.id} Attack the Lord now!\``
      }, { quoted: msg });
    }

    // React to user's message with the hero's signature emoji
    try {
      if (targetHero.emoji && msg?.key) {
        await sock.sendMessage(from, {
          react: { text: targetHero.emoji, key: msg.key }
        });
      }
    } catch (e) {}

    try {
      // Generate hero voice audio buffer
      const { buffer, hero } = await generateHeroTTS(targetHero.id, messageText);

      // Send as auto-playable WhatsApp Voice Note (Push-to-Talk)
      const sentAudio = await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: true
      }, { quoted: msg });

      if (sentAudio?.key?.id) {
        safety.markSentByBot(sentAudio.key.id);
      }
    } catch (err) {
      console.error(`[TTS Error] Failed to generate TTS for ${targetHero.name}:`, err.message);
      const sentErr = await sock.sendMessage(from, {
        text: `❌ *Failed to generate ${targetHero.name} voice note:* ${err.message}`
      }, { quoted: msg });
      if (sentErr?.key?.id) {
        safety.markSentByBot(sentErr.key.id);
      }
    }
  }
};
