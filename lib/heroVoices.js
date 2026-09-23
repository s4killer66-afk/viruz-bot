/**
 * VIRUZ Anime & Multilingual Voice TTS Engine
 * Converts text into voice audio in the distinct voice styles of iconic Anime characters
 * as well as authentic multilingual voices (Sara: Urdu / Hindi / English with Pakistani/Indian accent).
 * Zero CPU/RAM strain on HYEHOST.
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { atlasBox } = require('./utils');

const ANIME_VOICES = {
  sara: {
    id: 'sara',
    name: 'Sara',
    title: 'Urdu, Hindi & English Girl',
    anime: 'Pakistani / Indian Voice',
    emoji: '🧕',
    isSpecialEngine: true,
    engineType: 'sara',
    intro: '',
    description: 'Sweet, natural girl voice fluent in Urdu, Hindi & English with Pakistani/Indian accent',
    aliases: ['sara', 'sarah', 'urdu', 'hindi', 'pakistani']
  },
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
 * Pick a random character voice (Anime characters)
 * @returns {object}
 */
function getRandomAnimeVoice() {
  const animeList = Object.values(ANIME_VOICES).filter(c => c.id !== 'sara');
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

  // Check all voices
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
 * Split long text into speakable chunks (max 180 chars per request)
 * @param {string} text 
 * @param {number} maxChunkLen
 * @returns {string[]}
 */
function splitTextIntoChunks(text, maxChunkLen = 180) {
  const clean = (text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxChunkLen) return [clean];

  const sentences = clean.split(/(?<=[.!?\n۔،])\s+/);
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
 * Multilingual South Asian Voice Engine for Sara
 * Speaks fluent Urdu (Nastaliq & Roman), Hindi, and English with authentic Pakistani/Indian accent.
 * Response time <300ms, zero server load.
 * @param {string} rawText
 * @returns {Promise<Buffer>}
 */
async function generateSaraTTS(rawText) {
  const clean = (rawText || '').trim();
  if (!clean) throw new Error('No text provided for Sara to speak!');

  // Detect script and language
  const isUrduScript = /[\u0600-\u06FF]/.test(clean);
  const isHindiScript = /[\u0900-\u097F]/.test(clean);
  const romanUrduHindiRegex = /\b(kya|kaise|kese|haal|ap|aap|hum|tum|bhai|yar|yaar|theek|thik|shukriya|acha|achha|accha|bohot|bahut|hoga|hogi|hoge|mera|meri|mere|tera|teri|tere|karo|karna|kar|raha|rahe|rahi|hai|hain|hoon|hun|nahi|nhi|mat|bolo|batao|sun|suno|kuch|kyun|kyu|kab|kahan|kidhar|waise|zara|shabash|khush|dil|jaan|salam|assalam|shukran|alhamdulillah|mashallah|namaste|kripya|dhanyawad)\b/i;

  let targetLang = 'en-IN'; // Default to Indian / Pakistani accented English
  if (isUrduScript) {
    targetLang = 'ur';
  } else if (isHindiScript) {
    targetLang = 'hi';
  } else if (romanUrduHindiRegex.test(clean)) {
    targetLang = 'ur';
  }

  // Split into manageable chunks if long
  const chunks = splitTextIntoChunks(clean, 180);
  const downloadChunk = async (chunk) => {
    const encoded = encodeURIComponent(chunk);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${targetLang}&q=${encoded}`;
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    return res.data && res.data.length > 0 ? Buffer.from(res.data) : null;
  };

  const results = await Promise.all(chunks.map(chunk => downloadChunk(chunk)));
  const buffers = results.filter(b => b && b.length > 0);
  if (buffers.length === 0) {
    throw new Error('Failed to generate audio from Sara voice engine.');
  }
  return Buffer.concat(buffers);
}

/**
 * Generate Voicevox Anime Voice Synthesis (v1 Stable Multi-Speaker Endpoint)
 * Offloads synthesis entirely to high-speed cloud cluster with zero host CPU/RAM usage.
 * @param {number} speaker
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateVoicevoxTTS(speaker = 12, text) {
  // Sanitize text: strip zero-width characters and control codes
  const cleanText = text.replace(/[\u0000-\u001F\u200B-\u200D\uFEFF]/g, ' ').trim();
  const url = `https://api.tts.quest/v1/voicevox/?text=${encodeURIComponent(cleanText)}&speaker=${speaker}`;
  const initRes = await axios.get(url, {
    timeout: 10000,
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
      timeout: 9000,
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
  await new Promise(r => setTimeout(r, 300));

  // Poll status up to 36 times with 350ms intervals (~12.6s wait max)
  for (let i = 0; i < 36; i++) {
    try {
      const statusRes = await axios.get(audioStatusUrl, {
        timeout: 4000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (statusRes.data?.isAudioReady) {
        // Attempt download, with brief retry if CDN is warming up
        for (let d = 0; d < 2; d++) {
          try {
            const audioRes = await axios.get(mp3DownloadUrl, {
              responseType: 'arraybuffer',
              timeout: 9000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });

            if (audioRes.data && audioRes.data.length > 500) {
              return Buffer.from(audioRes.data);
            }
          } catch (dErr) {
            if (d === 0) await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      if (statusRes.data?.isAudioError) {
        throw new Error('Voicevox audio synthesis reported error');
      }
    } catch (pollErr) {
      if (pollErr.message.includes('reported error')) throw pollErr;
    }
    await new Promise(r => setTimeout(r, 350));
  }

  throw new Error('Voicevox anime synthesis timed out waiting for audio.');
}

/**
 * Generate Voicevox TTS with multi-attempt retry on transient network glitch
 * @param {number} speaker
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
async function generateVoicevoxTTSWithRetry(speaker = 12, text) {
  let lastErr = null;
  const backoffs = [0, 800, 1500]; // 3 attempts total

  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) {
      await new Promise(r => setTimeout(r, backoffs[attempt]));
    }
    try {
      return await generateVoicevoxTTS(speaker, text);
    } catch (err) {
      lastErr = err;
      console.warn(`[Voicevox] Attempt ${attempt + 1}/${backoffs.length} failed (${err.message}), retrying...`);
    }
  }

  throw lastErr || new Error('Voicevox synthesis failed after multiple attempts');
}

/**
 * Generate Voice Audio Buffer
 * Supports both Sara (Urdu/Hindi/English) and authentic Anime characters (Voicevox).
 * Zero external CPU/RAM load on host.
 * @param {string} voiceKey 
 * @param {string} rawText 
 * @returns {Promise<{ buffer: Buffer, hero: object, character: object, text: string, engine: string }>}
 */
async function generateHeroTTS(voiceKey, rawText) {
  const character = resolveHero(voiceKey) || ANIME_VOICES.goku;
  const cleanText = (rawText || '').trim();

  if (!cleanText) {
    throw new Error(`No text provided to speak! Usage: \`.${character.id} <message>\` or \`.tts ${character.id} <message>\``);
  }

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

  let finalBuffer = null;

  // 1. If Sara, use the specialized multilingual Urdu/Hindi/English engine
  if (character.id === 'sara' || character.engineType === 'sara') {
    finalBuffer = await generateSaraTTS(cleanText);
  } else {
    // 2. Otherwise, use authentic Voicevox Studio Anime Engine
    const speechText = character.intro ? `${character.intro} ${cleanText}` : cleanText;
    const speakerId = character.speaker || 12;
    const chunks = splitTextIntoChunks(speechText, 200);

    if (chunks.length <= 1) {
      finalBuffer = await generateVoicevoxTTSWithRetry(speakerId, speechText);
    } else {
      const parts = [];
      for (const part of chunks) {
        const buf = await generateVoicevoxTTSWithRetry(speakerId, part);
        parts.push(buf);
        await new Promise(r => setTimeout(r, 400)); // prevent 429 rate limit between chunks
      }
      finalBuffer = Buffer.concat(parts);
    }
  }

  if (!finalBuffer || finalBuffer.length === 0) {
    throw new Error('Failed to synthesize voice audio.');
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
    engine: character.id === 'sara' ? 'sara_multilingual' : 'voicevox'
  };
}

const generateAnimeTTS = generateHeroTTS;

/**
 * Get formatted anime catalog box for .tts list
 */
function getHeroCatalog() {
  const lines = [
    '🎙️ *VIRUZ MULTILINGUAL & ANIME VOICE TTS*',
    'Speak in authentic multilingual & anime voices:',
    'Direct Commands: `.sara <msg>`, `.goku <msg>`, `.gojo <msg>`',
    'Standard Format: `.tts <character> <message>`',
    '',
    '🌸 *MULTILINGUAL VOICE (URDU / HINDI / ENGLISH):*',
    '• `.sara <message>` - Sara (Urdu 🇵🇰 / Hindi 🇮🇳 / English Girl 🧕)',
    '  _Aliases:_ `.tts sara`, `.tts urdu`, `.tts hindi`',
    '',
    '💥 *ICONIC ANIME CHARACTERS (VOICEVOX):*',
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

  return atlasBox('ANIME & MULTILINGUAL VOICE CATALOG', lines.join('\n'));
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
  generateSaraTTS,
  getAizenAuthenticBuffer,
  getHeroCatalog,
  getAnimeCatalog
};
