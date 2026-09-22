const { resolveHero, generateHeroTTS, getRealHeroVoice, getHeroCatalog, HERO_VOICES } = require('../../lib/heroVoices');
const safety = require('../../lib/safety');
const groupModerator = require('../../lib/groupModerator');

module.exports = {
  name: 'tts',
  aliases: ['tt', 'mltts', 'herotts', 'vn', 'voicenote'],
  category: 'games',
  description: 'Real Mobile Legends hero voices & voice notes (Vale, Valir, Vexana, and more)',
  usage: '.tts <hero> [message] | .tts list | .tts on | .tts off',
  async execute({ sock, msg, from, sender, isGroup, groupMetadata, args }) {
    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '🎙️ *Real Mobile Legends Hero Voices*\n\n*Format:* `.tts <hero> [message]` or `.tt <hero>`\n*Examples:*\n• `.tts vale` (Real Vale voice: _"Wind, talk to me!"_)\n• `.tts valir` (Real Valir voice: _"Everything shall burn to ashes!"_)\n• `.tts vexana` (Real Vexana voice: _"From the ashes of despair..."_)\n• `.tts gusion` (Real Gusion voice: _"Break the limits of speed!"_)\n• `.tts list` (View all 20+ MLBB heroes)\n\n👮‍♂️ *Admin Controls:*\n• `.tts on` - Enable TTS in this group\n• `.tts off` - Disable TTS in this group'
      }, { quoted: msg });
    }

    const firstWord = args[0].toLowerCase();

    // ── Admin Command: .tts on ──
    if (firstWord === 'on' || firstWord === 'enable' || firstWord === '1') {
      const isOwner = safety.isOwner(sender) || msg.key.fromMe;
      const isAdmin = isGroup ? groupModerator.isGroupAdmin(sender, groupMetadata) : true;
      if (!isAdmin && !isOwner) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly group admins or the bot owner can turn TTS on or off.'
        }, { quoted: msg });
      }
      if (isGroup) {
        groupModerator.setTtsEnabled(from, true);
      }
      return sock.sendMessage(from, {
        text: '✅ *Hero Voice TTS is now ENABLED in this group!*\nAll members can now use `.tts <hero>` or `.tt <hero>`.'
      }, { quoted: msg });
    }

    // ── Admin Command: .tts off ──
    if (firstWord === 'off' || firstWord === 'disable' || firstWord === '0') {
      const isOwner = safety.isOwner(sender) || msg.key.fromMe;
      const isAdmin = isGroup ? groupModerator.isGroupAdmin(sender, groupMetadata) : true;
      if (!isAdmin && !isOwner) {
        return sock.sendMessage(from, {
          text: '⛔ *Access Denied!*\nOnly group admins or the bot owner can turn TTS on or off.'
        }, { quoted: msg });
      }
      if (isGroup) {
        groupModerator.setTtsEnabled(from, false);
      }
      return sock.sendMessage(from, {
        text: '🔴 *Hero Voice TTS is now DISABLED in this group!*\nRegular members cannot use TTS until an admin enables it with `.tts on`.'
      }, { quoted: msg });
    }

    // ── Subcommand: View list of heroes ──
    if (firstWord === 'list' || firstWord === 'heroes' || firstWord === 'help') {
      const catalog = getHeroCatalog();
      return sock.sendMessage(from, { text: catalog }, { quoted: msg });
    }

    // ── Check if TTS is disabled in this group ──
    if (isGroup && !groupModerator.isTtsEnabled(from)) {
      const isOwner = safety.isOwner(sender) || msg.key.fromMe;
      const isAdmin = groupModerator.isGroupAdmin(sender, groupMetadata);
      if (!isAdmin && !isOwner) {
        return sock.sendMessage(from, {
          text: '⚠️ *TTS is Disabled!*\nHero voice notes are currently disabled in this group by admins.\nAn admin can re-enable it using `.tts on`.'
        }, { quoted: msg });
      }
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

    // React to user's message with the hero's signature emoji
    try {
      if (targetHero.emoji && msg?.key) {
        await sock.sendMessage(from, {
          react: { text: targetHero.emoji, key: msg.key }
        });
      }
    } catch (e) {}

    try {
      // Check if real Mobile Legends in-game hero voice line is available
      const realVoice = await getRealHeroVoice(targetHero.id);

      if (realVoice && (!messageText || realVoice.quote)) {
        // Send the real official Mobile Legends hero voice audio!
        const sentAudio = await sock.sendMessage(from, {
          audio: realVoice.buffer,
          mimetype: realVoice.mimetype || 'audio/ogg',
          fileName: `${targetHero.name}_real_voice.ogg`
        }, { quoted: msg });

        if (sentAudio?.key?.id) {
          safety.markSentByBot(sentAudio.key.id);
        }

        // Send quote info card
        const quoteText = `${targetHero.emoji} *${targetHero.name}* (${targetHero.title})\n💬 _"${realVoice.quote}"_${messageText ? '\n\n📝 *User Note:* ' + messageText : ''}`;
        const sentInfo = await sock.sendMessage(from, {
          text: quoteText
        }, { quoted: msg });

        if (sentInfo?.key?.id) {
          safety.markSentByBot(sentInfo.key.id);
        }
        return;
      }

      // Fallback: Generate custom synthesized audio for custom messages or anime guests
      if (!messageText) {
        messageText = targetHero.quote || 'Attack the enemy!';
      }

      const { buffer } = await generateHeroTTS(targetHero.id, messageText);
      const sentAudio = await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${targetHero.name}_voice.mp3`
      }, { quoted: msg });

      if (sentAudio?.key?.id) {
        safety.markSentByBot(sentAudio.key.id);
      }
    } catch (err) {
      console.error(`[TTS Error] Failed to send voice for ${targetHero.name}:`, err.message);
      const sentErr = await sock.sendMessage(from, {
        text: `❌ *Failed to load ${targetHero.name} voice:* ${err.message}`
      }, { quoted: msg });
      if (sentErr?.key?.id) {
        safety.markSentByBot(sentErr.key.id);
      }
    }
  }
};
