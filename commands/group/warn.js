const moderator = require('../../lib/groupModerator');
const welcomeHandler = require('../../lib/welcomeHandler');
const { atlasBox } = require('../../lib/utils');

module.exports = {
  name: 'warn',
  aliases: ['warning', 'warnuser', 'resetwarn', 'unwarn'],
  category: 'group',
  description: 'Warn a group member with admin attribution (Shows Admin Name, auto-kicks at 3 warnings)',
  usage: '.warn @user [reason] | .warn reset @user',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata, botJid, args, commandName }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    // REQUIREMENT: Admin exclusive command
    if (!moderator.isGroupAdmin(sender, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nThe `.warn` command is exclusively reserved for Group Admins.'
      }, { quoted: msg });
    }

    const isResetCommand = (commandName === 'resetwarn' || commandName === 'unwarn' || args[0]?.toLowerCase() === 'reset' || args[0]?.toLowerCase() === 'clear');

    // Filter args if 'reset' or 'clear' was passed as first argument
    const effectiveArgs = (args[0]?.toLowerCase() === 'reset' || args[0]?.toLowerCase() === 'clear')
      ? args.slice(1)
      : args;

    // Determine target user (quoted message, mention, or typed number)
    let targetJid = null;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (quoted) {
      targetJid = quoted;
    } else if (mentioned) {
      targetJid = mentioned;
    } else if (effectiveArgs[0]) {
      const cleanNum = effectiveArgs[0].replace(/[^0-9]/g, '');
      if (cleanNum.length >= 7) {
        targetJid = `${cleanNum}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nPlease mention `@user` or reply to their message to warn.\n\n*Commands:*\n• `.warn @user [reason]` - Issue a warning\n• `.warn reset @user` - Reset user warnings'
      }, { quoted: msg });
    }

    const targetPhone = targetJid.split('@')[0].split(':')[0];
    const adminPhone = sender.split('@')[0].split(':')[0];
    const adminName = (msg.pushName || '').trim();
    const adminDisplay = adminName ? `${adminName} (@${adminPhone})` : `@${adminPhone}`;

    // ── Subcommand: RESET WARNINGS ──
    if (isResetCommand) {
      const previousCount = moderator.resetWarnings(from, targetJid);
      const resetBody = `
👤 *User:* @${targetPhone}
👮‍♂️ *Reset By (Admin):* ${adminDisplay}
🔄 *Status:* Warnings cleared (was ${previousCount}/3).
✅ User warning count has been reset to [ 0 / 3 ].
`.trim();

      const output = atlasBox('WARNINGS RESET', resetBody, 'VIRUZ • GROUP MODERATION');
      return sock.sendMessage(from, {
        text: output,
        mentions: [targetJid, sender]
      }, { quoted: msg });
    }

    // ── Check if target can be warned (Admins are protected) ──
    const check = moderator.canWarnUser(targetJid, botJid, groupMetadata);
    if (!check.allowed) {
      return sock.sendMessage(from, { text: check.reason }, { quoted: msg });
    }

    // Extract reason
    let reason = '';
    if (quoted) {
      reason = effectiveArgs.join(' ').trim();
    } else {
      // Exclude mention or number argument
      reason = effectiveArgs.slice(1).join(' ').trim();
    }
    if (!reason) {
      reason = 'Rule violation / Inappropriate behavior';
    }

    // Add warning
    const result = moderator.addWarning(from, targetJid, sender, adminName, reason);

    // ── 3rd Warning: AUTO KICK ──
    if (result.isMax) {
      let kickSuccess = false;
      try {
        welcomeHandler.recordKick(from, targetJid, sender);
        await sock.groupParticipantsUpdate(from, [targetJid], 'remove');
        moderator.resetWarnings(from, targetJid);
        kickSuccess = true;
      } catch (err) {
        console.error(`[Warn Command] Failed to kick ${targetJid}:`, err.message);
      }

      const kickActionText = kickSuccess
        ? 'User has reached 3 warnings and has been automatically kicked from the group.'
        : 'User reached 3 warnings (Auto-kick failed: Ensure bot has Admin rights!).';

      const finalBody = `
👤 *Warned User:* @${targetPhone}
👮‍♂️ *Issued By (Admin):* ${adminDisplay}
📝 *Reason:* ${reason}
🛑 *Warning Level:* [ ${result.count} / ${result.max} ] — LIMIT EXCEEDED
🚪 *Action Taken:* ${kickActionText}
`.trim();

      const output = atlasBox('FINAL WARNING & AUTO-KICK', finalBody, 'VIRUZ • GROUP MODERATION');
      return sock.sendMessage(from, {
        text: output,
        mentions: [targetJid, sender]
      }, { quoted: msg });
    }

    // ── 1st or 2nd Warning ──
    const remaining = result.max - result.count;
    const warnBody = `
👤 *Warned User:* @${targetPhone}
👮‍♂️ *Issued By (Admin):* ${adminDisplay}
📝 *Reason:* ${reason}
🛑 *Warning Level:* [ ${result.count} / ${result.max} ]
⚠️ *Notice:* You have ${remaining} warning${remaining > 1 ? 's' : ''} remaining. Reaching ${result.max} warnings will result in an immediate KICK from the group!
`.trim();

    const output = atlasBox(`⚠️ ADMIN WARNING (${result.count}/${result.max})`, warnBody, 'VIRUZ • GROUP MODERATION');
    return sock.sendMessage(from, {
      text: output,
      mentions: [targetJid, sender]
    }, { quoted: msg });
  }
};
