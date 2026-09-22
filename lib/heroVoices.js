/**
 * VIRUZ Anime Voice TTS Engine
 * Converts text into voice audio in the distinct voice styles of iconic Anime characters.
 * Powered by authentic Voicevox studio anime voice models + resilient multi-style fallback.
 * Generates valid MP3 audio buffers in memory with zero external CPU/RAM strain on HYEHOST.
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { atlasBox } = require('./utils');

const ANIME_VOICES = {
  aizen: {
    id: 'aizen',
    name: 'Sosuke Aizen',
    title: 'Mastermind',
    anime: 'Bleach',
    emoji: '🦋',
    speaker: 13, // Voicevox Aoyama Ryusei (Deep, calm mastermind)
    intro: 'いつから鏡花水月を使っていないと錯覚していた？',
    fallbackLang: 'ja',
    fallbackSpeed: 0.8,
    description: 'Calm, sinister, calculating mastermind voice',
    aliases: ['aizen', 'ai', 'sosuke']
  },
  goku: {
    id: 'goku',
    name: 'Son Goku',
    title: 'Super Saiyan',
    anime: 'Dragon Ball Z',
    emoji: '💥',
    speaker: 12, // Voicevox Kotaro (Energetic, fiery shonen warrior)
    intro: 'オッス！オラ悟空！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.0,
    description: 'Energetic, legendary Saiyan warrior voice',
    aliases: ['goku', 'go', 'songoku', 'kakarot', 'saiyan']
  },
  gojo: {
    id: 'gojo',
    name: 'Satoru Gojo',
    title: 'The Honored One',
    anime: 'Jujutsu Kaisen',
    emoji: '🤞',
    speaker: 11, // Voicevox Kurono Takehiro (Cool, smooth sorcerer)
    intro: '大丈夫、僕最強だから。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.9,
    description: 'Smooth, confident, playful sorcerer voice',
    aliases: ['gojo', 'satoru']
  },
  sukuna: {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    title: 'King of Curses',
    anime: 'Jujutsu Kaisen',
    emoji: '🩸',
    speaker: 13, // Voicevox Aoyama Ryusei (DEEP, menacing, arrogant curse king)
    intro: '分を弁えろ、痴れ者が。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.24, // Slow, deep, ominous cadence
    description: 'Deep, menacing, arrogant King of Curses voice',
    aliases: ['sukuna', 'ryomen', 'curse']
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    title: 'Seventh Hokage',
    anime: 'Naruto',
    emoji: '🍥',
    speaker: 12,
    intro: 'だってばよ！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.0,
    description: 'Determined, fiery ninja hero voice (Dattebayo!)',
    aliases: ['naruto', 'naru', 'uzumaki', 'hokage']
  },
  sasuke: {
    id: 'sasuke',
    name: 'Sasuke Uchiha',
    title: 'Avenger of the Uchiha',
    anime: 'Naruto',
    emoji: '⚡',
    speaker: 11,
    intro: 'うずまきナルト…',
    fallbackLang: 'ja',
    fallbackSpeed: 0.85,
    description: 'Calm, cool, sharp shadow ninja voice',
    aliases: ['sasuke', 'saske']
  },
  luffy: {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    title: 'King of the Pirates',
    anime: 'One Piece',
    emoji: '👒',
    speaker: 12,
    intro: '海賊王に俺はなる！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.05,
    description: 'High-energy, fearless pirate captain voice',
    aliases: ['luffy', 'luf', 'strawhat']
  },
  zoro: {
    id: 'zoro',
    name: 'Roronoa Zoro',
    title: 'King of Hell Swordsman',
    anime: 'One Piece',
    emoji: '⚔️',
    speaker: 13,
    intro: '背中の傷は剣士の恥だ。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.35,
    description: 'Deep, stoic, tough swordsman voice',
    aliases: ['zoro', 'roronoa', 'marimo']
  },
  levi: {
    id: 'levi',
    name: 'Levi Ackerman',
    title: "Humanity's Strongest",
    anime: 'Attack on Titan',
    emoji: '🗡️',
    speaker: 11,
    intro: 'おい、ガキ共…',
    fallbackLang: 'en-GB',
    fallbackSpeed: 0.9,
    description: 'Cold, sharp, disciplined captain voice',
    aliases: ['levi', 'ackerman', 'captain']
  },
  eren: {
    id: 'eren',
    name: 'Eren Yeager',
    title: 'Attack Titan',
    anime: 'Attack on Titan',
    emoji: '🦅',
    speaker: 21, // Voicevox Kenzaki Mesuo (Relentless warrior)
    intro: '戦え、戦え！',
    fallbackLang: 'ja',
    fallbackSpeed: 0.95,
    description: 'Intense, relentless freedom fighter voice (Tatakae!)',
    aliases: ['eren', 'yeager', 'tatakae']
  },
  makima: {
    id: 'makima',
    name: 'Makima',
    title: 'Control Devil',
    anime: 'Chainsaw Man',
    emoji: '🐕',
    speaker: 2, // Voicevox Shikoku Metan sweet
    intro: '私の言うことを聞いて…',
    fallbackLang: 'fr',
    fallbackSpeed: 0.85,
    description: 'Gentle, chilling, hypnotic controlling voice',
    aliases: ['makima', 'control']
  },
  saitama: {
    id: 'saitama',
    name: 'Saitama',
    title: 'One Punch Man',
    anime: 'One Punch Man',
    emoji: '🥊',
    speaker: 11,
    intro: '趣味でヒーローをやってる者だ。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.9,
    description: 'Nonchalant, casual, invincible hero voice',
    aliases: ['saitama', 'onepunch', 'bald']
  },
  madara: {
    id: 'madara',
    name: 'Madara Uchiha',
    title: 'Ghost of the Uchiha',
    anime: 'Naruto',
    emoji: '🔥',
    speaker: 13,
    intro: 'お前も踊るか？',
    fallbackLang: 'ja',
    fallbackSpeed: 0.25,
    description: 'Imposing, thunderous legendary warrior voice',
    aliases: ['madara']
  },
  itachi: {
    id: 'itachi',
    name: 'Itachi Uchiha',
    title: 'Sharingan Prodigy',
    anime: 'Naruto',
    emoji: '👁️',
    speaker: 11,
    intro: '許せサスケ、これで最後だ。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.8,
    description: 'Calm, wise, melancholic older brother voice',
    aliases: ['itachi']
  },
  tanjiro: {
    id: 'tanjiro',
    name: 'Tanjiro Kamado',
    title: 'Sun Breathing Slayer',
    anime: 'Demon Slayer',
    emoji: '🌊',
    speaker: 21,
    intro: '全集中！水の呼吸！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.0,
    description: 'Warm, earnest, compassionate fighter voice',
    aliases: ['tanjiro', 'kamado']
  },
  nezuko: {
    id: 'nezuko',
    name: 'Nezuko Kamado',
    title: 'Demon Sister',
    anime: 'Demon Slayer',
    emoji: '🎀',
    speaker: 3, // Voicevox Zundamon (High-pitched cute fairy/mascot)
    intro: 'ムームー！',
    fallbackLang: 'zh-TW',
    fallbackSpeed: 1.0,
    description: 'Soft, cute, high-pitched demon sister voice',
    aliases: ['nezuko']
  },
  dio: {
    id: 'dio',
    name: 'Dio Brando',
    title: 'Vampire Overlord',
    anime: "JoJo's Bizarre Adventure",
    emoji: '⏳',
    speaker: 13,
    intro: '無駄無駄無駄！ザ・ワールド！',
    fallbackLang: 'it',
    fallbackSpeed: 0.3,
    description: 'Theatrical, wicked, triumphant vampire voice (Za Warudo!)',
    aliases: ['dio', 'brando', 'zawarudo']
  },
  allmight: {
    id: 'allmight',
    name: 'All Might',
    title: 'Symbol of Peace',
    anime: 'My Hero Academia',
    emoji: '💪',
    speaker: 13,
    intro: '私が来た！',
    fallbackLang: 'de',
    fallbackSpeed: 0.4,
    description: 'Booming, heroic, proud champion voice',
    aliases: ['allmight', 'almight', 'toshinori']
  },
  deku: {
    id: 'deku',
    name: 'Izuku Midoriya',
    title: 'Deku',
    anime: 'My Hero Academia',
    emoji: '🥦',
    speaker: 12,
    intro: '君を助ける！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.0,
    description: 'Passionate, heartfelt, determined young hero voice',
    aliases: ['deku', 'midoriya', 'izuku']
  },
  tsumugi: {
    id: 'tsumugi',
    name: 'Kasukabe Tsumugi',
    title: 'Energetic Gal',
    anime: 'Anime High School',
    emoji: '⭐',
    speaker: 8, // Voicevox Kasukabe Tsumugi (Bright bubbly schoolgirl)
    intro: 'やっほー！つむぎだよ！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.1,
    description: 'Hyper-energetic, bright anime girl voice',
    aliases: ['tsumugi', 'kasukabe']
  },
  himari: {
    id: 'himari',
    name: 'Meimei Himari',
    title: 'Tsundere Princess',
    anime: 'Anime Fantasy',
    emoji: '✨',
    speaker: 14, // Voicevox Meimei Himari (Tsundere girl)
    intro: 'べ、別にアンタのためじゃないんだからね！',
    fallbackLang: 'ja',
    fallbackSpeed: 1.05,
    description: 'Playful, cute tsundere anime girl voice',
    aliases: ['himari', 'meimei', 'tsun']
  },
  zundamon: {
    id: 'zundamon',
    name: 'Zundamon',
    title: 'Anime Fairy',
    anime: 'VOICEVOX Legend',
    emoji: '🧚',
    speaker: 3,
    intro: 'ずんだもんなのだ！',
    fallbackLang: 'zh-TW',
    fallbackSpeed: 1.0,
    description: 'Iconic high-pitched cute anime fairy mascot voice',
    aliases: ['zundamon', 'zunda']
  },
  metan: {
    id: 'metan',
    name: 'Shikoku Metan',
    title: 'Ojou-sama',
    anime: 'VOICEVOX Legend',
    emoji: '👑',
    speaker: 1, // Voicevox Shikoku Metan normal
    intro: 'ごきげんよう、めたんですわ。',
    fallbackLang: 'ja',
    fallbackSpeed: 0.9,
    description: 'Elegant, refined anime lady voice',
    aliases: ['metan', 'shikoku']
  }
};

const ALL_VOICES = ANIME_VOICES;

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

  // Check anime voices
  for (const char of Object.values(ANIME_VOICES)) {
    if (char.id === clean || char.aliases.some(a => a.replace(/[^a-z0-9]/g, '') === clean)) {
      return char;
    }
  }

  return null;
}

const resolveAnime = resolveHero;
const resolveCharacter = resolveHero;

/**
 * Split long text into speakable chunks (max 160 chars per request)
 * @param {string} text 
 * @param {number} maxChunkLen
 * @returns {string[]}
 */
function splitTextIntoChunks(text, maxChunkLen = 160) {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChunkLen) return [clean];

  const sentences = clean.split(/(?<=[.!?\n])\s+/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= maxChunkLen) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current.trim()) chunks.push(current.trim());

      if (sentence.length > maxChunkLen) {
        const words = sentence.split(/\s+/);
        let wordCurrent = '';
        for (const word of words) {
          if ((wordCurrent + ' ' + word).trim().length <= maxChunkLen) {
            wordCurrent = wordCurrent ? `${wordCurrent} ${word}` : word;
          } else {
            if (wordCurrent.trim()) chunks.push(wordCurrent.trim());
            wordCurrent = word;
          }
        }
        current = wordCurrent;
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

// In-memory LRU cache for instant responses (up to 50 items)
const ttsCache = new Map();
const MAX_CACHE_SIZE = 50;

/**
 * Generate Voicevox Anime Voice Synthesis (v1 Stable Multi-Speaker Endpoint)
 * Offloads synthesis entirely to high-speed cloud cluster with zero host CPU/RAM usage.
 * @param {number} speaker
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateVoicevoxTTS(speaker = 12, text) {
  const url = `https://api.tts.quest/v1/voicevox/?text=${encodeURIComponent(text)}&speaker=${speaker}`;
  const initRes = await axios.get(url, {
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!initRes.data || !initRes.data.success) {
    throw new Error(initRes.data?.errorMessage || 'Voicevox initialization failed');
  }

  const { audioStatusUrl, mp3DownloadUrl } = initRes.data;
  if (!audioStatusUrl || !mp3DownloadUrl) {
    throw new Error('Invalid Voicevox audio endpoints returned');
  }

  // Poll status up to 14 times (each 650ms -> ~9s wait max)
  for (let i = 0; i < 14; i++) {
    await new Promise(r => setTimeout(r, 650));
    try {
      const statusRes = await axios.get(audioStatusUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (statusRes.data?.isAudioReady) {
        const audioRes = await axios.get(mp3DownloadUrl, {
          responseType: 'arraybuffer',
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (audioRes.data && audioRes.data.length > 500) {
          return Buffer.from(audioRes.data);
        }
      }

      if (statusRes.data?.isAudioError) {
        throw new Error('Voicevox audio synthesis reported error');
      }
    } catch (pollErr) {
      if (pollErr.message.includes('reported error')) throw pollErr;
    }
  }

  throw new Error('Voicevox synthesis timed out waiting for audio readiness');
}

/**
 * Multi-profile fallback synthesizer using distinct accents and speeds
 */
async function generateGoogleFallbackTTS(lang = 'ja', text, speed = 1.0) {
  const chunks = splitTextIntoChunks(text, 180);
  const downloadChunk = async (chunk) => {
    const encoded = encodeURIComponent(chunk);
    const speedParam = speed ? `&ttsspeed=${speed}` : '';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}${speedParam}&q=${encoded}`;
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 7000
    });
    return res.data && res.data.length > 0 ? Buffer.from(res.data) : null;
  };

  const results = await Promise.all(chunks.map(chunk => downloadChunk(chunk)));
  const buffers = results.filter(b => b && b.length > 0);
  if (buffers.length === 0) {
    throw new Error('Failed to generate audio from fallback engine');
  }
  return Buffer.concat(buffers);
}

/**
 * Generate Voice Audio Buffer
 * Dual-engine: Real Anime Voicevox Engine primary + Lightweight Distinct Fallback secondary.
 * Concatenates MP3 audio frames smoothly in memory with zero external CPU load.
 * @param {string} voiceKey 
 * @param {string} rawText 
 * @returns {Promise<{ buffer: Buffer, hero: object, character: object, text: string, engine: string }>}
 */
async function generateHeroTTS(voiceKey, rawText) {
  const character = resolveHero(voiceKey) || ANIME_VOICES.goku;
  const cleanText = (rawText || '').trim();

  if (!cleanText) {
    throw new Error('No text provided to speak! Usage: `.tts <character> <message>` or `.tts go <message>`');
  }

  // Prepend character's signature anime quote so it authentically sounds like the anime character
  const speechText = character.intro ? `${character.intro} ${cleanText}` : cleanText;

  // Check in-memory cache
  const cacheKey = `${character.id}:${cleanText.toLowerCase()}`;
  if (ttsCache.has(cacheKey)) {
    return {
      buffer: ttsCache.get(cacheKey),
      hero: character,
      character,
      text: cleanText,
      engine: 'cached'
    };
  }

  let finalBuffer = null;
  let usedEngine = 'voicevox';

  // 1. Try Genuine Anime Voicevox Engine first
  try {
    const speakerId = character.speaker || 12;
    const chunks = splitTextIntoChunks(speechText, 150);
    if (chunks.length <= 1) {
      finalBuffer = await generateVoicevoxTTS(speakerId, speechText);
    } else {
      const parts = [];
      for (const part of chunks) {
        const buf = await generateVoicevoxTTS(speakerId, part);
        parts.push(buf);
      }
      finalBuffer = Buffer.concat(parts);
    }
  } catch (vvErr) {
    console.warn(`[TTS Engine] Voicevox synthesis failed (${vvErr.message}), using character-specific fallback...`);
    usedEngine = 'fallback_styled';
    finalBuffer = await generateGoogleFallbackTTS(character.fallbackLang || 'ja', speechText, character.fallbackSpeed || 1.0);
  }

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error('Failed to synthesize audio output from all engines.');
  }

  // Store in cache (LRU eviction)
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = ttsCache.keys().next().value;
    ttsCache.delete(oldestKey);
  }
  ttsCache.set(cacheKey, finalBuffer);

  return {
    buffer: finalBuffer,
    hero: character,
    character,
    text: cleanText,
    engine: usedEngine
  };
}

const generateAnimeTTS = generateHeroTTS;

/**
 * Get formatted anime catalog box for .tts list
 */
function getHeroCatalog() {
  const lines = [
    '🎙️ *ANIME VOICE TTS (GENUINE ANIME ACTORS)*',
    'Speak in authentic Japanese anime character voices:',
    '` .tts <character> <message> ` or ` .tt <character> <message> `',
    '',
    '💥 *ICONIC ANIME CHARACTERS:*',
    '• `aizen` / `ai` - Sosuke Aizen (Mastermind 🦋)',
    '• `go` / `goku` - Son Goku (Super Saiyan 💥)',
    '• `gojo` - Satoru Gojo (The Honored One 🤞)',
    '• `sukuna` - Ryomen Sukuna (King of Curses 🩸)',
    '• `naruto` - Naruto Uzumaki (Seventh Hokage 🍥)',
    '• `sasuke` - Sasuke Uchiha (Avenger ⚡)',
    '• `luffy` - Monkey D. Luffy (Straw Hat 👒)',
    '• `zoro` - Roronoa Zoro (Swordsman ⚔️)',
    '• `levi` - Levi Ackerman (Captain 🗡️)',
    '• `eren` - Eren Yeager (Attack Titan 🦅)',
    '• `makima` - Makima (Control Devil 🐕)',
    '• `saitama` - Saitama (One Punch Man 🥊)',
    '• `madara` - Madara Uchiha (Ghost of Uchiha 🔥)',
    '• `itachi` - Itachi Uchiha (Sharingan 👁️)',
    '• `tanjiro` - Tanjiro Kamado (Demon Slayer 🌊)',
    '• `nezuko` - Nezuko Kamado (Demon Sister 🎀)',
    '• `dio` - Dio Brando (Vampire Overlord ⏳)',
    '• `allmight` - All Might (Symbol of Peace 💪)',
    '• `deku` - Izuku Midoriya (Deku 🥦)',
    '• `tsumugi` - Kasukabe Tsumugi (Energetic Girl ⭐)',
    '• `himari` - Meimei Himari (Tsundere Girl ✨)',
    '• `zundamon` - Zundamon (Cute Anime Mascot 🧚)',
    '• `metan` - Shikoku Metan (Ojou-sama 👑)',
    '',
    '🎲 *RANDOM ANIME VOICE:*',
    '• `.tts random <message>` (Speaks in a random anime voice)',
    '',
    '⚙️ *ADMIN CONTROLS:*',
    '• `.tts on` - Enable TTS in this group (Admins/Owner)',
    '• `.tts off` - Disable TTS in this group (Admins/Owner)'
  ];

  return atlasBox('ANIME VOICE CATALOG', lines.join('\n'));
}

const getAnimeCatalog = getHeroCatalog;

/**
 * Returns authentic Aizen startup audio buffer from disk
 * @returns {Buffer|null}
 */
function getAizenAuthenticBuffer() {
  const samplePath = path.join(__dirname, '../assets/voices/aizen_sample.mp3');
  if (fs.existsSync(samplePath)) {
    return fs.readFileSync(samplePath);
  }
  return null;
}

module.exports = {
  ANIME_VOICES,
  HERO_VOICES: ALL_VOICES,
  ALL_VOICES,
  getRandomAnimeVoice,
  resolveHero,
  resolveAnime,
  resolveCharacter,
  splitTextIntoChunks,
  generateHeroTTS,
  generateAnimeTTS,
  getAizenAuthenticBuffer,
  getHeroCatalog,
  getAnimeCatalog
};
