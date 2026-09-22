/**
 * VIRUZ Mobile Legends Hero Voice TTS Engine
 * Converts text into voice notes in the voice style of iconic MLBB heroes.
 */

const axios = require('axios');
const { atlasBox } = require('./utils');

const HERO_VOICES = {
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
  },
  goku: {
    id: 'goku',
    name: 'Son Goku',
    title: 'Saiyan Warrior',
    role: 'Anime Special',
    emoji: '💥',
    lang: 'ja',
    description: 'Energetic, legendary Saiyan spirit',
    aliases: ['goku', 'songoku']
  },
  gojo: {
    id: 'gojo',
    name: 'Satoru Gojo',
    title: 'The Honored One',
    role: 'Anime Special',
    emoji: '🤞',
    lang: 'ja',
    description: 'Smooth, playful Jujutsu sorcerer',
    aliases: ['gojo', 'satoru']
  },
  sukuna: {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    title: 'King of Curses',
    role: 'Anime Special',
    emoji: '🩸',
    lang: 'ja',
    description: 'Menacing, arrogant King of Curses',
    aliases: ['sukuna', 'ryomen']
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    title: 'Seventh Hokage',
    role: 'Anime Special',
    emoji: '🍥',
    lang: 'ja',
    description: 'Determined, fiery ninja hero',
    aliases: ['naruto']
  },
  makima: {
    id: 'makima',
    name: 'Makima',
    title: 'Control Devil',
    role: 'Anime Special',
    emoji: '🐕',
    lang: 'ja',
    description: 'Calm, mysterious controlling voice',
    aliases: ['makima']
  },
  eren: {
    id: 'eren',
    name: 'Eren Yeager',
    title: 'Attack Titan',
    role: 'Anime Special',
    emoji: '🦅',
    lang: 'ja',
    description: 'Intense, relentless freedom fighter',
    aliases: ['eren', 'yeager']
  }
};

/**
 * Find hero by name or alias
 * @param {string} input 
 * @returns {object|null}
 */
function resolveHero(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const hero of Object.values(HERO_VOICES)) {
    if (hero.id === clean || hero.aliases.some(a => a.replace(/[^a-z0-9]/g, '') === clean)) {
      return hero;
    }
  }
  return null;
}

/**
 * Split long text into speakable chunks (max 180 chars per request)
 * @param {string} text 
 * @returns {string[]}
 */
function splitTextIntoChunks(text, maxChunkLen = 180) {
  const words = (text || '').trim().split(/\s+/);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChunkLen) {
      if (current.trim()) chunks.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Generate Hero Voice Note Audio Buffer
 * @param {string} heroKey 
 * @param {string} rawText 
 * @returns {Promise<{ buffer: Buffer, hero: object, text: string }>}
 */
async function generateHeroTTS(heroKey, rawText) {
  const hero = resolveHero(heroKey) || HERO_VOICES.vale;
  const cleanText = (rawText || '').trim();

  if (!cleanText) {
    throw new Error('No text provided to speak! Usage: `.tts <hero> <message>`');
  }

  // Split into manageable chunks
  const chunks = splitTextIntoChunks(cleanText, 180);
  if (chunks.length === 0) {
    throw new Error('Text is empty after formatting.');
  }

  const audioBuffers = [];
  for (const chunk of chunks) {
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${hero.lang}&q=${encoded}`;
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });

    if (response.data && response.data.length > 0) {
      audioBuffers.push(Buffer.from(response.data));
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Failed to generate hero audio stream.');
  }

  const finalBuffer = Buffer.concat(audioBuffers);
  return {
    buffer: finalBuffer,
    hero,
    text: cleanText
  };
}

/**
 * Get formatted hero catalog box for .tts list
 */
function getHeroCatalog() {
  const lines = [
    '🎙️ *MOBILE LEGENDS HERO VOICE TTS*',
    'Select any hero voice by typing: `.tts <hero> <message>`',
    '',
    '🌪️ *MAGE HEROES:*',
    '• `vale` - Vale (Windtalker, calm storm voice)',
    '• `valir` - Valir (Son of Flames, fiery bold voice)',
    '• `nana` - Nana (Sweet Leonin, cute anime voice)',
    '• `kagura` - Kagura (Onmyouji Master, mystical voice)',
    '',
    '⚔️ *FIGHTER HEROES:*',
    '• `alucard` - Alucard (Demon Hunter, deep heroic voice)',
    '• `chou` - Chou (Kung Fu Boy, energetic voice)',
    '• `zilong` - Zilong (Son of the Dragon, warrior voice)',
    '• `yuzhong` - Yu Zhong (Black Dragon, draconic voice)',
    '• `martis` - Martis (Ashura King, conqueror voice)',
    '',
    '🗡️ *ASSASSIN HEROES:*',
    '• `gusion` - Gusion (Holy Blade, swift assassin voice)',
    '• `hayabusa` - Hayabusa (Shadow of Iga, ninja voice)',
    '• `lancelot` - Lancelot (Blade of Roses, dramatic voice)',
    '• `ling` - Ling (Cyan Finch, agile blade voice)',
    '• `fanny` - Fanny (Blade Dancer, airborne scout voice)',
    '',
    '🏹 *MARKSMAN HEROES:*',
    '• `layla` - Layla (Malefic Gunner, cheerful heroine voice)',
    '• `miya` - Miya (Moonlight Archer, serene archer voice)',
    '',
    '🛡️ *TANK HEROES:*',
    '• `tigreal` - Tigreal (Warrior of Dawn, knight voice)',
    '• `gatotkaca` - Gatotkaca (Iron Bone, steel fist voice)',
    '• `johnson` - Johnson (Automaton, heavy driver voice)',
    '• `franco` - Franco (Frozen Warrior, viking hooker voice)',
    '',
    '💡 *Examples:*',
    '• `.tts vale The storm is approaching!`',
    '• `.tts valir Everything shall burn to ashes!`',
    '• `.tts layla We can do it! Attack the Lord!`'
  ];

  return atlasBox('MLBB HERO VOICE VOICENOTES', lines.join('\n'), 'VIRUZ • HERO TTS ENGINE');
}

module.exports = {
  HERO_VOICES,
  resolveHero,
  generateHeroTTS,
  getHeroCatalog
};
