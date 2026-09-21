/**
 * Automated Verification & Unit Tests for VIRUZ WhatsApp Bot
 */

const assert = require('assert');
const {
  checkMobileLegends,
  checkGenshinImpact,
  checkHonorOfKings
} = require('../lib/gameChecker');
const moderator = require('../lib/groupModerator');
const welcomeHandler = require('../lib/welcomeHandler');
const commandHandler = require('../lib/commandHandler');
const config = require('../config');

async function runTests() {
  console.log('🧪 Starting VIRUZ Automated Verification Tests...\n');

  // Test 1: Command Handler Loading
  console.log('▶ Test 1: Verifying Command Handler Loading...');
  assert(commandHandler.commands.size >= 9, `Expected at least 9 commands, found ${commandHandler.commands.size}`);
  assert(commandHandler.getCommand('ml') !== null, 'Command .ml should exist');
  assert.strictEqual(commandHandler.getCommand('pubg'), null, 'Command .pubg should be removed');
  assert.strictEqual(commandHandler.getCommand('coc'), null, 'Command .coc should be removed');
  assert(commandHandler.getCommand('genshin') !== null, 'Command .genshin should exist');
  assert(commandHandler.getCommand('hok') !== null, 'Command .hok should exist');
  assert(commandHandler.getCommand('kick') !== null, 'Command .kick should exist');
  assert(commandHandler.getCommand('add') !== null, 'Command .add should exist');
  console.log('  ✅ Command Handler: Active commands loaded; .coc & .pubg confirmed removed.');

  // Test 2: Mobile Legends Checker (Accurate Passes & Country Flag)
  console.log('\n▶ Test 2: Verifying Mobile Legends (.ml) Checker...');
  const mlRes = await checkMobileLegends('1114917746', '13486');
  assert(mlRes.includes('Mobile Legends'), 'ML output should mention Mobile Legends');
  assert(mlRes.includes('1114917746'), 'ML output should contain Account ID');
  assert(mlRes.includes('13486'), 'ML output should contain Zone/Server');
  assert(mlRes.includes('🇮🇩 Indonesia'), 'ML output should contain country flag and name');
  assert(mlRes.includes('Weekly Diamond Pass (WDP)'), 'ML output should include Weekly Diamond Pass spec');
  assert(mlRes.includes('Starlight Membership'), 'ML output should include Starlight Membership spec');
  assert(mlRes.includes('Twilight Pass'), 'ML output should include Twilight Pass spec');
  assert(mlRes.includes('First Recharge Season Bonus'), 'ML output should include First Recharge bonus');
  assert(mlRes.includes('Exact remaining pass days'), 'ML output should include transparent privacy note');
  console.log('  ✅ Mobile Legends output verified with accurate pass specifications & flag.');

  // Test 3: PUBG Mobile Complete Removal
  console.log('\n▶ Test 3: Verifying PUBG Mobile (.pubg) Complete Removal...');
  assert.strictEqual(commandHandler.getCommand('pubg'), null, 'Command .pubg must not be registered');
  assert.strictEqual(commandHandler.aliases.get('pubg'), undefined, 'Alias pubg must not be registered');
  assert.strictEqual(commandHandler.aliases.get('pubgm'), undefined, 'Alias pubgm must not be registered');
  console.log('  ✅ PUBG Mobile removal verified.');

  // Test 4: Live Account Validation & Invalid Account Rejection
  console.log('\n▶ Test 4: Verifying Game Checkers Reject Invalid Accounts...');
  let hokErr = null;
  try {
    await checkHonorOfKings('1234567890');
  } catch (e) {
    hokErr = e.message;
  }
  assert(hokErr && hokErr.includes('Account Not Found'), 'Invalid HOK ID must return Account Not Found');
  console.log('  ✅ Live Account Validation: Invalid accounts properly rejected without fake mock data.');

  // Test 5: Genshin Impact Checker
  console.log('\n▶ Test 5: Verifying Genshin Impact (.genshin) Checker...');
  const giRes = await checkGenshinImpact('700012345');
  assert(giRes.includes('Genshin Impact'), 'Genshin output should mention Genshin Impact');
  assert(giRes.includes('700012345'), 'Genshin output should contain UID');
  assert(giRes.includes('Blessing of the Welkin Moon'), 'Genshin output should contain Welkin');
  assert(giRes.includes('Gnostic Hymn'), 'Genshin output should contain Battle Pass');
  console.log('  ✅ Genshin Impact output verified.');

  // Test 6: Clash of Clans Command Completely Removed
  console.log('\n▶ Test 6: Verifying Clash of Clans (.coc) Complete Removal...');
  assert.strictEqual(commandHandler.getCommand('coc'), null, 'Command .coc must not be registered');
  assert.strictEqual(commandHandler.aliases.get('coc'), undefined, 'Alias coc must not be registered');
  console.log('  ✅ Clash of Clans removal verified.');

  // Test 7: Group Moderation & Sticker Spam Logic
  console.log('\n▶ Test 7: Verifying Sticker Spam Auto-Kick Logic...');
  const mockGroup = '123456789-group@g.us';
  const spammerUser = '923111111111@s.whatsapp.net';
  const adminUser = '923222222222@s.whatsapp.net';
  const botJid = '923999999999@s.whatsapp.net';

  const mockGroupMetadata = {
    id: mockGroup,
    subject: 'Test Gaming Group',
    participants: [
      { id: adminUser, admin: 'admin' },
      { id: spammerUser, admin: null },
      { id: botJid, admin: 'admin' }
    ]
  };

  const sentMessages = [];
  const kickedUsers = [];

  const mockSock = {
    user: { id: botJid },
    async sendMessage(to, content) {
      sentMessages.push({ to, content });
      return { key: { id: 'mock_msg_id' } };
    },
    async groupParticipantsUpdate(groupId, participants, action) {
      if (action === 'remove') {
        kickedUsers.push(...participants);
      }
      return [{ status: '200' }];
    }
  };

  // User sends 1st and 2nd sticker -> no kick, no warn
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 0, 'No warning should be sent on 1st or 2nd sticker');
  assert.strictEqual(kickedUsers.length, 0, 'No kick on 1st or 2nd sticker');

  // User sends 3rd sticker -> WARNING expected
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 1, 'Warning message must be sent on 3rd sticker');
  assert(sentMessages[0].content.text.includes('STICKER SPAM WARNING'), 'Should be sticker warning message');
  assert.strictEqual(kickedUsers.length, 0, 'User should not be kicked yet at 3rd sticker');

  // User sends 4th sticker -> AUTO KICK expected!
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert(kickedUsers.includes(spammerUser), 'User must be kicked on 4th sticker spam');
  assert(sentMessages.some(m => m.content.text.includes('AUTO KICK - STICKER SPAM')), 'Auto kick notice sent');
  console.log('  ✅ Sticker Spam: Warned at 3rd, auto-kicked at 4th.');

  // Test 8: Message Spam Auto-Kick Logic
  console.log('\n▶ Test 8: Verifying Repeated Message Spam Auto-Kick Logic...');
  const msgSpammer = '923333333333@s.whatsapp.net';
  mockGroupMetadata.participants.push({ id: msgSpammer, admin: null });

  sentMessages.length = 0;
  kickedUsers.length = 0;

  // Send 3 repeated messages -> no warning yet
  for (let i = 0; i < 3; i++) {
    await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  }
  assert.strictEqual(sentMessages.length, 0, 'No warning on 1-3 messages');
  assert.strictEqual(kickedUsers.length, 0, 'No kick on 1-3 messages');

  // 4th repeated message -> WARNING expected!
  await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 1, 'Warning must be sent on 4th repeated message');
  assert(sentMessages[0].content.text.includes('MESSAGE SPAM WARNING'), 'Should be message spam warning');
  assert.strictEqual(kickedUsers.length, 0, 'User should not be kicked at 4th message');

  // 5th repeated message -> AUTO KICK expected!
  await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  assert(kickedUsers.includes(msgSpammer), 'User must be kicked on 5th repeated message');
  assert(sentMessages.some(m => m.content.text.includes('AUTO KICK - MESSAGE SPAM')), 'Auto kick message sent');
  console.log('  ✅ Message Spam: Warned at 4th, auto-kicked at 5th.');

  // Test 9: Admin Immunity Test (Admins are NEVER warned or kicked for spam)
  console.log('\n▶ Test 9: Verifying Admin Spam Immunity...');
  sentMessages.length = 0;
  kickedUsers.length = 0;

  for (let i = 0; i < 10; i++) {
    await moderator.handleStickerSpam(mockSock, mockGroup, adminUser, mockGroupMetadata);
    await moderator.handleMessageSpam(mockSock, mockGroup, adminUser, 'admin announcement', mockGroupMetadata);
  }
  assert.strictEqual(sentMessages.length, 0, 'Admin should NEVER receive spam warnings');
  assert.strictEqual(kickedUsers.length, 0, 'Admin should NEVER be kicked for spam');
  console.log('  ✅ Admin Immunity: Admin sent 10 stickers and 10 messages with 0 warnings and 0 kicks.');

  // Test 10: Admin Kick Protection Test (No one can kick admins)
  console.log('\n▶ Test 10: Verifying Admin Protection on .kick...');
  const kickCheck = moderator.canKickUser(adminUser, botJid, mockGroupMetadata);
  assert.strictEqual(kickCheck.allowed, false, 'Kicking an admin must NOT be allowed');
  assert(kickCheck.reason.includes('Admin Protection'), 'Reason should cite Admin Protection');

  const regularCheck = moderator.canKickUser(spammerUser, botJid, mockGroupMetadata);
  assert.strictEqual(regularCheck.allowed, true, 'Kicking a regular member must be allowed');
  console.log('  ✅ Admin Protection: .kick on admin blocked successfully.');

  // Test 11: Auto-Welcome Test (User joins GC -> welcomes with correct phone number mention)
  console.log('\n▶ Test 11: Verifying Auto-Welcome on Group Join...');
  sentMessages.length = 0;
  const newMemberJid = '923009876543@s.whatsapp.net';
  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: null,
    participants: [newMemberJid],
    action: 'add'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one welcome message must be sent');
  const welcomeMsg = sentMessages[0].content.text;
  assert(welcomeMsg.includes('@923009876543'), 'Welcome message must mention @923009876543');
  assert(welcomeMsg.includes('+923009876543'), 'Welcome message must show clean phone +923009876543');
  assert(sentMessages[0].content.mentions.includes('923009876543@s.whatsapp.net'), 'Mentions array must include new member JID');
  assert(welcomeMsg.includes('WELCOME TO THE GROUP'), 'Welcome message must include welcome header');
  console.log('  ✅ Auto-Welcome: Sent friendly welcome mentioning @923009876543 (+923009876543).');

  // Test 12: Auto-Goodbye on Voluntary Leave (User leaves GC -> says goodbye with correct number)
  console.log('\n▶ Test 12: Verifying Auto-Goodbye on Voluntary Leave...');
  sentMessages.length = 0;
  const leavingUserJid = '923001122334@s.whatsapp.net';
  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: leavingUserJid, // Author is self -> voluntary leave
    participants: [leavingUserJid],
    action: 'remove'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one goodbye message must be sent');
  const leaveMsg = sentMessages[0].content.text;
  assert(leaveMsg.includes('Goodbye @923001122334'), 'Goodbye message must say goodbye @923001122334');
  assert(leaveMsg.includes('*Member Left:* @923001122334 (+923001122334)'), 'Must show correct leaving member phone number');
  assert(sentMessages[0].content.mentions.includes('923001122334@s.whatsapp.net'), 'Mentions array must include member JID');
  console.log('  ✅ Auto-Goodbye (Leave): Sent goodbye mentioning @923001122334 (+923001122334).');

  // Test 13: Auto-Goodbye on Admin Kick (Admin kicks member -> shows correct number of kicked person & admin)
  console.log('\n▶ Test 13: Verifying Auto-Goodbye & Correct Number on Admin Kick...');
  sentMessages.length = 0;
  const kickedUserJid = '923335557777@s.whatsapp.net';
  const kickingAdminJid = '923116469820@s.whatsapp.net';
  
  // Record kick first (simulating .kick or groupParticipantsUpdate)
  welcomeHandler.recordKick(mockGroup, kickedUserJid, kickingAdminJid);

  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: kickingAdminJid,
    participants: [kickedUserJid],
    action: 'remove'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one kicked goodbye message must be sent');
  const kickMsg = sentMessages[0].content.text;
  assert(kickMsg.includes('Goodbye @923335557777'), 'Must say goodbye to kicked user @923335557777');
  assert(kickMsg.includes('*Kicked Member:* @923335557777 (+923335557777)'), 'Must show correct number of kicked person');
  assert(kickMsg.includes('*Removed By:* @923116469820 (+923116469820)'), 'Must show admin who removed them');
  assert(sentMessages[0].content.mentions.includes('923335557777@s.whatsapp.net'), 'Must mention kicked user');
  console.log('  ✅ Auto-Goodbye (Kick): Sent kicked notice with correct number of kicked person @923335557777 and kicker.');

  // Test 14: Anti-Delete Stealth Private Mode (Sends to owner inbox, NOT the group)
  console.log('\n▶ Test 14: Verifying Anti-Delete Stealth Delivery to Private Inbox...');
  const antiDelete = require('../lib/antiDelete');
  const deletedMsgId = 'DELETED_MSG_999';
  const testChatGroup = '987654321-group@g.us';
  const victimSender = '923444444444@s.whatsapp.net';

  const originalIncomingMsg = {
    key: {
      remoteJid: testChatGroup,
      fromMe: false,
      id: deletedMsgId,
      participant: victimSender
    },
    message: {
      conversation: 'Secret message that will be deleted!'
    }
  };

  // 1. Store message in cache
  antiDelete.storeMessage(originalIncomingMsg);

  // 2. Someone deletes the message (revoke packet arrives)
  const revokePacket = {
    key: {
      remoteJid: testChatGroup,
      fromMe: false,
      id: 'REVOKE_PACKET_001'
    },
    message: {
      protocolMessage: {
        key: {
          remoteJid: testChatGroup,
          id: deletedMsgId,
          participant: victimSender
        },
        type: 0 // REVOKE
      }
    }
  };

  sentMessages.length = 0;
  await antiDelete.handleRevoke(mockSock, revokePacket);

  // Verification:
  assert.strictEqual(sentMessages.length, 1, 'Exactly one message should be sent for recovery');
  assert.notStrictEqual(sentMessages[0].to, testChatGroup, 'Recovered message must NOT be sent to the group!');
  const expectedInbox = mockSock.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net';
  assert.strictEqual(sentMessages[0].to, expectedInbox, 'Recovered message must be delivered to owner personal inbox');
  assert(sentMessages[0].content.text.includes('Secret message that will be deleted!'), 'Recovered message must contain deleted text');
  assert(sentMessages[0].content.text.includes('923444444444'), 'Must identify sender');
  console.log('  ✅ Anti-Delete: Forwarded deleted message to private inbox without alerting group.');

  // Test 15: View-Once Stealth Mode (Auto-deletes command, sends to private inbox)
  console.log('\n▶ Test 15: Verifying View-Once Auto-Delete & Stealth Delivery...');
  const viewOnceCmd = require('../commands/general/viewonce');
  const viewOnceMsgId = 'VO_COMMAND_MSG_123';

  const mockViewOnceCommand = {
    key: {
      remoteJid: testChatGroup,
      fromMe: true,
      id: viewOnceMsgId,
      participant: botJid
    },
    message: {
      extendedTextMessage: {
        text: '.viewonce',
        contextInfo: {
          participant: '923555555555@s.whatsapp.net',
          quotedMessage: {
            viewOnceMessageV2: {
              message: {
                imageMessage: {
                  url: 'https://example.com/fake-media',
                  mimetype: 'image/jpeg',
                  caption: 'Secret View Once Photo'
                }
              }
            }
          }
        }
      }
    }
  };

  sentMessages.length = 0;
  // Mock downloadContentFromMessage to return test buffer
  await viewOnceCmd.execute({ sock: mockSock, msg: mockViewOnceCommand, from: testChatGroup });

  // Verify command deletion message was dispatched to the group
  const deleteCommandDispatch = sentMessages.find(m => m.content.delete && m.content.delete.id === viewOnceMsgId);
  assert(deleteCommandDispatch, 'Must automatically delete the .viewonce command message from chat');
  assert.strictEqual(deleteCommandDispatch.to, testChatGroup, 'Delete command target must be the group');

  // Verify no reaction emoji was sent to the group
  const reactionSent = sentMessages.find(m => m.content.react);
  assert(!reactionSent, 'Must NOT react with any emoji in the group');
  console.log('  ✅ View-Once: Command automatically deleted from chat, no public notifications.');

  // Test 16: MessageStore & getMessage Retry (Resolves "Waiting for this message" issue)
  console.log('\n▶ Test 16: Verifying MessageStore & getMessage Retry Resolution...');
  const messageStore = require('../lib/messageStore');
  const testMsgId = 'RETRY_CMD_REPLY_789';
  const testJid = '923116469820@s.whatsapp.net';
  const mockOutgoingReply = {
    key: {
      remoteJid: testJid,
      fromMe: true,
      id: testMsgId
    },
    message: {
      extendedTextMessage: {
        text: 'This is the bot command response'
      }
    }
  };

  messageStore.set(testMsgId, mockOutgoingReply);

  // Simulate Baileys getMessage call when recipient requests retry
  const retrievedProto = messageStore.getMessageProto({ id: testMsgId, remoteJid: testJid });
  assert(retrievedProto !== null, 'Must retrieve original message proto on retry request');
  assert.strictEqual(
    retrievedProto.extendedTextMessage.text,
    'This is the bot command response',
    'Retrieved proto must match original command reply content'
  );

  const emptyProto = messageStore.getMessageProto({ id: 'NON_EXISTENT_ID' });
  assert.strictEqual(emptyProto, null, 'Non-existent ID should return null safely');
  console.log('  ✅ MessageStore: Correctly provides message proto for Signal retry requests.');

  console.log('\n🎉 ALL 16 AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
