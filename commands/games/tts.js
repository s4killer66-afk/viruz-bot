const { resolveHero, generateHeroTTS, getHeroCatalog, getRandomAnimeVoice, ANIME_VOICES } = require('../../lib/heroVoices');
const ttsState = require('../../lib/ttsState');
const moderator = require('../../lib/groupModerator');
const safety = require('../../lib/safety');

// Compile all anime character IDs and aliases as direct command aliases
const characterAliases = [];
for (const char of Object.values(ANIME_VOICES)) {
  characterAliases.push(char.id);
  if (Array.isArray(char.aliases)) {
    for (const a of char.aliases) {
      characterAliases.push(a);
    }
  }
}

const ALL_ALIASES = Array.from(new Set(['tt', 'animetts', 'voicenote', 'vn', ...characterAliases]));

module.exports = {
  name: 'tts',
  aliases: ALL_ALIASES,
  category: 'games',
  description: 'Convert text to voice notes (Sara authentic Pakistani Urdu & English human girl voice & 20+ Anime voices like Goku, Gojo, Sukuna)',
  usage: '.sara <message> | .goku <message> | .tts sara <message> | .tts goku <message> | .tts on | .tts off | .tts list',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args, commandName }) {
    const activeCmd = (commandName || 'tts').toLowerCase();
    const isDirectCharacterCmd = activeCmd !== 'tts' && activeCmd !== 'tt' && activeCmd !== 'animetts' && activeCmd !== 'voicenote' && activeCmd !== 'vn';

    const firstWord = (args[0] || '').toLowerCase();
    const isAdminToggle = !isDirectCharacterCmd && (firstWord === 'on' || firstWord === 'enable' || firstWord === 'off' || firstWord === 'disable');

    // ── Check if TTS is disabled in this group (applies to both .tts and direct commands like .goku) ──
    if (!isAdminToggle && !ttsState.isTtsEnabled(from)) {
      return sock.sendMessage(from, {
        text: '⚠️ *TTS is Currently Disabled!*\nText-to-speech has been turned off by an admin in this group.\n_Ask a group admin to enable it using `.tts on`._'
      }, { quoted: msg });
    }

    // ── Direct Character Command (.goku <message>, .gojo <message>, .sukuna <message>, etc.) ──
    if (isDirectCharacterCmd) {
      const targetCharacter = resolveHero(activeCmd);
      if (!targetCharacter) {
        return;
      }

      const messageText = args.join(' ').trim();
      if (!messageText) {
        return sock.sendMessage(from, {
          text: `❌ *Missing Message!*\nPlease provide what ${targetCharacter.emoji} *${targetCharacter.name}* should say.\n*Example:* \`.${activeCmd} Let's do this!\``
        }, { quoted: msg });
      }

      // 1. Immediate WhatsApp presence indicator: "recording audio..."
      if (sock && typeof sock.sendPresenceUpdate === 'function') {
        sock.sendPresenceUpdate('recording', from).catch(() => {});
      }

      // 2. React to user's message with character emoji
      try {
        if (targetCharacter.emoji && msg?.key) {
          await sock.sendMessage(from, {
            react: { text: targetCharacter.emoji, key: msg.key }
          });
        }
      } catch (e) {}

      try {
        // Generate authentic anime Voicevox audio buffer smoothly in memory
        const { buffer, character } = await generateHeroTTS(targetCharacter.id, messageText);
        const sentAudio = await sock.sendMessage(from, {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${character.name}_voice.mp3`
        }, { quoted: msg });

        if (sentAudio?.key?.id) {
          safety.markSentByBot(sentAudio.key.id);
        }
      } catch (err) {
        console.error(`[TTS Error] Failed to generate ${targetCharacter.name} voice:`, err.message);
        const sentErr = await sock.sendMessage(from, {
          text: `❌ *Failed to generate ${targetCharacter.name} voice:* ${err.message}`
        }, { quoted: msg });
        if (sentErr?.key?.id) {
          safety.markSentByBot(sentErr.key.id);
        }
      }
      return;
    }

    // ── Standard .tts Command ──
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *VIRUZ Voice TTS (Text-to-Speech)*\n\n' +
              '*Pakistani Urdu & English Human Girl Voice:*\n' +
              '• `.sara <message>` - Sara (Authentic Pakistani Urdu & English Girl 🧕)\n' +
              '  _Aliases:_ `.tts sara`, `.tts urdu`, `.urdu <message>`\n\n' +
              '*Anime Voices (Voicevox):*\n' +
              '• `.goku <message>` - Son Goku (Super Saiyan 💥)\n' +
              '• `.gojo <message>` - Satoru Gojo (The Honored One 🤞)\n' +
              '• `.sukuna <message>` - Ryomen Sukuna (King of Curses 🩸)\n' +
              '• `.naruto <message>` - Naruto Uzumaki 🍥\n' +
              '• `.luffy <message>` - Monkey D. Luffy 👒\n' +
              '• `.zoro <message>` - Roronoa Zoro ⚔️\n\n' +
              '*General Format:* `.tts <voice/character> <message>` or `.tt <voice> <message>`\n' +
              '*Examples:*\n' +
              '• `.sara Aap kaise ho sab?`\n' +
              '• `.sara السلام علیکم! آپ سب کیسے ہیں؟`\n' +
              '• `.sara Welcome everyone, hope you are having a great time!`\n' +
              '• `.tts sara Shukriya sabka group mein aane ka`\n' +
              '• `.tts goku Kamehameha!`\n' +
              '• `.tts gojo Throughout heaven and earth, I alone am the honored one.`\n' +
              '• `.tts random <message>` (Speaks in a random anime voice 🎲)\n' +
              '• `.tts list` (View all voice styles & commands)\n\n' +
              '_Admin Controls:_\n' +
              '• `.tts on` - Enable TTS in this group\n' +
              '• `.tts off` - Disable TTS in this group'
      }, { quoted: msg });
    }

    // ── Admin Subcommand: .tts on / .tts off ──
    if (isAdminToggle) {
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
          text: '🟢 *TTS Enabled!*\nText-to-speech anime voice generation is now active for everyone in this group!\n_Try:_ `.goku Hello everyone!` or `.tts go Hello everyone!`'
        }, { quoted: msg });
      } else {
        return sock.sendMessage(from, {
          text: '🔴 *TTS Disabled!*\nText-to-speech voice generation has been turned OFF in this group.\n_Group admins can re-enable it anytime with `.tts on`._'
        }, { quoted: msg });
      }
    }

    // ── Subcommand: View list of anime voices ──
    if (firstWord === 'list' || firstWord === 'voices' || firstWord === 'anime' || firstWord === 'characters' || firstWord === 'heroes' || firstWord === 'help') {
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

    // 1. Immediate WhatsApp presence indicator: "recording audio..."
    if (sock && typeof sock.sendPresenceUpdate === 'function') {
      sock.sendPresenceUpdate('recording', from).catch(() => {});
    }

    // 2. React to user's message with character emoji
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
