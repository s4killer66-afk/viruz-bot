/**
 * VIRUZ Anime Voice TTS Engine
 * Converts text into voice audio in the distinct voice styles of iconic Anime characters.
 * Powered EXCLUSIVELY by authentic Voicevox studio anime voice models.
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

// In-memory LRU cache for instant responses (<5ms, up to 100 items)
const ttsCache = new Map();
const MAX_CACHE_SIZE = 100;

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
    timeout: 9000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!initRes.data || !initRes.data.success) {
    throw new Error(initRes.data?.errorMessage || 'Voicevox initialization failed');
  }

  const { audioStatusUrl, mp3DownloadUrl, isAudioReady } = initRes.data;
  if (!mp3DownloadUrl) {
    throw new Error('Invalid Voicevox audio endpoints returned');
  }

  // If already ready immediately (e.g. cached on server), fetch directly
  if (isAudioReady) {
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

  if (!audioStatusUrl) {
    throw new Error('Invalid Voicevox audio status endpoint');
  }

  // Quick initial pause before first poll
  await new Promise(r => setTimeout(r, 250));

  // Poll status up to 26 times with 300ms intervals (~8.0s wait max)
  for (let i = 0; i < 26; i++) {
    try {
      const statusRes = await axios.get(audioStatusUrl, {
        timeout: 4000,
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
    await new Promise(r => setTimeout(r, 300));
  }

  throw new Error('Voicevox anime synthesis timed out waiting for audio.');
}

/**
 * Generate Voicevox TTS with automatic single retry on transient network glitch
 * @param {number} speaker
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateVoicevoxTTSWithRetry(speaker = 12, text) {
  try {
    return await generateVoicevoxTTS(speaker, text);
  } catch (err) {
    console.warn(`[Voicevox] Initial attempt failed (${err.message}), retrying once...`);
    await new Promise(r => setTimeout(r, 400));
    return await generateVoicevoxTTS(speaker, text);
  }
}

/**
 * Generate Voice Audio Buffer
 * Authentic Voicevox Anime Engine exclusively (zero external CPU/RAM load on host).
 * Returns valid MP3 audio buffers. Never falls back to robotic woman voice.
 * @param {string} voiceKey 
 * @param {string} rawText 
 * @returns {Promise<{ buffer: Buffer, hero: object, character: object, text: string, engine: string }>}
 */
async function generateHeroTTS(voiceKey, rawText) {
  const character = resolveHero(voiceKey) || ANIME_VOICES.goku;
  const cleanText = (rawText || '').trim();

  if (!cleanText) {
    throw new Error('No text provided to speak! Usage: `.goku <message>` or `.tts <character> <message>`');
  }

  // Prepend character's signature anime quote so it authentically sounds like the anime character
  const speechText = character.intro ? `${character.intro} ${cleanText}` : cleanText;

  // Check in-memory cache for instant response (<5ms)
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

  const speakerId = character.speaker || 12;
  const chunks = splitTextIntoChunks(speechText, 150);
  let finalBuffer = null;

  if (chunks.length <= 1) {
    finalBuffer = await generateVoicevoxTTSWithRetry(speakerId, speechText);
  } else {
    const parts = [];
    for (const part of chunks) {
      const buf = await generateVoicevoxTTSWithRetry(speakerId, part);
      parts.push(buf);
    }
    finalBuffer = Buffer.concat(parts);
  }

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error('Failed to synthesize anime voice audio.');
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
    engine: 'voicevox'
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
    'Direct Commands: `.goku <msg>`, `.gojo <msg>`, `.sukuna <msg>`',
    'Standard Format: `.tts <character> <message>`',
    '',
    '💥 *ICONIC ANIME CHARACTERS:*',
    '• `.goku <message>` - Son Goku (Super Saiyan 💥)',
    '• `.gojo <message>` - Satoru Gojo (The Honored One 🤞)',
    '• `.sukuna <message>` - Ryomen Sukuna (King of Curses 🩸)',
    '• `.naruto <message>` - Naruto Uzumaki (Seventh Hokage 🍥)',
    '• `.sasuke <message>` - Sasuke Uchiha (Avenger ⚡)',
    '• `.luffy <message>` - Monkey D. Luffy (Straw Hat 👒)',
    '• `.zoro <message>` - Roronoa Zoro (Swordsman ⚔️)',
    '• `.levi <message>` - Levi Ackerman (Captain 🗡️)',
    '• `.eren <message>` - Eren Yeager (Attack Titan 🦅)',
    '• `.makima <message>` - Makima (Control Devil 🐕)',
    '• `.saitama <message>` - Saitama (One Punch Man 🥊)',
    '• `.madara <message>` - Madara Uchiha (Ghost of Uchiha 🔥)',
    '• `.itachi` - Itachi Uchiha (Sharingan 👁️)',
    '• `.tanjiro` - Tanjiro Kamado (Demon Slayer 🌊)',
    '• `.nezuko` - Nezuko Kamado (Demon Sister 🎀)',
    '• `.dio` - Dio Brando (Vampire Overlord ⏳)',
    '• `.allmight` - All Might (Symbol of Peace 💪)',
    '• `.deku` - Izuku Midoriya (Deku 🥦)',
    '• `.tsumugi` - Kasukabe Tsumugi (Energetic Girl ⭐)',
    '• `.himari` - Meimei Himari (Tsundere Girl ✨)',
    '• `.zundamon` - Zundamon (Cute Anime Mascot 🧚)',
    '• `.metan` - Shikoku Metan (Ojou-sama 👑)',
    '• `.aizen` - Sosuke Aizen (Mastermind 🦋)',
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
