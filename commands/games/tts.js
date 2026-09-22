const { resolveHero, generateHeroTTS, getHeroCatalog, getRandomAnimeVoice, getAizenAuthenticBuffer } = require('../../lib/heroVoices');
const ttsState = require('../../lib/ttsState');
const moderator = require('../../lib/groupModerator');
const safety = require('../../lib/safety');

module.exports = {
  name: 'tts',
  aliases: ['tt', 'animetts', 'voicenote', 'vn'],
  category: 'games',
  description: 'Convert text to iconic Anime voice notes (Aizen, Goku, Gojo, Sukuna, Naruto, etc.)',
  usage: '.tts <character> <message> | .tts aizen <message> | .tts go <message> | .tts hd <char> <message> | .tts on | .tts off | .tts list',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *Anime Voice TTS (Text-to-Speech)*\n\n' +
              '*⚡ Cloned & Popular Anime Voices:*\n' +
              '• `.tts aizen <message>` (Sosuke Aizen 🦋 - Cloned Voice)\n' +
              '• `.tts ai <message>` (Aizen shortcut)\n' +
              '• `.tts go <message>` (Son Goku 💥)\n' +
              '• `.tts gojo <message>` (Gojo 🤞)\n' +
              '• `.tts sukuna <message>` (Sukuna 🩸)\n' +
              '• `.tts naruto <message>` (Naruto 🍥)\n' +
              '• `.tts random <message>` (Random Anime Voice 🎲)\n\n' +
              '*🎙️ Studio HD Mode (Voicevox):*\n' +
              '• `.tts hd go <message>`\n\n' +
              '*📋 Catalog & Controls:*\n' +
              '• `.tts list` (View all 20+ anime voices)\n' +
              '• `.tts on` - Enable TTS (Admins)\n' +
              '• `.tts off` - Disable TTS (Admins)'
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

    // ── Check if HD mode is requested ──
    let isHd = false;
    let actualArgs = args;
    if (firstWord === 'hd' || firstWord === 'studio') {
      isHd = true;
      actualArgs = args.slice(1);
    }

    if (!actualArgs[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *HD Anime Voice Mode*\n*Usage:* `.tts hd <character> <message>`\n*Example:* `.tts hd go Kamehameha!`'
      }, { quoted: msg });
    }

    // ── Determine Target Character and Speech Text ──
    const charWord = actualArgs[0].toLowerCase();
    let targetCharacter = null;
    let messageText = '';

    const matchedChar = resolveHero(charWord);
    if (matchedChar) {
      targetCharacter = matchedChar;
      messageText = actualArgs.slice(1).join(' ').trim();
    } else {
      // If first word is not a character name, pick a random anime voice
      targetCharacter = getRandomAnimeVoice();
      messageText = actualArgs.join(' ').trim();
    }

    if (!messageText) {
      if (targetCharacter.id === 'aizen') {
        const authenticSample = getAizenAuthenticBuffer();
        if (authenticSample) {
          try {
            if (targetCharacter.emoji && msg?.key) {
              await sock.sendMessage(from, { react: { text: targetCharacter.emoji, key: msg.key } });
            }
          } catch (e) {}
          const sentAudio = await sock.sendMessage(from, {
            audio: authenticSample,
            mimetype: 'audio/mpeg',
            fileName: 'Sosuke_Aizen.mp3'
          }, { quoted: msg });
          if (sentAudio?.key?.id) {
            safety.markSentByBot(sentAudio.key.id);
          }
          return;
        }
      }

      return sock.sendMessage(from, {
        text: `❌ *Missing Message!*\nPlease provide the text for ${targetCharacter.emoji} *${targetCharacter.name}* to speak.\n*Example:* \`.tts ${targetCharacter.id} Let's do this!\``
      }, { quoted: msg });
    }

    // React to user's message with character emoji immediately
    try {
      if (targetCharacter.emoji && msg?.key) {
        await sock.sendMessage(from, {
          react: { text: targetCharacter.emoji, key: msg.key }
        });
      }
    } catch (e) {}

    // Send instant recording presence so WhatsApp shows "🎤 Recording audio..." with zero delay
    try {
      if (sock?.sendPresenceUpdate) {
        await sock.sendPresenceUpdate('recording', from);
      }
    } catch (e) {}

    try {
      // Generate voice audio buffer smoothly in memory (zero HYEHOST load)
      const { buffer, character } = await generateHeroTTS(targetCharacter.id, messageText, { hd: isHd });

      // Send as playable WhatsApp audio message (without ptt to ensure 100% smooth playback on Android & iOS)
      const cleanFileName = `${character.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_voice.mp3`;
      const sentAudio = await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: cleanFileName
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
    } finally {
      // Clear recording indicator
      try {
        if (sock?.sendPresenceUpdate) {
          await sock.sendPresenceUpdate('paused', from);
        }
      } catch (e) {}
    }
  }
};
