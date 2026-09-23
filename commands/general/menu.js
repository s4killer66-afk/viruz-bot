const { atlasBox } = require('../../lib/utils');
const config = require('../../config');

module.exports = {
  name: 'menu',
  aliases: ['help', 'commands', 'meni', 'menú', 'list', 'alive'],
  category: 'general',
  description: 'Show full bot menu and list of available commands',
  usage: '.menu',
  async execute({ sock, msg, from }) {
    const p = config.prefix;

    const body = `
👋 *Welcome to VIRUZ WhatsApp Bot*
⚡ High-Speed • Zero-Lag System
Prefixes: \`. \` or \`, \` | Connected

🎮 *GAME ACCOUNT CHECKER:*
• \`${p}ml <id> <zone>\` - Mobile Legends (Player Info, Rank, Region, Passes)

🎙️ *MULTILINGUAL & ANIME VOICE TTS (FOR EVERYONE):*
• \`${p}sara <message>\` - Sara (Urdu 🇵🇰 / Hindi 🇮🇳 / English Girl 🧕)
• \`${p}goku <message>\` - Son Goku (Super Saiyan 💥)
• \`${p}gojo <message>\` - Satoru Gojo (The Honored One 🤞)
• \`${p}sukuna <message>\` - Ryomen Sukuna (King of Curses 🩸)
• \`${p}naruto <message>\` - Naruto Uzumaki (Seventh Hokage 🍥)
• \`${p}luffy <message>\` - Monkey D. Luffy (Straw Hat 👒)
• \`${p}tts <character> <message>\` - Speak in any voice style
• \`${p}tts random <message>\` - Speaks in a random anime voice 🎲
• \`${p}tts list\` - View all voice styles & commands
• \`${p}tts [on/off]\` - Toggle TTS in group (Admins only)

👥 *GROUP PARTICIPATION:*
• \`${p}add <number/@user>\` - Add or invite a member to the group

🛡️ *GROUP MODERATION (Admins Only):*
• \`${p}warn @user [reason]\` - Official warning (6 warns = Auto-Kick)
• \`${p}resetwarn @user\` - Reset member's warnings to 0
• \`${p}kick @user\` - Remove member from group (Admins protected)
• \`${p}welcome [on/off]\` - Toggle auto welcome & goodbye messages
• \`${p}tagall [text]\` - Mention all group members
• \`${p}hidetag [text]\` - Invisible announcement mention
• \`${p}mute\` - Close group chat (admins only)
• \`${p}unmute\` - Open group chat for everyone
• \`${p}groupinfo\` - View group settings & active thresholds

⚙️ *ANTI-SPAM SYSTEM (Automatic):*
• *Stickers:* ${config.antiSpam.stickerWarningThreshold}th = Warning ⚠️ | ${config.antiSpam.stickerKickThreshold}th = Auto-Kick 🚫
• *Messages:* ${config.antiSpam.messageWarningThreshold}th repeat = Warning ⚠️ | ${config.antiSpam.messageKickThreshold}th = Auto-Kick 🚫
• *Admins:* 100% Protected (Never warned or kicked)

ℹ️ *UTILITIES & TOOLS:*
• \`${p}bot [on/off]\` - Turn bot on/off in this group
• \`${p}viewonce\` (or \`${p}vv\`) - Silently save View Once media to your inbox
• \`${p}antidelete [on/off]\` - Toggle deleted messages recovery
• \`${p}ping\` - Check bot response speed & latency
• \`${p}info\` - Bot status and host information
• \`${p}menu\` - Open this command list
`.trim();

    const output = atlasBox('VIRUZ MAIN MENU', body);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
  }
};
