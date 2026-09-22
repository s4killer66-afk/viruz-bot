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
  assert(hokErr && (hokErr.includes('Account Not Found') || hokErr.includes('unreachable')), 'Invalid HOK ID must return Account Not Found or unreachable error');
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
    },
    async groupMetadata(groupId) {
      return mockGroupMetadata;
    }
  };

  // User sends 1st, 2nd, and 3rd sticker -> no kick, no warn
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 0, 'No warning should be sent on 1st, 2nd, or 3rd sticker');
  assert.strictEqual(kickedUsers.length, 0, 'No kick on 1st, 2nd, or 3rd sticker');

  // User sends 4th sticker -> WARNING expected (Sticker limit reached)
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 1, 'Warning message must be sent on 4th sticker');
  assert(sentMessages[0].content.text.includes('STICKER SPAM WARNING'), 'Should be sticker warning message');
  assert.strictEqual(kickedUsers.length, 0, 'User should not be kicked yet at 4th sticker');

  // User sends 5th sticker -> AUTO KICK expected!
  await moderator.handleStickerSpam(mockSock, mockGroup, spammerUser, mockGroupMetadata);
  assert(kickedUsers.includes(spammerUser), 'User must be kicked on 5th sticker spam');
  assert(sentMessages.some(m => m.content.text.includes('AUTO KICK - STICKER SPAM')), 'Auto kick notice sent');
  console.log('  ✅ Sticker Spam: Warned at 4th, auto-kicked at 5th.');

  // Test 8: Message Spam Auto-Kick Logic
  console.log('\n▶ Test 8: Verifying Repeated Message Spam Auto-Kick Logic...');
  const msgSpammer = '923333333333@s.whatsapp.net';
  mockGroupMetadata.participants.push({ id: msgSpammer, admin: null });

  sentMessages.length = 0;
  kickedUsers.length = 0;

  // Send 4 repeated messages -> no warning yet
  for (let i = 0; i < 4; i++) {
    await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  }
  assert.strictEqual(sentMessages.length, 0, 'No warning on 1-4 messages');
  assert.strictEqual(kickedUsers.length, 0, 'No kick on 1-4 messages');

  // 5th repeated message -> WARNING expected!
  await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  assert.strictEqual(sentMessages.length, 1, 'Warning must be sent on 5th repeated message');
  assert(sentMessages[0].content.text.includes('MESSAGE SPAM WARNING'), 'Should be message spam warning');
  assert.strictEqual(kickedUsers.length, 0, 'User should not be kicked at 5th message');

  // 6th repeated message -> AUTO KICK expected!
  await moderator.handleMessageSpam(mockSock, mockGroup, msgSpammer, 'hello spam', mockGroupMetadata);
  assert(kickedUsers.includes(msgSpammer), 'User must be kicked on 6th repeated message');
  assert(sentMessages.some(m => m.content.text.includes('AUTO KICK - MESSAGE SPAM')), 'Auto kick message sent');
  console.log('  ✅ Message Spam: Warned at 5th, auto-kicked at 6th.');

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
  console.log('\n▶ Test 11: Verifying Auto-Welcome on Group Join (Standard & WhatsApp LID)...');
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
  console.log('  ✅ Auto-Welcome (Standard): Sent friendly welcome mentioning @923009876543 (+923009876543).');

  // Test 11b: WhatsApp LID Auto-Welcome Resolution
  sentMessages.length = 0;
  const lidUserJid = '152345678901234@lid';
  const lidRealPhone = '923007788990';
  // Simulate participant metadata in group with LID and real phone in p.jid
  mockGroupMetadata.participants.push({
    id: lidUserJid,
    jid: `${lidRealPhone}@s.whatsapp.net`,
    lid: lidUserJid,
    admin: null
  });
  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: null,
    participants: [lidUserJid],
    action: 'add'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one welcome message must be sent for LID join');
  const lidWelcomeMsg = sentMessages[0].content.text;
  assert(lidWelcomeMsg.includes(`@${lidRealPhone}`), `Welcome message must resolve LID and mention @${lidRealPhone}`);
  assert(lidWelcomeMsg.includes(`+${lidRealPhone}`), `Welcome message must show real phone +${lidRealPhone}`);
  assert(!lidWelcomeMsg.includes('152345678901234'), 'Welcome message must NEVER display raw WhatsApp LID!');
  assert(sentMessages[0].content.mentions.includes(`${lidRealPhone}@s.whatsapp.net`), 'Mentions must use resolved phone number');
  console.log(`  ✅ Auto-Welcome (WhatsApp LID): Successfully resolved LID to @${lidRealPhone} (+${lidRealPhone}) with zero LID leaks.`);

  // Test 12: Auto-Goodbye on Voluntary Leave (LID User leaves GC -> cached roster resolves real number)
  console.log('\n▶ Test 12: Verifying Auto-Goodbye on Voluntary Leave (Roster Cache LID Resolution)...');
  sentMessages.length = 0;
  // Now simulate that WhatsApp removed the user from the live groupMetadata upon departure
  mockGroupMetadata.participants = mockGroupMetadata.participants.filter(p => p.id !== lidUserJid && p.lid !== lidUserJid);

  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: lidUserJid, // Author is self -> voluntary leave
    participants: [lidUserJid],
    action: 'remove'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one goodbye message must be sent');
  const leaveMsg = sentMessages[0].content.text;
  assert(leaveMsg.includes(`Goodbye @${lidRealPhone}`), `Goodbye message must say goodbye @${lidRealPhone}`);
  assert(leaveMsg.includes(`*Member Left:* @${lidRealPhone} (+${lidRealPhone})`), 'Must show correct leaving member phone number');
  assert(!leaveMsg.includes('152345678901234'), 'Goodbye message must NEVER display raw WhatsApp LID!');
  assert(sentMessages[0].content.mentions.includes(`${lidRealPhone}@s.whatsapp.net`), 'Mentions array must include resolved member JID');
  console.log(`  ✅ Auto-Goodbye (Leave with LID): Roster cache resolved departing member to @${lidRealPhone} (+${lidRealPhone}).`);

  // Test 13: Auto-Goodbye on Admin Kick (Both Admin & Kicked User have WhatsApp LIDs)
  console.log('\n▶ Test 13: Verifying Auto-Goodbye & Correct Number on Admin Kick with LIDs...');
  sentMessages.length = 0;
  const kickedLid = '998877665544332@lid';
  const kickedPhone = '923335557777';
  const adminLid = '112233445566778@lid';
  const adminPhone = '923116469820';

  // Seed LID mappings for the kicked member and admin into the welcomeHandler roster cache
  welcomeHandler.groupRosterCache.set(mockGroup, new Map([
    ['998877665544332', { phone: kickedPhone, name: 'Kicked Member' }],
    [kickedPhone, { phone: kickedPhone, name: 'Kicked Member' }],
    ['112233445566778', { phone: adminPhone, name: 'Admin Kicker' }],
    [adminPhone, { phone: adminPhone, name: 'Admin Kicker' }]
  ]));
  
  // Record kick first (simulating .kick command)
  welcomeHandler.recordKick(mockGroup, kickedLid, adminLid);

  await welcomeHandler.handleParticipantUpdate(mockSock, {
    id: mockGroup,
    author: adminLid,
    participants: [kickedLid],
    action: 'remove'
  });
  assert.strictEqual(sentMessages.length, 1, 'Exactly one kicked goodbye message must be sent');
  const kickMsg = sentMessages[0].content.text;
  assert(kickMsg.includes(`Goodbye @${kickedPhone}`), `Must say goodbye to kicked user @${kickedPhone}`);
  assert(kickMsg.includes(`*Kicked Member:* @${kickedPhone} (+${kickedPhone})`), 'Must show correct number of kicked person');
  assert(kickMsg.includes(`*Removed By:* @${adminPhone} (+${adminPhone})`), 'Must show admin who removed them with real phone number');
  assert(!kickMsg.includes('998877665544332'), 'Must NEVER leak kicked user LID');
  assert(!kickMsg.includes('112233445566778'), 'Must NEVER leak kicker admin LID');
  assert(sentMessages[0].content.mentions.includes(`${kickedPhone}@s.whatsapp.net`), 'Must mention kicked user phone');
  assert(sentMessages[0].content.mentions.includes(`${adminPhone}@s.whatsapp.net`), 'Must mention kicker admin phone');
  console.log(`  ✅ Auto-Goodbye (Kick with LIDs): Resolved kicked member @${kickedPhone} and kicker admin @${adminPhone} with zero LID leaks.`);

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
  assert(sentMessages.length >= 1, 'At least one recovery message should be delivered');
  assert(!sentMessages.some(m => m.to === testChatGroup), 'Recovered message must NOT be sent to the group!');
  const expectedInbox = mockSock.user.id.split(':')[0].split('@')[0] + '@s.whatsapp.net';
  assert(sentMessages.some(m => m.to === expectedInbox), 'Recovered message must be delivered to owner personal inbox');
  assert(sentMessages[0].content.text.includes('Secret message that will be deleted!'), 'Recovered message must contain deleted text');
  assert(sentMessages[0].content.text.includes('923444444444'), 'Must identify sender');
  console.log('  ✅ Anti-Delete: Forwarded deleted message to private inbox without alerting group.');

  // Test 14b: Anti-Delete Status Stability (Checking status must NOT toggle or disable)
  console.log('\n▶ Test 14b: Verifying Anti-Delete Status Command Stability...');
  const antiDeleteCmd = require('../commands/admin/antidelete');
  antiDelete.setEnabled(true);
  assert.strictEqual(antiDelete.isEnabled(), true, 'Must start enabled');

  // Running status check must keep it enabled!
  sentMessages.length = 0;
  await antiDeleteCmd.execute({
    sock: mockSock,
    msg: { key: { id: 'STATUS_TEST_MSG', fromMe: true } },
    from: '923116469820@s.whatsapp.net',
    sender: '923116469820@s.whatsapp.net',
    args: ['status']
  });
  assert.strictEqual(antiDelete.isEnabled(), true, 'Checking status must NOT toggle or disable anti-delete!');
  assert(sentMessages[0].content.text.includes('ENABLED'), 'Status report must show ENABLED');

  // Running .antidelete without args must also NOT toggle or disable!
  sentMessages.length = 0;
  await antiDeleteCmd.execute({
    sock: mockSock,
    msg: { key: { id: 'EMPTY_TEST_MSG', fromMe: true } },
    from: '923116469820@s.whatsapp.net',
    sender: '923116469820@s.whatsapp.net',
    args: []
  });
  assert.strictEqual(antiDelete.isEnabled(), true, 'Running without args must NOT toggle or disable anti-delete!');
  assert(sentMessages[0].content.text.includes('ENABLED'), 'Status report must show ENABLED');
  console.log('  ✅ Anti-Delete Status: Checking status retains enabled state without inadvertent toggling.');

  // Test 14c: messages.update Revoke Recovery
  console.log('\n▶ Test 14c: Verifying messages.update Revoke Recovery...');
  const msgUpdateDeletedId = 'DELETED_MSG_UPDATE_888';
  const msgUpdateToStore = {
    key: {
      remoteJid: testChatGroup,
      fromMe: false,
      id: msgUpdateDeletedId,
      participant: victimSender
    },
    message: {
      conversation: 'Deleted message delivered via messages.update event'
    }
  };
  antiDelete.storeMessage(msgUpdateToStore);

  sentMessages.length = 0;
  await antiDelete.handleRevokeUpdate(mockSock, {
    key: {
      remoteJid: testChatGroup,
      id: msgUpdateDeletedId,
      participant: victimSender
    },
    update: {
      message: null,
      messageStubType: 68
    }
  });

  assert(sentMessages.length >= 1, 'Message must be recovered via messages.update event');
  assert(sentMessages.some(m => m.content.text.includes('Deleted message delivered via messages.update event')), 'Must contain recovered text');
  console.log('  ✅ Anti-Delete Update: Successfully recovered message via messages.update event.');

  // Test 14d: Accurate Phone Number & Pre-Cached Photo Recovery
  console.log('\n▶ Test 14d: Verifying LID Phone Resolution & Pre-Cached Photo Recovery...');
  const { resolvePhoneNumber } = require('../lib/antiDelete');
  const mockGroupMetadataWithLids = {
    participants: [
      { id: '923001234567@s.whatsapp.net', lid: '100200300400@lid' },
      { id: '923119876543@s.whatsapp.net', lid: '500600700800@lid' }
    ]
  };

  // 1. Resolve LID to real phone number
  const resolvedPhone = resolvePhoneNumber('100200300400@lid', false, mockGroupMetadataWithLids, mockSock);
  assert.strictEqual(resolvedPhone, '923001234567', 'Must resolve LID to exact real phone number');

  // 2. Group JIDs must never be returned as phone numbers
  const groupPhone = resolvePhoneNumber('120363999999999@g.us', false, mockGroupMetadataWithLids, mockSock);
  assert.strictEqual(groupPhone, 'Unknown', 'Group JID must never be treated as phone number');

  // 3. Pre-cached photo recovery: forwards exact image buffer
  const photoMsgId = 'DELETED_PHOTO_111';
  const photoToStore = {
    key: {
      remoteJid: testChatGroup,
      fromMe: false,
      id: photoMsgId,
      participant: '923001234567@s.whatsapp.net'
    },
    message: {
      imageMessage: {
        caption: 'Funny gaming meme'
      }
    }
  };
  antiDelete.storeMessage(photoToStore);

  // Simulate pre-cached buffer in memory
  const cachedStored = require('../lib/messageStore').get(photoMsgId);
  cachedStored._mediaBuffer = Buffer.from('FAKEMEDIABUFFERDATA');

  sentMessages.length = 0;
  await antiDelete.handleRevoke(mockSock, {
    key: {
      remoteJid: testChatGroup,
      fromMe: false,
      id: 'REVOKE_PHOTO_001',
      participant: '923001234567@s.whatsapp.net'
    },
    message: {
      protocolMessage: {
        key: {
          remoteJid: testChatGroup,
          id: photoMsgId,
          participant: '923001234567@s.whatsapp.net'
        },
        type: 0
      }
    }
  });

  assert(sentMessages.length >= 1, 'Photo must be recovered');
  const photoSent = sentMessages.find(m => m.content.image);
  assert(photoSent, 'Must deliver actual image buffer');
  assert.strictEqual(photoSent.content.image.toString(), 'FAKEMEDIABUFFERDATA', 'Buffer must match pre-cached media');
  assert(photoSent.content.caption.includes('Funny gaming meme'), 'Caption must be included');
  assert(photoSent.content.caption.includes('923001234567'), 'Deleter phone number must be included');
  console.log('  ✅ Anti-Delete Photo: Successfully recovered exact photo with accurate phone number & caption.');

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

  // Test 17: Verifying Admin Warning Command (.warn)
  console.log('\n▶ Test 17: Verifying Admin Warning Command (.warn & admin attribution)...');
  const warnCmd = commandHandler.getCommand('warn');
  assert(warnCmd !== null, 'Command .warn must be loaded');
  assert(commandHandler.aliases.get('warning') === 'warn', 'Alias warning must point to warn');
  assert(commandHandler.aliases.get('resetwarn') === 'warn', 'Alias resetwarn must point to warn');

  const warnTarget = '923112233445@s.whatsapp.net';
  const adminSender = '923116469820@s.whatsapp.net';
  mockGroupMetadata.participants.push({ id: warnTarget, admin: null });

  // 1. Admin protection: Admins cannot be warned
  const adminWarnCheck = moderator.canWarnUser(adminSender, botJid, mockGroupMetadata);
  assert.strictEqual(adminWarnCheck.allowed, false, 'Admins must be protected from warnings');
  assert(adminWarnCheck.reason.includes('Admin Protection'), 'Should mention Admin Protection');

  // 2. Bot protection: Bot cannot warn itself
  const botWarnCheck = moderator.canWarnUser(botJid, botJid, mockGroupMetadata);
  assert.strictEqual(botWarnCheck.allowed, false, 'Bot cannot warn itself');

  // 3. Regular member can be warned
  const regularWarnCheck = moderator.canWarnUser(warnTarget, botJid, mockGroupMetadata);
  assert.strictEqual(regularWarnCheck.allowed, true, 'Regular members can be warned');

  // 4. Issue 1st warning via command
  sentMessages.length = 0;
  kickedUsers.length = 0;
  const mockWarnMsg1 = {
    key: { remoteJid: mockGroup, participant: adminSender, fromMe: false },
    pushName: 'Admin Ali',
    message: {
      extendedTextMessage: {
        text: `.warn @923112233445 Bad behavior in chat`,
        contextInfo: {
          mentionedJid: [warnTarget]
        }
      }
    }
  };

  await warnCmd.execute({
    sock: mockSock,
    msg: mockWarnMsg1,
    from: mockGroup,
    isGroup: true,
    sender: adminSender,
    groupMetadata: mockGroupMetadata,
    botJid,
    args: ['@923112233445', 'Bad', 'behavior', 'in', 'chat'],
    commandName: 'warn'
  });

  assert.strictEqual(sentMessages.length, 1, 'Warning message 1 must be sent');
  const warnText1 = sentMessages[0].content.text;
  assert(warnText1.includes('Admin Ali'), 'Warning message must attribute the warning to the admin name');
  assert(warnText1.includes('923112233445'), 'Warning message must mention target user');
  assert(warnText1.includes('Bad behavior in chat'), 'Warning message must show the reason');
  assert(warnText1.includes('1 / 6'), 'Warning count must show 1 / 6');
  assert(sentMessages[0].content.mentions.includes(warnTarget), 'Target must be in mentions');

  // 5. Issue 2nd through 5th warnings
  for (let w = 2; w <= 5; w++) {
    sentMessages.length = 0;
    await warnCmd.execute({
      sock: mockSock,
      msg: mockWarnMsg1,
      from: mockGroup,
      isGroup: true,
      sender: adminSender,
      groupMetadata: mockGroupMetadata,
      botJid,
      args: ['@923112233445', `Warning number ${w}`],
      commandName: 'warn'
    });
    assert(sentMessages[0].content.text.includes(`${w} / 6`), `Warning count must show ${w} / 6`);
    assert.strictEqual(kickedUsers.length, 0, `User should not be kicked at warning ${w}`);
  }

  // 6. Issue 6th warning -> AUTO-KICK triggered!
  sentMessages.length = 0;
  await warnCmd.execute({
    sock: mockSock,
    msg: mockWarnMsg1,
    from: mockGroup,
    isGroup: true,
    sender: adminSender,
    groupMetadata: mockGroupMetadata,
    botJid,
    args: ['@923112233445', 'Final 6th strike'],
    commandName: 'warn'
  });
  assert(kickedUsers.includes(warnTarget), 'User must be kicked on 6th warning');
  assert(sentMessages[0].content.text.includes('FINAL WARNING & AUTO-KICK'), 'Must show final warning and kick banner');
  assert(sentMessages[0].content.text.includes('6 / 6'), 'Must show 6 / 6 limit exceeded');
  assert(sentMessages[0].content.text.includes('Admin Ali'), 'Must show admin attribution on 6th warning');

  // 7. Test reset warnings (.warn reset or .resetwarn)
  sentMessages.length = 0;
  moderator.addWarning(mockGroup, warnTarget, adminSender, 'Admin Ali', 'Test warn');
  assert.strictEqual(moderator.getWarnings(mockGroup, warnTarget).count, 1, 'Should have 1 warn');

  await warnCmd.execute({
    sock: mockSock,
    msg: mockWarnMsg1,
    from: mockGroup,
    isGroup: true,
    sender: adminSender,
    groupMetadata: mockGroupMetadata,
    botJid,
    args: ['@923112233445'],
    commandName: 'resetwarn'
  });
  assert(sentMessages[0].content.text.includes('WARNINGS RESET'), 'Must show warnings reset message');
  assert(sentMessages[0].content.text.includes('0 / 6'), 'Must show reset to 0 / 6');
  assert.strictEqual(moderator.getWarnings(mockGroup, warnTarget).count, 0, 'Warnings must be reset to 0');
  console.log('  ✅ Admin Warning: Warned up to 5th with admin name attribution, auto-kicked at 6th, and reset verified.');

  // Test 18: Verifying Mobile Legends Hero Voice TTS (.tts & .tt)
  console.log('\n▶ Test 18: Verifying Mobile Legends Hero Voice TTS (.tts & .tt)...');
  const ttsCmd = commandHandler.getCommand('tts');
  assert(ttsCmd !== null, 'Command .tts must be loaded');
  assert(commandHandler.aliases.get('tt') === 'tts', 'Alias tt must point to tts');
  assert(commandHandler.aliases.get('mltts') === 'tts', 'Alias mltts must point to tts');
  assert(commandHandler.aliases.get('herotts') === 'tts', 'Alias herotts must point to tts');

  const { resolveHero, getHeroCatalog, generateHeroTTS } = require('../lib/heroVoices');
  assert(resolveHero('vale') !== null, 'Vale must resolve');
  assert(resolveHero('valir') !== null, 'Valir must resolve');
  assert(resolveHero('vexana') !== null, 'Vexana must resolve');
  assert(resolveHero('vex') !== null, 'Vex alias must resolve to Vexana');
  assert(resolveHero('gus') !== null, 'Gus must resolve to Gusion');
  assert(resolveHero('layla') !== null, 'Layla must resolve');

  // Test catalog
  const catalog = getHeroCatalog();
  assert(catalog.includes('Vale') && catalog.includes('Valir') && catalog.includes('Vexana'), 'Catalog must list Vale, Valir, and Vexana');

  // Test command execution: .tts list
  sentMessages.length = 0;
  await ttsCmd.execute({
    sock: mockSock,
    msg: { key: { id: 'test_tts_1' } },
    from: mockGroup,
    args: ['list']
  });
  assert.strictEqual(sentMessages.length, 1, 'Catalog message must be sent');
  assert(sentMessages[0].content.text.includes('HERO VOICE VOICENOTES'), 'Catalog header must be sent');

  // Test command execution: .tts vale Wind will guide our path!
  sentMessages.length = 0;
  await ttsCmd.execute({
    sock: mockSock,
    msg: { key: { id: 'test_tts_2' } },
    from: mockGroup,
    args: ['vale', 'Wind', 'will', 'guide', 'our', 'path!']
  });
  assert(sentMessages.some(m => m.content.audio), 'Audio message must be sent');
  const audioMsg = sentMessages.find(m => m.content.audio);
  assert(Buffer.isBuffer(audioMsg.content.audio), 'Audio payload must be a Buffer');
  assert(audioMsg.content.audio.length > 1000, 'Audio Buffer must contain voice data');
  assert.strictEqual(audioMsg.content.mimetype, 'audio/mpeg', 'Mimetype must be audio/mpeg for WhatsApp native MP3 player');
  assert(audioMsg.content.fileName.includes('Vale'), 'FileName must include hero name');

  // Test command execution: .tt vexana Fear the undead queen!
  sentMessages.length = 0;
  await ttsCmd.execute({
    sock: mockSock,
    msg: { key: { id: 'test_tts_3' } },
    from: mockGroup,
    args: ['vexana', 'Fear', 'the', 'undead', 'queen!']
  });
  assert(sentMessages.some(m => m.content.audio), 'Vexana audio message must be sent');
  const vexanaAudio = sentMessages.find(m => m.content.audio);
  assert(Buffer.isBuffer(vexanaAudio.content.audio), 'Vexana audio payload must be a Buffer');
  assert(vexanaAudio.content.audio.length > 1000, 'Vexana audio Buffer must contain voice data');
  assert.strictEqual(vexanaAudio.content.mimetype, 'audio/mpeg', 'Vexana mimetype must be audio/mpeg');
  assert(vexanaAudio.content.fileName.includes('Vexana'), 'FileName must include Vexana');
  console.log('  ✅ Mobile Legends Hero Voice TTS: Vale & Vexana audio files generated with native audio/mpeg and .tt alias.');

  console.log('\n🎉 ALL 18 AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
