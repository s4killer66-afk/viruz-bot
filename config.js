/**
 * Atlas-MD WhatsApp Bot Configuration
 */

module.exports = {
  // Bot Information
  botName: process.env.BOT_NAME || 'VIRUZ',
  ownerName: process.env.OWNER_NAME || 'VIRUZ',
  ownerNumbers: ['923116469820', '923000000000'], // Added user's WhatsApp phone number
  prefix: '.', // Default prefix
  prefixes: ['.', ',', '!', '#', '/'], // Supported prefixes: .menu, ,menu, !menu, #menu, /menu
  sessionDir: './auth_info_baileys',

  // Web Dashboard Settings
  port: process.env.PORT || process.env.SERVER_PORT || 8080,

  // Group Moderation & Anti-Spam Thresholds
  antiSpam: {
    enabled: true,
    
    // Sticker Spam Rules:
    // 4th rapid sticker = Warning
    // 5th rapid sticker = Auto-Kick
    stickerWarningThreshold: 4,
    stickerKickThreshold: 5,
    stickerTimeWindowMs: 12000, // 12 seconds window

    // Message Spam Rules:
    // 5th rapid/repeated message = Warning
    // 6th rapid/repeated message = Auto-Kick
    messageWarningThreshold: 5,
    messageKickThreshold: 6,
    messageTimeWindowMs: 10000, // 10 seconds window

    // Admins and Bot Owner are permanently immune
    adminImmunity: true,
  },

  // Game Checker Settings
  gameChecker: {
    cacheTtlSeconds: 300, // Cache account lookups for 5 minutes to avoid rate limits
  },

  // Group Welcome & Goodbye Notifications
  welcome: {
    enabled: true, // Enabled by default
  }
};
