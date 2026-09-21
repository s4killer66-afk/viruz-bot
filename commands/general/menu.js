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
👋 *Welcome to VIRUZ WhatsApp Bot!*
Prefixes: \`. \` or \`, \` | Multi-Device Connected

🎮 *GAME ACCOUNT CHECKERS:*
• \`${p}ml <id> <zone>\` - Mobile Legends (Passes, Server, Flag, Offers)
• \`${p}genshin <uid>\` - Genshin Impact (Welkin Moon, BP, Server)
• \`${p}hok <id>\` - Honor of Kings (Honor Pass, Cards, Offers)

🛡️ *GROUP MODERATION (Admins Only):*
• \`${p}kick @user\` - Kick member (Admins are protected!)
• \`${p}add <number>\` - Add member via phone number
• \`${p}welcome [on/off]\` - Toggle auto welcome & goodbye
• \`${p}tagall [text]\` - Mention all group members
• \`${p}hidetag [text]\` - Invisible mention all members
• \`${p}mute\` - Close group chat (admins only)
• \`${p}unmute\` - Open group chat for everyone
• \`${p}groupinfo\` - View group settings & spam thresholds

⚙️ *ANTI-SPAM SYSTEM (Automatic):*
• *Sticker Spam:* 3rd sticker = Warning ⚠️ | 4th = Auto-Kick 🚫
• *Message Spam:* 4th repeat = Warning ⚠️ | 5th = Auto-Kick 🚫
• *Admins:* 100% Protected (Never warned or kicked!)

ℹ️ *UTILITIES & TOOLS:*
• \`${p}viewonce\` (or \`${p}videwonce\`) - Silently save View Once media to your inbox
• \`${p}antidelete [on/off]\` - Toggle deleted messages recovery
• \`${p}bot [on/off]\` - Turn bot on/off (Owner only)
• \`${p}ping\` - Check bot response speed
• \`${p}menu\` - Open this command list
• \`${p}info\` - Bot status and host information
`.trim();

    const output = atlasBox('VIRUZ MAIN MENU', body);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
  }
};
