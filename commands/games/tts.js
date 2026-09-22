const { resolveHero, generateHeroTTS, getHeroCatalog, getRandomAnimeVoice } = require('../../lib/heroVoices');
const ttsState = require('../../lib/ttsState');
const moderator = require('../../lib/groupModerator');
const safety = require('../../lib/safety');

module.exports = {
  name: 'tts',
  aliases: ['tt', 'animetts', 'voicenote', 'vn'],
  category: 'games',
  description: 'Convert text to iconic Anime voice notes (Goku, Gojo, Sukuna, Naruto, etc.)',
  usage: '.tts <character> <message> | .tts go <message> | .tts on | .tts off | .tts list',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *Anime Voice TTS (Text-to-Speech)*\n\n' +
              '*Format:* `.tts <character> <message>` or `.tt <character> <message>`\n' +
              '*Examples:*\n' +
              '• `.tts go Kamehameha!` (Son Goku 💥)\n' +
              '• `.tts gojo Throughout heaven and earth, I alone am the honored one.` (Gojo 🤞)\n' +
              '• `.tts sukuna Know your place, fool.` (Sukuna 🩸)\n' +
              '• `.tts naruto I will never give up, dattebayo!` (Naruto 🍥)\n' +
              '• `.tts luffy I am gonna be King of the Pirates!` (Luffy 👒)\n' +
              '• `.tts random <message>` (Speaks in a random anime voice 🎲)\n' +
              '• `.tts list` (View all 20+ anime voices)\n\n' +
              '_Admin Controls:_\n' +
              '• `.tts on` - Enable TTS in this group\n' +
              '• `.tts off` - Disable TTS in this group'
      }, { quoted: msg });
    }

    const firstWord = args[0].toLowerCase();

    // ── Admin Subcommand: .tts on / .tts off ──
    if (firstWord === 'on' || firstWord === 'enable' || firstWord === 'off' || firstWord === 'disable') {
      const isOwner = safety.isOwner(sender) || msg.key.fromMe;
      const isAdmin = isGroup && moderator.isGroupAdmin(sender, groupMetadata);

      if (!isOwner && !isAdmin) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly Group Admins and the Bot Owner can enable or disable TTS.'
        }, { quoted: msg });
      }

      const shouldEnable = firstWord === 'on' || firstWord === 'enable';
      ttsState.setTtsEnabled(from, shouldEnable);

      if (shouldEnable) {
        return sock.sendMessage(from, {
          text: '🟢 *TTS Enabled!*\nText-to-speech anime voice generation is now active for everyone in this group!\n_Try:_ `.tts go Hello everyone!`'
        }, { quoted: msg });
      } else {
        return sock.sendMessage(from, {
          text: '🔴 *TTS Disabled!*\nText-to-speech voice generation has been turned OFF in this group.\n_Group admins can re-enable it anytime with `.tts on`._'
        }, { quoted: msg });
      }
    }

    // ── Check if TTS is disabled in this group ──
    if (!ttsState.isTtsEnabled(from)) {
      return sock.sendMessage(from, {
        text: '⚠️ *TTS is Currently Disabled!*\nText-to-speech has been turned off by an admin in this group.\n_Ask a group admin to enable it using `.tts on`._'
      }, { quoted: msg });
    }

    // ── Subcommand: View list of anime voices ──
    if (firstWord === 'list' || firstWord === 'voices' || firstWord === 'heroes' || firstWord === 'help') {
      const catalog = getHeroCatalog();
      return sock.sendMessage(from, { text: catalog }, { quoted: msg });
    }

    // ── Determine Target Character and Speech Text ──
    let targetCharacter = null;
    let messageText = '';

    const matchedChar = resolveHero(firstWord);
    if (matchedChar) {
      targetCharacter = matchedChar;
      messageText = args.slice(1).join(' ').trim();
    } else {
      // If first word is not a character name, pick a random anime voice
      targetCharacter = getRandomAnimeVoice();
      messageText = args.join(' ').trim();
    }

    if (!messageText) {
      return sock.sendMessage(from, {
        text: `❌ *Missing Message!*\nPlease provide the text for ${targetCharacter.emoji} *${targetCharacter.name}* to speak.\n*Example:* \`.tts ${targetCharacter.id} Let's do this!\``
      }, { quoted: msg });
    }

    // React to user's message with character emoji
    try {
      if (targetCharacter.emoji && msg?.key) {
        await sock.sendMessage(from, {
          react: { text: targetCharacter.emoji, key: msg.key }
        });
      }
    } catch (e) {}

    try {
      // Generate voice audio buffer smoothly in memory (zero HYEHOST load)
      const { buffer, character } = await generateHeroTTS(targetCharacter.id, messageText);

      // Send as playable WhatsApp audio message with true audio/mpeg mimetype
      const sentAudio = await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${character.name}_voice.mp3`
      }, { quoted: msg });

      if (sentAudio?.key?.id) {
        safety.markSentByBot(sentAudio.key.id);
      }
    } catch (err) {
      console.error(`[TTS Error] Failed to generate TTS for ${targetCharacter.name}:`, err.message);
      const sentErr = await sock.sendMessage(from, {
        text: `❌ *Failed to generate ${targetCharacter.name} voice:* ${err.message}`
      }, { quoted: msg });
      if (sentErr?.key?.id) {
        safety.markSentByBot(sentErr.key.id);
      }
    }
  }
};
