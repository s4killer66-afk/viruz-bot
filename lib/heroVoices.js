/**
 * VIRUZ Anime & Hero Voice TTS Engine
 * Converts text into voice audio in the voice style of iconic Anime characters & MLBB heroes.
 * Generates valid MP3 audio buffers in memory with zero external CPU/RAM strain on HYEHOST.
 */

const axios = require('axios');
const { atlasBox } = require('./utils');

const ANIME_VOICES = {
  goku: {
    id: 'goku',
    name: 'Son Goku',
    title: 'Super Saiyan',
    anime: 'Dragon Ball Z',
    emoji: '💥',
    lang: 'ja',
    description: 'Energetic, legendary Saiyan warrior voice',
    aliases: ['goku', 'go', 'songoku', 'kakarot', 'saiyan']
  },
  gojo: {
    id: 'gojo',
    name: 'Satoru Gojo',
    title: 'The Honored One',
    anime: 'Jujutsu Kaisen',
    emoji: '🤞',
    lang: 'ja',
    description: 'Smooth, confident, playful sorcerer voice',
    aliases: ['gojo', 'satoru']
  },
  sukuna: {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    title: 'King of Curses',
    anime: 'Jujutsu Kaisen',
    emoji: '🩸',
    lang: 'ja',
    description: 'Deep, menacing, arrogant King of Curses voice',
    aliases: ['sukuna', 'ryomen', 'curse']
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    title: 'Seventh Hokage',
    anime: 'Naruto',
    emoji: '🍥',
    lang: 'ja',
    description: 'Determined, fiery ninja hero voice (Dattebayo!)',
    aliases: ['naruto', 'naru', 'uzumaki', 'hokage']
  },
  sasuke: {
    id: 'sasuke',
    name: 'Sasuke Uchiha',
    title: 'Avenger of the Uchiha',
    anime: 'Naruto',
    emoji: '⚡',
    lang: 'ja',
    description: 'Calm, cool, sharp shadow ninja voice',
    aliases: ['sasuke', 'saske']
  },
  luffy: {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    title: 'King of the Pirates',
    anime: 'One Piece',
    emoji: '👒',
    lang: 'ja',
    description: 'High-energy, fearless pirate captain voice',
    aliases: ['luffy', 'luf', 'strawhat']
  },
  zoro: {
    id: 'zoro',
    name: 'Roronoa Zoro',
    title: 'King of Hell Swordsman',
    anime: 'One Piece',
    emoji: '⚔️',
    lang: 'ja',
    description: 'Deep, stoic, tough swordsman voice',
    aliases: ['zoro', 'roronoa', 'marimo']
  },
  levi: {
    id: 'levi',
    name: 'Levi Ackerman',
    title: "Humanity's Strongest",
    anime: 'Attack on Titan',
    emoji: '🗡️',
    lang: 'ja',
    description: 'Cold, sharp, disciplined captain voice',
    aliases: ['levi', 'ackerman', 'captain']
  },
  eren: {
    id: 'eren',
    name: 'Eren Yeager',
    title: 'Attack Titan',
    anime: 'Attack on Titan',
    emoji: '🦅',
    lang: 'ja',
    description: 'Intense, relentless freedom fighter voice (Tatakae!)',
    aliases: ['eren', 'yeager', 'tatakae']
  },
  makima: {
    id: 'makima',
    name: 'Makima',
    title: 'Control Devil',
    anime: 'Chainsaw Man',
    emoji: '🐕',
    lang: 'ja',
    description: 'Gentle, chilling, hypnotic controlling voice',
    aliases: ['makima', 'control']
  },
  saitama: {
    id: 'saitama',
    name: 'Saitama',
    title: 'One Punch Man',
    anime: 'One Punch Man',
    emoji: '🥊',
    lang: 'ja',
    description: 'Nonchalant, casual, invincible hero voice',
    aliases: ['saitama', 'onepunch', 'bald']
  },
  madara: {
    id: 'madara',
    name: 'Madara Uchiha',
    title: 'Ghost of the Uchiha',
    anime: 'Naruto',
    emoji: '🔥',
    lang: 'ja',
    description: 'Imposing, thunderous legendary warrior voice',
    aliases: ['madara']
  },
  itachi: {
    id: 'itachi',
    name: 'Itachi Uchiha',
    title: 'Sharingan Prodigy',
    anime: 'Naruto',
    emoji: '👁️',
    lang: 'ja',
    description: 'Calm, wise, melancholic older brother voice',
    aliases: ['itachi']
  },
  tanjiro: {
    id: 'tanjiro',
    name: 'Tanjiro Kamado',
    title: 'Sun Breathing Slayer',
    anime: 'Demon Slayer',
    emoji: '🌊',
    lang: 'ja',
    description: 'Warm, earnest, compassionate fighter voice',
    aliases: ['tanjiro', 'kamado']
  },
  nezuko: {
    id: 'nezuko',
    name: 'Nezuko Kamado',
    title: 'Demon Sister',
    anime: 'Demon Slayer',
    emoji: '🎀',
    lang: 'ja',
    description: 'Soft, protective, sweet voice',
    aliases: ['nezuko']
  },
  dio: {
    id: 'dio',
    name: 'Dio Brando',
    title: 'Vampire Overlord',
    anime: "JoJo's Bizarre Adventure",
    emoji: '⏳',
    lang: 'ja',
    description: 'Theatrical, wicked, triumphant vampire voice (Za Warudo!)',
    aliases: ['dio', 'brando']
  },
  allmight: {
    id: 'allmight',
    name: 'All Might',
    title: 'Symbol of Peace',
    anime: 'My Hero Academia',
    emoji: '💪',
    lang: 'en-US',
    description: 'Booming, heroic, proud champion voice',
    aliases: ['allmight', 'almight', 'toshinori']
  },
  deku: {
    id: 'deku',
    name: 'Izuku Midoriya',
    title: 'Deku',
    anime: 'My Hero Academia',
    emoji: '🥦',
    lang: 'ja',
    description: 'Passionate, heartfelt, determined young hero voice',
    aliases: ['deku', 'midoriya', 'izuku']
  },
  light: {
    id: 'light',
    name: 'Light Yagami',
    title: 'Kira',
    anime: 'Death Note',
    emoji: '📓',
    lang: 'ja',
    description: 'Calculating, dramatic, intellectual voice',
    aliases: ['light', 'kira', 'yagami']
  },
  l: {
    id: 'l',
    name: 'L Lawliet',
    title: 'Master Detective',
    anime: 'Death Note',
    emoji: '🍰',
    lang: 'en-GB',
    description: 'Analytical, eccentric, monotone genius voice',
    aliases: ['l', 'lawliet']
  }
};

const MLBB_VOICES = {
  vale: {
    id: 'vale',
    name: 'Vale',
    title: 'Windtalker',
    role: 'Mage',
    emoji: '🌪️',
    lang: 'en-GB',
    description: 'Mystic, calm British voice (Wind storm)',
    aliases: ['vale']
  },
  valir: {
    id: 'valir',
    name: 'Valir',
    title: 'Son of Flames',
    role: 'Mage',
    emoji: '🔥',
    lang: 'en-US',
    description: 'Passionate, fiery bold voice',
    aliases: ['valir']
  },
  vexana: {
    id: 'vexana',
    name: 'Vexana',
    title: 'Shimmer of Hope',
    role: 'Mage',
    emoji: '🔮',
    lang: 'en-GB',
    description: 'Regal, mystic, commanding undead queen voice',
    aliases: ['vexana', 'vex', 'queen']
  },
  gusion: {
    id: 'gusion',
    name: 'Gusion',
    title: 'Holy Blade',
    role: 'Assassin',
    emoji: '🗡️',
    lang: 'en-AU',
    description: 'Sharp, confident blade assassin voice',
    aliases: ['gusion', 'gus']
  },
  alucard: {
    id: 'alucard',
    name: 'Alucard',
    title: 'Demon Hunter',
    role: 'Fighter',
    emoji: '⚔️',
    lang: 'en-GB',
    description: 'Deep, heroic demon hunter voice',
    aliases: ['alucard', 'alu']
  },
  chou: {
    id: 'chou',
    name: 'Chou',
    title: 'Kung Fu Boy',
    role: 'Fighter',
    emoji: '🥋',
    lang: 'en-US',
    description: 'Energetic, spirited martial artist voice',
    aliases: ['chou']
  },
  zilong: {
    id: 'zilong',
    name: 'Zilong',
    title: 'Son of the Dragon',
    role: 'Fighter',
    emoji: '🐉',
    lang: 'en-US',
    description: 'Fearless, noble warrior dragon spear voice',
    aliases: ['zilong']
  },
  tigreal: {
    id: 'tigreal',
    name: 'Tigreal',
    title: 'Warrior of Dawn',
    role: 'Tank',
    emoji: '🛡️',
    lang: 'en-GB',
    description: 'Commanding, gallant knight voice',
    aliases: ['tigreal', 'tig']
  },
  yuzhong: {
    id: 'yuzhong',
    name: 'Yu Zhong',
    title: 'Black Dragon',
    role: 'Fighter',
    emoji: '🐲',
    lang: 'en-GB',
    description: 'Deep, imposing draconic overlord voice',
    aliases: ['yuzhong', 'yu-zhong', 'yz']
  },
  martis: {
    id: 'martis',
    name: 'Martis',
    title: 'Ashura King',
    role: 'Fighter',
    emoji: '👑',
    lang: 'en-US',
    description: 'Thunderous, wrathful conqueror voice',
    aliases: ['martis']
  },
  layla: {
    id: 'layla',
    name: 'Layla',
    title: 'Malefic Gunner',
    role: 'Marksman',
    emoji: '🔫',
    lang: 'en-AU',
    description: 'Bright, cheerful heroine voice',
    aliases: ['layla']
  },
  miya: {
    id: 'miya',
    name: 'Miya',
    title: 'Moonlight Archer',
    role: 'Marksman',
    emoji: '🏹',
    lang: 'en-GB',
    description: 'Graceful, serene elven archer voice',
    aliases: ['miya']
  },
  nana: {
    id: 'nana',
    name: 'Nana',
    title: 'Sweet Leonin',
    role: 'Mage',
    emoji: '🐱',
    lang: 'ja',
    description: 'Cute, playful sweet anime voice',
    aliases: ['nana']
  },
  kagura: {
    id: 'kagura',
    name: 'Kagura',
    title: 'Onmyouji Master',
    role: 'Mage',
    emoji: '🌸',
    lang: 'ja',
    description: 'Gentle, mystical umbrella magic voice',
    aliases: ['kagura']
  },
  hayabusa: {
    id: 'hayabusa',
    name: 'Hayabusa',
    title: 'Shadow of Iga',
    role: 'Assassin',
    emoji: '🥷',
    lang: 'ja',
    description: 'Stealth, focused ninja assassin voice',
    aliases: ['hayabusa', 'haya']
  },
  lancelot: {
    id: 'lancelot',
    name: 'Lancelot',
    title: 'Blade of Roses',
    role: 'Assassin',
    emoji: '🌹',
    lang: 'fr',
    description: 'Dramatic, romantic fencing hero voice',
    aliases: ['lancelot', 'lance']
  },
  gatotkaca: {
    id: 'gatotkaca',
    name: 'Gatotkaca',
    title: 'Iron Bone',
    role: 'Tank',
    emoji: '⚡',
    lang: 'id',
    description: 'Booming, legendary iron bone warrior voice',
    aliases: ['gatotkaca', 'gatot']
  },
  johnson: {
    id: 'johnson',
    name: 'Johnson',
    title: 'Automaton',
    role: 'Tank',
    emoji: '🚗',
    lang: 'en-US',
    description: 'Heavy, mechanized driver voice',
    aliases: ['johnson', 'js']
  },
  franco: {
    id: 'franco',
    name: 'Franco',
    title: 'Frozen Warrior',
    role: 'Tank',
    emoji: '⚓',
    lang: 'en-AU',
    description: 'Burly, hearty viking hooker voice',
    aliases: ['franco']
  },
  ling: {
    id: 'ling',
    name: 'Ling',
    title: 'Cyan Finch',
    role: 'Assassin',
    emoji: '🪶',
    lang: 'en-US',
    description: 'Agile, graceful wall-walker finch voice',
    aliases: ['ling']
  },
  fanny: {
    id: 'fanny',
    name: 'Fanny',
    title: 'Blade Dancer',
    role: 'Assassin',
    emoji: '🕊️',
    lang: 'en-GB',
    description: 'Disciplined, swift airborne scout voice',
    aliases: ['fanny']
  }
};

// Combined dictionary (Anime voices prioritized)
const ALL_VOICES = { ...ANIME_VOICES, ...MLBB_VOICES };

/**
 * Pick a random anime character voice
 * @returns {object}
 */
function getRandomAnimeVoice() {
  const animeList = Object.values(ANIME_VOICES);
  const randomIndex = Math.floor(Math.random() * animeList.length);
  return animeList[randomIndex];
}

/**
 * Find character voice by name or alias
 * @param {string} input 
 * @returns {object|null}
 */
function resolveHero(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return null;

  if (clean === 'random' || clean === 'rand') {
    return getRandomAnimeVoice();
  }

  // Check anime voices first
  for (const char of Object.values(ANIME_VOICES)) {
    if (char.id === clean || char.aliases.some(a => a.replace(/[^a-z0-9]/g, '') === clean)) {
      return char;
    }
  }

  // Check MLBB heroes
  for (const hero of Object.values(MLBB_VOICES)) {
    if (hero.id === clean || hero.aliases.some(a => a.replace(/[^a-z0-9]/g, '') === clean)) {
      return hero;
    }
  }

  return null;
}

const resolveAnime = resolveHero;
const resolveCharacter = resolveHero;

/**
 * Split long text into speakable chunks (max 180 chars per request)
 * Uses natural sentence and clause boundaries for ultra-smooth speech flow.
 * @param {string} text 
 * @param {number} maxChunkLen
 * @returns {string[]}
 */
function splitTextIntoChunks(text, maxChunkLen = 180) {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChunkLen) return [clean];

  // First split along sentence / punctuation boundaries (. ! ? \n)
  const sentences = clean.split(/(?<=[.!?\n])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= maxChunkLen) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current.trim()) chunks.push(current.trim());

      // If a single sentence exceeds maxChunkLen, split by commas or clauses
      if (sentence.length > maxChunkLen) {
        const clauses = sentence.split(/(?<=[,;:])\s+/);
        let subCurrent = '';
        for (const clause of clauses) {
          if ((subCurrent + ' ' + clause).trim().length <= maxChunkLen) {
            subCurrent = subCurrent ? `${subCurrent} ${clause}` : clause;
          } else {
            if (subCurrent.trim()) chunks.push(subCurrent.trim());

            // If even a clause exceeds maxChunkLen, split by individual words
            if (clause.length > maxChunkLen) {
              const words = clause.split(/\s+/);
              let wordCurrent = '';
              for (const word of words) {
                if ((wordCurrent + ' ' + word).trim().length <= maxChunkLen) {
                  wordCurrent = wordCurrent ? `${wordCurrent} ${word}` : word;
                } else {
                  if (wordCurrent.trim()) chunks.push(wordCurrent.trim());
                  wordCurrent = word;
                }
              }
              subCurrent = wordCurrent;
            } else {
              subCurrent = clause;
            }
          }
        }
        current = subCurrent;
      } else {
        current = sentence;
      }
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Generate Voice Audio Buffer
 * Concatenates MP3 audio frames smoothly in memory with zero external CPU load.
 * @param {string} voiceKey 
 * @param {string} rawText 
 * @returns {Promise<{ buffer: Buffer, hero: object, text: string }>}
 */
async function generateHeroTTS(voiceKey, rawText) {
  const character = resolveHero(voiceKey) || ANIME_VOICES.goku;
  const cleanText = (rawText || '').trim();

  if (!cleanText) {
    throw new Error('No text provided to speak! Usage: `.tts <character> <message>` or `.tts go <message>`');
  }

  // Split into manageable chunks (max 180 chars per request)
  const chunks = splitTextIntoChunks(cleanText, 180);
  if (chunks.length === 0) {
    throw new Error('Text is empty after formatting.');
  }

  // Fetch all chunks in parallel for fast, low-latency synthesis without server strain
  const downloadChunk = async (chunk) => {
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${character.lang}&q=${encoded}`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    if (response.data && response.data.length > 0) {
      return Buffer.from(response.data);
    }
    return null;
  };

  const results = await Promise.all(chunks.map(chunk => downloadChunk(chunk)));
  const audioBuffers = results.filter(b => b && b.length > 0);

  if (audioBuffers.length === 0) {
    throw new Error('Failed to generate audio stream.');
  }

  // Smoothly concatenate MP3 audio frames in memory
  const finalBuffer = Buffer.concat(audioBuffers);
  return {
    buffer: finalBuffer,
    hero: character,
    character,
    text: cleanText
  };
}

const generateAnimeTTS = generateHeroTTS;

/**
 * Get formatted anime catalog box for .tts list
 */
function getHeroCatalog() {
  const lines = [
    '🎙️ *ANIME VOICE TTS (TEXT-TO-SPEECH)*',
    'Speak in iconic anime voices by typing: `.tts <character> <message>` or `.tt`',
    '',
    '💥 *POPULAR ANIME VOICES:*',
    '• `go` / `goku` - Son Goku (Super Saiyan)',
    '• `gojo` - Satoru Gojo (The Honored One)',
    '• `sukuna` - Ryomen Sukuna (King of Curses)',
    '• `naruto` - Naruto Uzumaki (Hokage)',
    '• `sasuke` - Sasuke Uchiha (Avenger)',
    '• `luffy` - Monkey D. Luffy (Straw Hat)',
    '• `zoro` - Roronoa Zoro (Swordsman)',
    '• `levi` - Levi Ackerman (Captain)',
    '• `eren` - Eren Yeager (Attack Titan)',
    '• `makima` - Makima (Control Devil)',
    '• `saitama` - Saitama (One Punch Man)',
    '• `madara` - Madara Uchiha (Ghost of Uchiha)',
    '• `itachi` - Itachi Uchiha (Sharingan)',
    '• `tanjiro` - Tanjiro Kamado (Demon Slayer)',
    '• `nezuko` - Nezuko Kamado (Demon Sister)',
    '• `dio` - Dio Brando (Vampire Overlord)',
    '• `allmight` - All Might (Symbol of Peace)',
    '• `deku` - Izuku Midoriya (Deku)',
    '• `light` - Light Yagami (Kira)',
    '• `l` - L Lawliet (Master Detective)',
    '',
    '🎲 *RANDOM ANIME VOICE:*',
    '• `.tts random <message>` (Picks a random anime voice)',
    '',
    '🎮 *MOBILE LEGENDS VOICES:*',
    '• `vale`, `valir`, `vexana`, `gusion`, `alucard`, `chou`, `layla`...',
    '',
    '⚙️ *ADMIN CONTROLS:*',
    '• `.tts on` - Enable TTS in this group (Admins/Owner)',
    '• `.tts off` - Disable TTS in this group (Admins/Owner)'
  ];

  return atlasBox('ANIME VOICE CATALOG', lines.join('\n'));
}

const getAnimeCatalog = getHeroCatalog;

module.exports = {
  ANIME_VOICES,
  MLBB_VOICES,
  HERO_VOICES: ALL_VOICES,
  ALL_VOICES,
  getRandomAnimeVoice,
  resolveHero,
  resolveAnime,
  resolveCharacter,
  splitTextIntoChunks,
  generateHeroTTS,
  generateAnimeTTS,
  getHeroCatalog,
  getAnimeCatalog
};
