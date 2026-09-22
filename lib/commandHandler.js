/**
 * Atlas-MD Command Loader and Dispatcher
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const groupModerator = require('./groupModerator');

class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.loadCommands();
  }

  /**
   * Recursively read and load command files
   */
  loadCommands() {
    const commandsDir = path.join(__dirname, '..', 'commands');
    if (!fs.existsSync(commandsDir)) return;

    const categories = fs.readdirSync(commandsDir);
    for (const cat of categories) {
      const catPath = path.join(commandsDir, cat);
      if (fs.statSync(catPath).isDirectory()) {
        const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
          try {
            const command = require(path.join(catPath, file));
            if (command.name && typeof command.execute === 'function') {
              this.commands.set(command.name.toLowerCase(), command);
              if (Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                  this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
                }
              }
            }
          } catch (err) {
            console.error(`[CommandHandler] Failed to load command ${file}:`, err);
          }
        }
      }
    }
    console.log(`[CommandHandler] Loaded ${this.commands.size} commands (${this.aliases.size} aliases).`);
  }

  /**
   * Find command by name or alias
   */
  getCommand(cmdName) {
    const clean = (cmdName || '').toLowerCase();
    if (this.commands.has(clean)) {
      return this.commands.get(clean);
    }
    if (this.aliases.has(clean)) {
      const realName = this.aliases.get(clean);
      return this.commands.get(realName);
    }
    return null;
  }

  /**
   * Check if text starts with any valid prefix
   */
  getPrefix(text) {
    if (!text || typeof text !== 'string') return null;
    const prefixes = config.prefixes || ['.', ',', '!', '#', '/'];
    for (const p of prefixes) {
      if (text.startsWith(p)) {
        // Guard: Don't treat repeated punctuation like '..' or '///' as a command prefix
        if (text.startsWith(p + p)) return null;
        // Guard: Must have command content after prefix
        const remainder = text.slice(p.length).trim();
        if (!remainder) return null;
        return p;
      }
    }
    return null;
  }

  /**
   * Process message and execute command if prefixed or standalone keyword
   */
  async handleMessage(sock, msg) {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? (msg.key.participant || from) : from;

    // Extract text content from various message types
    const text = (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      ''
    ).trim();

    if (!text) return false;

    let cmdName = null;
    let args = [];

    const matchedPrefix = this.getPrefix(text);
    if (matchedPrefix) {
      args = text.slice(matchedPrefix.length).trim().split(/\s+/);
      cmdName = args.shift().toLowerCase();
    } else {
      // Also check if user typed standalone keyword like 'menu', 'meni', 'help'
      const words = text.split(/\s+/);
      const firstWord = words[0].toLowerCase();
      if (firstWord === 'menu' || firstWord === 'meni' || firstWord === 'help') {
        cmdName = firstWord;
        args = words.slice(1);
      } else {
        return false;
      }
    }

    const command = this.getCommand(cmdName);
    if (!command) return false;

    console.log(`[CommandHandler] Executing command: '${cmdName}' from ${sender} (isGroup: ${isGroup}, fromMe: ${msg.key.fromMe})`);

    let groupMetadata = null;
    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from);
      } catch (e) {}
    }

    // If bot is disabled in this group, only allow .bot command from admins/owner
    if (isGroup && !groupModerator.isBotEnabledInGroup(from)) {
      const isBotPowerCmd = cmdName === 'bot' || cmdName === 'viruz' || cmdName === 'switch' || cmdName === 'power';
      if (!isBotPowerCmd) {
        return false;
      }
    }

    const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';

    try {
      await command.execute({
        sock,
        msg,
        from,
        sender,
        isGroup,
        groupMetadata,
        botJid,
        args,
        text,
        commandName: cmdName
      });
      return true;
    } catch (err) {
      console.error(`[CommandHandler] Error executing command ${cmdName}:`, err);
      await sock.sendMessage(from, {
        text: `⚠️ *Command Error (${cmdName}):* ${err.message}`
      }, { quoted: msg });
      return true;
    }
  }
}

module.exports = new CommandHandler();
