# ⚡ VIRUZ WhatsApp Bot

A powerful Multi-Device WhatsApp Bot with:
- 🎮 **Game Account Information Checkers** (Mobile Legends, Genshin Impact, Honor of Kings) with Country Flags, Region/Server, Active Passes/Subscriptions, and Available Subscription Offers using `✅` and `❌`.
- 🛡️ **Group Chat (GC) Moderation & Anti-Spam Auto-Kick**:
  - **Sticker Spam**: Warning at 4th sticker ⚠️ | Auto-kick at 5th sticker 🚫
  - **Message Spam**: Warning at 5th repeated message ⚠️ | Auto-kick at 6th repeated message 🚫
  - **Admin Immunity**: Admins are **never** warned or kicked for spam
  - **Admin Protection**: No one can kick admins (bot blocks `.kick` against admins)
  - **Admin-Only Commands**: `.kick`, `.add`, `.mute`, `.unmute`, `.tagall`, `.hidetag`
- 🔓 **Tools & Media Utilities**:
  - **View Once Downloader** (`.viewonce`, `.videwonce`, `.vv`): Download and reveal View-Once photos, videos, and voice notes.
  - **Anti-Delete Engine** (`.antidelete`, `.antidelet`): Automatically catches and reposts deleted messages, photos, videos, and stickers.
- 🌐 **Web Pairing Portal (`http://localhost:3000`)**:
  - Link WhatsApp using an 8-character pairing code
  - Real-time connection status indicator

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Settings (Optional)
Edit `config.js` to set your bot name, owner WhatsApp number, and spam thresholds:
```javascript
module.exports = {
  botName: 'VIRUZ',
  ownerName: 'VIRUZ',
  ownerNumbers: ['923116469820'], // Your phone number with country code
  prefix: '.',
  port: 3000,
  // ...
};
```

### 3. Start the Bot & Web Portal
```bash
npm start
```
You will see:
```
======================================================
🚀 VIRUZ BOT & WEB PAIRING DASHBOARD
🌐 Dashboard URL: http://localhost:3000
======================================================
```

### 4. Link WhatsApp
1. Open your browser and navigate to `http://localhost:3000`.
2. Enter your WhatsApp phone number with country code (e.g. `923001234567`).
3. Click **"Get Pairing Code"**.
4. An 8-character code will appear (e.g. `ABCD-1234`).
5. On your phone, open WhatsApp > **Settings** (or 3 dots) > **Linked Devices** > **Link a device** > **Link with phone number instead** and enter the code.
6. Once linked, the status on the web dashboard will change to **Connected**!

---

## 🎮 Game Account Checker Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| `.ml` | `.ml <id> <zone>` | Checks Mobile Legends username, server, country flag, Weekly Diamond Pass, Starlight, and recharge offers. |
| `.genshin` | `.genshin <uid>` | Checks Genshin Impact Traveler UID, server, country flag, Welkin Moon, Battle Pass, and Crystal offers. |
| `.hok` | `.hok <id>` | Checks Honor of Kings player ID, server, country flag, Honor Pass, and weekly/monthly card offers. |

### Sample Output Format:
```text
╭───『 MOBILE LEGENDS ACCOUNT INFO 』───╮
🎮 Game: Mobile Legends: Bang Bang
👤 Username: Outrageous Dominance
🆔 Account ID: 1114917746
🌐 Server / Zone: 13486
📍 Region: Southeast Asia (SEA)
🏳️ Country: 🇮🇩 Indonesia

══════ 『 PASSES & SUBSCRIPTIONS 』 ══════
✅ Weekly Diamond Pass: Active (18 Days Remaining)
✅ Starlight Membership: Active (Level 42)
❌ Twilight Pass: Not Subscribed

══════ 『 AVAILABLE OFFERS TO SUBSCRIBE 』 ══════
✅ 50% 1st Recharge Bonus: Available
✅ Weekly Diamond Bundle Pack: Available to Subscribe
❌ Monthly Epic Discount Pack: Unavailable / Expired
✅ Season End Recharge Chest: Available
╰───『 VIRUZ • WHATSAPP BOT 』───╯
```

---

## 🛡️ Group Moderation & Anti-Spam Automation

### Anti-Sticker Spam
- If a member rapidly sends stickers:
  - **4th Sticker:** Bot sends a warning tag:
    `⚠️ [STICKER SPAM WARNING] @user Warning (4/5)! Stop spamming stickers or you will be kicked.`
  - **5th Sticker:** Bot automatically removes the user from the group.

### Anti-Message Spam
- If a member repeats or spams the same message:
  - **5th Repeated Message:** Bot sends a warning tag:
    `⚠️ [MESSAGE SPAM WARNING] @user Warning (5/6)! Stop spamming or you will be kicked.`
  - **6th Repeated Message:** Bot automatically removes the user from the group.

### Admin Safety Guarantee
- **Spam Immunity:** Admins and the bot owner are **never** warned or kicked for sending stickers or messages.
- **Protection from `.kick`:** The `.kick` command strictly refuses to kick any group administrator.

---

## 🛠️ Group & Utility Commands

- `.kick @user` - Kick a group member (Admins only, admins cannot be kicked)
- `.add <number>` - Add a member to group (Admins only)
- `.tagall [text]` - Mention all members (Admins only)
- `.hidetag [text]` - Invisible mention all members (Admins only)
- `.mute` - Close group chat so only admins can chat (Admins only)
- `.unmute` - Open group chat for everyone (Admins only)
- `.groupinfo` - View group info and active anti-spam thresholds
- `.menu` - Display full command list
- `.ping` - Check bot response speed
- `.info` - View system uptime and memory statistics

---

## 🧪 Running Tests
To run the automated verification test suite:
```bash
npm test
```
To run the web server integration test:
```bash
node test/test-server.js
```
