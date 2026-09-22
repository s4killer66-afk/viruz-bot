const moderator = require('../../lib/groupModerator');

/**
 * Extract target phone number digits from args, mentions, or quoted message
 * @param {Array<string>} args 
 * @param {object} msg 
 * @returns {string|null}
 */
function extractTargetPhone(args, msg) {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

  // 1. Check mentioned JIDs in message context
  if (contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
    const raw = contextInfo.mentionedJid[0];
    const digits = raw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (digits.length >= 7 && !digits.startsWith('120363')) return digits;
  }

  // 2. Check quoted message participant
  if (contextInfo?.participant) {
    const raw = contextInfo.participant;
    const digits = raw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (digits.length >= 7 && !digits.startsWith('120363')) return digits;
  }

  // 3. Check quoted contact card (vCard)
  const quotedMsg = contextInfo?.quotedMessage;
  if (quotedMsg?.contactMessage?.vcard) {
    const match = quotedMsg.contactMessage.vcard.match(/waid=(\d+)/i);
    if (match && match[1]) return match[1];
  }

  // 4. Check args (e.g. .add +92 300 1234567 or .add 923001234567 or .add 03001234567)
  if (args && args.length > 0) {
    const joined = args.join('').replace(/[^0-9]/g, '');
    if (joined.length >= 7) {
      // Pakistani local format normalization (03xx -> 923xx)
      if (joined.startsWith('03') && joined.length === 11) {
        return '923' + joined.slice(2);
      }
      return joined;
    }
  }

  return null;
}

/**
 * Check if the bot itself has Admin rights in the group
 * @param {object} sock 
 * @param {object} groupMetadata 
 * @returns {boolean}
 */
function isBotGroupAdmin(sock, groupMetadata) {
  if (!sock?.user?.id || !groupMetadata?.participants) return true; // optimistic if metadata unavailable
  const botId = sock.user.id;
  const botDigits = botId.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
  const botLid = sock.user?.lid ? sock.user.lid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : null;

  return groupMetadata.participants.some(p => {
    if (!p || (p.admin !== 'admin' && p.admin !== 'superadmin')) return false;
    const pIdDigits = (p.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const pJidDigits = p.jid ? p.jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';
    const pLidDigits = p.lid ? p.lid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';
    const pPhoneDigits = (p.phoneNumber || p.pn) ? String(p.phoneNumber || p.pn).replace(/[^0-9]/g, '') : '';

    return (
      pIdDigits === botDigits ||
      pJidDigits === botDigits ||
      pPhoneDigits === botDigits ||
      (botLid && (pIdDigits === botLid || pLidDigits === botLid))
    );
  });
}

/**
 * Check if the user is already inside the group
 * @param {string} digits 
 * @param {object} groupMetadata 
 * @returns {boolean}
 */
function isUserAlreadyMember(digits, groupMetadata) {
  if (!digits || !groupMetadata?.participants) return false;
  return groupMetadata.participants.some(p => {
    const pIdDigits = (p.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const pJidDigits = p.jid ? p.jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';
    const pLidDigits = p.lid ? p.lid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '') : '';
    const pPhoneDigits = (p.phoneNumber || p.pn) ? String(p.phoneNumber || p.pn).replace(/[^0-9]/g, '') : '';

    return (
      pIdDigits === digits ||
      pJidDigits === digits ||
      pPhoneDigits === digits ||
      pLidDigits === digits
    );
  });
}

module.exports = {
  name: 'add',
  aliases: ['invite', 'addmember'],
  category: 'group',
  description: 'Add a new member to the group (Available to Everyone)',
  usage: '.add <phone_number_with_country_code>',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata, args }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    const cleanNum = extractTargetPhone(args, msg);

    if (!cleanNum) {
      return sock.sendMessage(from, {
        text: `👥 *VIRUZ GROUP ADD COMMAND*\n\n` +
              `Anyone in this group can add members!\n\n` +
              `📌 *Usage:*\n` +
              `• \`.add <phone_number>\` (e.g. \`.add 923001234567\` or \`.add +92 300 1234567\`)\n` +
              `• \`.add @user\`\n` +
              `• Reply to a message or contact card with \`.add\``
      }, { quoted: msg });
    }

    if (cleanNum.length < 8) {
      return sock.sendMessage(from, {
        text: '❌ *Invalid Phone Number!*\nPlease provide a valid international phone number with country code.\n*Example:* `.add 923001234567`'
      }, { quoted: msg });
    }

    // Check if user is already a member
    if (isUserAlreadyMember(cleanNum, groupMetadata)) {
      const existingJid = `${cleanNum}@s.whatsapp.net`;
      return sock.sendMessage(from, {
        text: `ℹ️ @${cleanNum} is already a member of this group!`,
        mentions: [existingJid]
      }, { quoted: msg });
    }

    // Check if the bot has admin rights
    if (!isBotGroupAdmin(sock, groupMetadata)) {
      return sock.sendMessage(from, {
        text: `❌ *Bot is Not an Admin!*\n\n` +
              `To add members, the bot must have *Admin* rights in this group.\n` +
              `Please ask a Group Admin to promote the bot to Admin.`
      }, { quoted: msg });
    }

    let targetJid = `${cleanNum}@s.whatsapp.net`;

    // Optionally verify number on WhatsApp if onWhatsApp helper is available
    try {
      if (typeof sock.onWhatsApp === 'function') {
        const results = await sock.onWhatsApp(cleanNum);
        if (results && results.length > 0) {
          if (!results[0].exists) {
            return sock.sendMessage(from, {
              text: `❌ *Number Not Found on WhatsApp!*\n+${cleanNum} is not registered on WhatsApp.`
            }, { quoted: msg });
          }
          if (results[0].jid) {
            targetJid = results[0].jid;
          }
        }
      }
    } catch (e) {}

    try {
      const response = await sock.groupParticipantsUpdate(from, [targetJid], 'add');
      const result = Array.isArray(response) ? response[0] : response;
      const status = String(result?.status || '');

      if (status === '200' || status === '') {
        await sock.sendMessage(from, {
          text: `✅ Successfully added @${cleanNum} to the group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else if (status === '403') {
        // Privacy setting prevents direct addition - generate invite link
        let inviteLink = '';
        try {
          const code = await sock.groupInviteCode(from);
          if (code) inviteLink = `https://chat.whatsapp.com/${code}`;
        } catch (e) {}

        let inviteMsg = `⚠️ Could not add @${cleanNum} directly due to their WhatsApp privacy settings.`;
        if (inviteLink) {
          inviteMsg += `\n\n🔗 *Group Invitation Link:*\n${inviteLink}\n_They can tap this link to join!_`;
        }
        await sock.sendMessage(from, {
          text: inviteMsg,
          mentions: [targetJid]
        }, { quoted: msg });

        // Also attempt to DM the invitation link directly to the target user
        if (inviteLink) {
          try {
            await sock.sendMessage(targetJid, {
              text: `👋 Hello! You have been invited to join *${groupMetadata?.subject || 'our WhatsApp group'}*.\n\n🔗 *Click here to join:*\n${inviteLink}`
            });
          } catch (e) {}
        }
      } else if (status === '409') {
        await sock.sendMessage(from, {
          text: `ℹ️ @${cleanNum} is already a member of this group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else if (status === '408') {
        let inviteLink = '';
        try {
          const code = await sock.groupInviteCode(from);
          if (code) inviteLink = `\n🔗 https://chat.whatsapp.com/${code}`;
        } catch (e) {}
        await sock.sendMessage(from, {
          text: `⚠️ @${cleanNum} recently left this group. Please share the invitation link with them instead:${inviteLink}`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else if (status === '401') {
        await sock.sendMessage(from, {
          text: `❌ *Permission Error:*\nThe bot must be an Admin in this group to add members. Please promote the bot to Admin.`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `ℹ️ Member add status: ${status || 'Request sent'}`,
          mentions: [targetJid]
        }, { quoted: msg });
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('not-authorized') || errMsg.includes('forbidden') || errMsg.includes('401')) {
        await sock.sendMessage(from, {
          text: `❌ *Permission Error:*\nThe bot is not an Admin in this group. Please make the bot an Admin to use \`.add\`.`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `❌ *Failed to add member:* ${errMsg}\n(Ensure the bot has Admin rights in this group!)`
        }, { quoted: msg });
      }
    }
  }
};
