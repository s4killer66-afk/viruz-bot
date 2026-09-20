const moderator = require('../../lib/groupModerator');

module.exports = {
  name: 'add',
  aliases: ['invite'],
  category: 'group',
  description: 'Add a member to the group (Admin exclusive)',
  usage: '.add <phone_number_with_country_code>',
  async execute({ sock, msg, from, isGroup, sender, groupMetadata, args }) {
    if (!isGroup) {
      return sock.sendMessage(from, { text: '❌ This command can only be used in group chats!' }, { quoted: msg });
    }

    // REQUIREMENT: Admin exclusive command
    if (!moderator.isGroupAdmin(sender, groupMetadata)) {
      return sock.sendMessage(from, {
        text: '⛔ *Access Denied!*\nThe `.add` command is exclusively reserved for Group Admins.'
      }, { quoted: msg });
    }

    if (!args[0]) {
      return sock.sendMessage(from, {
        text: '❌ *Usage Error!*\nPlease provide the phone number with international country code.\n*Example:* `.add 923001234567`'
      }, { quoted: msg });
    }

    const cleanNum = args[0].replace(/[^0-9]/g, '');
    if (cleanNum.length < 8) {
      return sock.sendMessage(from, { text: '❌ Invalid phone number provided.' }, { quoted: msg });
    }

    const targetJid = `${cleanNum}@s.whatsapp.net`;

    try {
      const response = await sock.groupParticipantsUpdate(from, [targetJid], 'add');
      const status = response?.[0]?.status;

      if (status === '200') {
        await sock.sendMessage(from, {
          text: `✅ Successfully added @${cleanNum} to the group!`,
          mentions: [targetJid]
        }, { quoted: msg });
      } else if (status === '403') {
        // WhatsApp privacy settings require invite link
        const inviteCode = await sock.groupInviteCode(from);
        await sock.sendMessage(from, {
          text: `⚠️ Could not add directly due to user privacy settings.\nInvitation link sent:\nhttps://chat.whatsapp.com/${inviteCode}`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: `ℹ️ Member add status: ${status || 'Sent request'}`
        }, { quoted: msg });
      }
    } catch (err) {
      await sock.sendMessage(from, {
        text: `❌ *Failed to add member:* ${err.message}\n(Ensure the bot has Admin rights in this group!)`
      }, { quoted: msg });
    }
  }
};
