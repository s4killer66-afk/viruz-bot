/**
 * Add / Invite Member Command
 * Available for everyone (admins and members alike).
 * Adds a user by phone number, mention, or replied message.
 */

module.exports = {
  name: 'add',
  aliases: ['invite', 'join'],
  category: 'group',
  description: 'Add or invite a member to the group (Available for Everyone)',
  usage: '.add <phone_number_with_country_code> | .add @user | (reply with .add)',
  async execute({ sock, msg, from, isGroup, groupMetadata, args }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    // ── Extract target phone number from mention, quoted message, or args ──
    let rawTarget = '';
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.mentionedJid?.length > 0) {
      rawTarget = contextInfo.mentionedJid[0];
    } else if (contextInfo?.participant) {
      rawTarget = contextInfo.participant;
    } else if (args && args.length > 0) {
      rawTarget = args.join('');
    }

    const cleanNum = (rawTarget || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!cleanNum || cleanNum.length < 7) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nPlease provide the phone number with country code, or mention/reply to a user.\n\n*Examples:*\n• `.add 923001234567`\n• `.add +92 300 1234567`\n• `.add @user`'
      }, { quoted: msg });
    }

    const targetJid = `${cleanNum}@s.whatsapp.net`;

    // ── Check if user is already in the group ──
    if (groupMetadata?.participants) {
      const alreadyIn = groupMetadata.participants.some(p => {
        const pNum = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return pNum === cleanNum;
      });
      if (alreadyIn) {
        return sock.sendMessage(from, {
          text: `ℹ️ @${cleanNum} is already a member of this group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      }
    }

    // ── Check if the bot has admin rights ──
    const botRaw = sock.user?.id || '';
    const botPhone = botRaw.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const isBotAdmin = groupMetadata?.participants?.some(p => {
      const pPhone = p.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      return pPhone === botPhone && (p.admin === 'admin' || p.admin === 'superadmin');
    });

    if (!isBotAdmin) {
      try {
        const inviteCode = await sock.groupInviteCode(from);
        return sock.sendMessage(from, {
          text: `⚠️ *Bot is not an Admin!*\nThe bot needs admin rights to add members directly.\n\nShare this invitation link with @${cleanNum}:\nhttps://chat.whatsapp.com/${inviteCode}`,
          mentions: [targetJid]
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(from, {
          text: '⚠️ *Bot is not an Admin!*\nPlease promote the bot to Group Admin so it can add members to the group.'
        }, { quoted: msg });
      }
    }

    // ── Attempt to add user directly via WhatsApp API ──
    try {
      const response = await sock.groupParticipantsUpdate(from, [targetJid], 'add');
      const status = response?.[0]?.status;

      if (status === '200') {
        return sock.sendMessage(from, {
          text: `✅ Successfully added @${cleanNum} to the group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else if (status === '403') {
        // User privacy settings prevent direct adding
        try {
          const inviteCode = await sock.groupInviteCode(from);
          return sock.sendMessage(from, {
            text: `⚠️ @${cleanNum}'s privacy settings prevent direct adding.\nInvitation link sent:\nhttps://chat.whatsapp.com/${inviteCode}`,
            mentions: [targetJid]
          }, { quoted: msg });
        } catch (e) {
          return sock.sendMessage(from, {
            text: `⚠️ Could not add @${cleanNum} directly due to their WhatsApp privacy settings.`,
            mentions: [targetJid]
          }, { quoted: msg });
        }
      } else if (status === '408') {
        // User recently left group
        try {
          const inviteCode = await sock.groupInviteCode(from);
          return sock.sendMessage(from, {
            text: `⚠️ @${cleanNum} recently left this group. Please invite them with this link:\nhttps://chat.whatsapp.com/${inviteCode}`,
            mentions: [targetJid]
          }, { quoted: msg });
        } catch (e) {
          return sock.sendMessage(from, {
            text: `⚠️ @${cleanNum} recently left this group and cannot be re-added automatically.`,
            mentions: [targetJid]
          }, { quoted: msg });
        }
      } else if (status === '409') {
        return sock.sendMessage(from, {
          text: `ℹ️ @${cleanNum} is already in this group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else {
        return sock.sendMessage(from, {
          text: `ℹ️ Request sent for @${cleanNum} (Status: ${status || 'Pending'}).`,
          mentions: [targetJid]
        }, { quoted: msg });
      }
    } catch (err) {
      console.error('[Add Command Error]:', err.message);
      try {
        const inviteCode = await sock.groupInviteCode(from);
        return sock.sendMessage(from, {
          text: `⚠️ Could not add @${cleanNum} directly (${err.message}).\nHere is the group invitation link:\nhttps://chat.whatsapp.com/${inviteCode}`,
          mentions: [targetJid]
        }, { quoted: msg });
      } catch (e) {
        return sock.sendMessage(from, {
          text: `❌ *Failed to add member:* ${err.message}`
        }, { quoted: msg });
      }
    }
  }
};
