/**
 * VIRUZ Anime & Multilingual Voice TTS Engine
 * Converts text into voice audio in the distinct voice styles of iconic Anime characters
 * as well as authentic multilingual voices (Sara: Urdu / Hindi / English with Pakistani/Indian accent).
 * Zero CPU/RAM strain on HYEHOST.
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const crypto = require('crypto');
const { atlasBox } = require('./utils');

const ANIME_VOICES = {
  sara: {
    id: 'sara',
    name: 'Sara',
    title: 'Pakistani Urdu & English Girl',
    anime: 'Pakistani Urdu & English Voice',
    emoji: '🧕',
    isSpecialEngine: true,
    engineType: 'sara',
    intro: '',
    description: 'Sweet, natural human girl voice with authentic Pakistani Urdu and English pronunciation',
    aliases: ['sara', 'sarah', 'urdu', 'pakistani']
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

const WIN_EPOCH = 11644473600;
const EDGE_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

/**
 * Generate Sec-MS-GEC token for Microsoft Edge Neural TTS authentication
 */
function generateSecMsGec() {
  const unixNow = Math.floor(Date.now() / 1000);
  let ticks = unixNow + WIN_EPOCH;
  ticks -= (ticks % 300);
  const ticksBigInt = BigInt(ticks) * 10000000n;
  const strToHash = `${ticksBigInt}${EDGE_TRUSTED_TOKEN}`;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

// High-frequency Roman Urdu words mapped to authentic Urdu script
// English words remain untouched so Sara naturally pronounces English with English phonetics and Urdu with native Urdu phonetics
const ROMAN_URDU_DICTIONARY = {
  // Greetings & Spiritual
  'assalam': 'السلام',
  'assalamualaikum': 'السلام علیکم',
  'salam': 'سلام',
  'wsalam': 'وعلیکم السلام',
  'walekum': 'وعلیکم',
  'walaikum': 'وعلیکم',
  'alhamdulillah': 'الحمدللہ',
  'mashallah': 'ماشاءاللہ',
  'mashaallah': 'ماشاءاللہ',
  'inshallah': 'انشاءاللہ',
  'subhanallah': 'سبحان اللہ',
  'jazakallah': 'جزاک اللہ',
  'shukriya': 'شکریہ',
  'shukria': 'شکریہ',
  'khudahafiz': 'خدا حافظ',
  'hafiz': 'حافظ',
  'allah': 'اللہ',

  // Pronouns & Demonstratives
  'aap': 'آپ',
  'ap': 'آپ',
  'hum': 'ہم',
  'ham': 'ہم',
  'tum': 'تم',
  'main': 'میں',
  'mai': 'میں',
  'mein': 'میں',
  'mujhe': 'مجھے',
  'mjhe': 'مجھے',
  'tujhe': 'تجھے',
  'mera': 'میرا',
  'meri': 'میری',
  'mere': 'میرے',
  'tera': 'تیرا',
  'teri': 'تیری',
  'tere': 'تیرے',
  'apka': 'آپ کا',
  'apki': 'آپ کی',
  'apke': 'آپ کے',
  'aapka': 'آپ کا',
  'aapki': 'آپ کی',
  'aapke': 'آپ کے',
  'hamara': 'ہمارا',
  'hamari': 'ہماری',
  'hamare': 'ہمارے',
  'woh': 'وہ',
  'wo': 'وہ',
  'ye': 'یہ',
  'yeh': 'یہ',
  'unka': 'ان کا',
  'unki': 'ان کی',
  'unke': 'ان کے',
  'inka': 'ان کا',
  'inke': 'ان کے',
  'inki': 'ان کی',

  // Questions
  'kya': 'کیا',
  'kyu': 'کیوں',
  'kyun': 'کیوں',
  'kaise': 'کیسے',
  'kese': 'کیسے',
  'kaisi': 'کیسی',
  'kesi': 'کیسی',
  'kaisa': 'کیسا',
  'kesa': 'کیسا',
  'kab': 'کب',
  'kahan': 'کہاں',
  'kidhar': 'کدھر',
  'kitna': 'کتنا',
  'kitni': 'کتنی',
  'kitne': 'کتنے',
  'kaun': 'کون',
  'kon': 'کون',
  'kis': 'کس',
  'kisko': 'کس کو',

  // Verbs & Tenses
  'hai': 'ہے',
  'hain': 'ہیں',
  'hn': 'ہیں',
  'hoon': 'ہوں',
  'hun': 'ہوں',
  'ho': 'ہو',
  'tha': 'تھا',
  'thi': 'تھی',
  'the': 'تھے',
  'hoga': 'ہوگا',
  'hogi': 'ہوگی',
  'hoge': 'ہوگے',
  'honge': 'ہوں گے',
  'karo': 'کرو',
  'karein': 'کریں',
  'kare': 'کرے',
  'karna': 'کرنا',
  'karni': 'کرنی',
  'kar': 'کر',
  'raha': 'رہا',
  'rahi': 'رہی',
  'rahe': 'رہے',
  'bol': 'بول',
  'bolo': 'بولو',
  'bole': 'بولے',
  'bolna': 'بولنا',
  'batao': 'بتاؤ',
  'bata': 'بتا',
  'bataien': 'بتائیں',
  'sun': 'سن',
  'suno': 'سنو',
  'sunna': 'سننا',
  'aao': 'آؤ',
  'aana': 'آنا',
  'aaye': 'آئے',
  'aayi': 'آئی',
  'gaya': 'گیا',
  'gayi': 'گئی',
  'gaye': 'گئے',
  'jao': 'جاؤ',
  'ja': 'جا',
  'jana': 'جانا',
  'dekho': 'دیکھو',
  'dekh': 'دیکھ',
  'dekhna': 'دیکھنا',
  'samjhe': 'سمجھے',
  'samjho': 'سمجھو',

  // Adjectives, Particles & Nouns
  'theek': 'ٹھیک',
  'thik': 'ٹھیک',
  'acha': 'اچھا',
  'achha': 'اچھا',
  'accha': 'اچھا',
  'achi': 'اچھی',
  'achhi': 'اچھی',
  'ache': 'اچھے',
  'achhe': 'اچھے',
  'bura': 'برا',
  'bohot': 'بہت',
  'bahut': 'بہت',
  'bht': 'بہت',
  'bhot': 'بہت',
  'nahi': 'نہیں',
  'nhi': 'نہیں',
  'nahin': 'نہیں',
  'na': 'نہ',
  'mat': 'مت',
  'aur': 'اور',
  'bhi': 'بھی',
  'toh': 'تو',
  'ka': 'کا',
  'ki': 'کی',
  'ke': 'کے',
  'ko': 'کو',
  'se': 'سے',
  'par': 'پر',
  'pe': 'پہ',
  'tak': 'تک',
  'liye': 'لیے',
  'keliye': 'کے لیے',
  'sab': 'سب',
  'sabhi': 'سبھی',
  'kuch': 'کچھ',
  'koi': 'کوئی',
  'kisi': 'کسی',
  'sirf': 'صرف',
  'zara': 'ذرا',
  'waise': 'ویسے',
  'shabash': 'شاباش',
  'khush': 'خوش',
  'dil': 'دل',
  'jaan': 'جان',
  'haal': 'حال',
  'bhai': 'بھائی',
  'bhaiyo': 'بھائیو',
  'yaar': 'یار',
  'yar': 'یار',
  'dost': 'دوست',
  'dosto': 'دوستو',
  'log': 'لوگ',
  'logo': 'لوگوں',
  'umeed': 'امید',
  'baat': 'بات',
  'baatein': 'باتیں',
  'kam': 'کام',
  'kaam': 'کام',
  'waqt': 'وقت',
  'ghar': 'گھر'
};

/**
 * Smart Text Processor for Sara
 * Preserves Urdu script intact.
 * Replaces known Roman Urdu words with genuine Urdu script.
 * Leaves English words intact so both Urdu and English are pronounced with natural human cadence.
 */
function prepareTextForSara(input) {
  const clean = (input || '').trim();
  if (!clean) return '';

  // If text already has Urdu characters, preserve as-is
  if (/[\u0600-\u06FF]/.test(clean)) {
    return clean;
  }

  // Tokenize words and punctuation
  const tokens = clean.split(/([a-zA-Z0-9_]+|[^\s\w]+|\s+)/).filter(Boolean);

  const mapped = tokens.map(token => {
    const lower = token.toLowerCase();
    if (ROMAN_URDU_DICTIONARY[lower]) {
      return ROMAN_URDU_DICTIONARY[lower];
    }
    return token;
  });

  return mapped.join('');
}

/**
 * Synthesize a single text chunk using Microsoft Edge Neural Voice (ur-PK-UzmaNeural)
 * Employs sliding inactivity timeout so long voice notes stream without stalling
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
function synthesizeEdgeNeuralUrduChunk(text) {
  return new Promise((resolve, reject) => {
    const reqId = crypto.randomUUID().replace(/-/g, '');
    const connId = crypto.randomUUID().replace(/-/g, '');
    const secMsGec = generateSecMsGec();

    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TRUSTED_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      handshakeTimeout: 10000
    });

    const audioChunks = [];
    let inactivityTimer = null;
    let safetyTimer = null;

    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // Wait up to 10s between incoming audio packets
      inactivityTimer = setTimeout(() => {
        try { ws.close(); } catch (e) {}
        reject(new Error('Edge Neural TTS stream stalled'));
      }, 10000);
    };

    // Overall chunk ceiling: 35s max per chunk
    safetyTimer = setTimeout(() => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      try { ws.close(); } catch (e) {}
      reject(new Error('Edge Neural TTS chunk processing timed out'));
    }, 35000);

    const cleanup = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
    };

    ws.on('open', () => {
      resetInactivity();
      ws.send('Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}');

      const cleanXml = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ur-PK"><voice name="ur-PK-UzmaNeural"><prosody pitch="+0Hz" rate="+0%" volume="+0%">${cleanXml}</prosody></voice></speak>`;
      const req = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\nX-Timestamp:${new Date().toISOString()}\r\n\r\n${ssml}`;
      ws.send(req);
    });

    ws.on('message', (data, isBinary) => {
      resetInactivity();
      if (isBinary) {
        const buf = Buffer.from(data);
        if (buf.length > 2) {
          const headerLen = buf.readUInt16BE(0);
          const header = buf.slice(2, 2 + headerLen).toString('utf8');
          if (header.includes('Path:audio')) {
            audioChunks.push(buf.slice(2 + headerLen));
          }
        }
      } else {
        const textMsg = data.toString();
        if (textMsg.includes('Path:turn.end')) {
          cleanup();
          try { ws.close(); } catch (e) {}
          const finalAudio = Buffer.concat(audioChunks);
          if (finalAudio.length > 500) {
            resolve(finalAudio);
          } else {
            reject(new Error('Empty audio received from Edge TTS'));
          }
        }
      }
    });

    ws.on('error', (err) => {
      cleanup();
      try { ws.close(); } catch (e) {}
      reject(err);
    });
  });
}

/**
 * Authentic Pakistani Human Voice for Sara (Urdu & English)
 * Natural girl voice fluent in both Urdu and English with native Pakistani pronunciation.
 * Automatically handles long voice notes by splitting into sentence chunks and concatenating streams.
 * @param {string} rawText
 * @returns {Promise<Buffer>}
 */
async function generateSaraTTS(rawText) {
  const clean = (rawText || '').trim();
  if (!clean) throw new Error('No text provided for Sara to speak! Usage: `.sara <message>`');

  // Cap extremely huge spam texts at 1500 chars to avoid memory exhaustion
  const safeText = clean.length > 1500 ? clean.slice(0, 1500) : clean;
  const processed = prepareTextForSara(safeText);

  // Split into chunks of max 350 chars (sentence boundaries) for large voice notes
  const chunks = splitTextIntoChunks(processed, 350);

  // 1. Primary Engine: Microsoft Edge Neural (ur-PK-UzmaNeural)
  try {
    const audioParts = [];
    for (let i = 0; i < chunks.length; i++) {
      const part = await synthesizeEdgeNeuralUrduChunk(chunks[i]);
      audioParts.push(part);
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 100)); // slight breath pause
      }
    }
    return Buffer.concat(audioParts);
  } catch (err) {
    console.warn(`[Sara Edge TTS] Neural engine failed (${err.message}), trying backup engine...`);
  }

  // 2. Fallback Engine: Google Translate Urdu endpoint
  try {
    const fallbackChunks = splitTextIntoChunks(processed, 180);
    const audioParts = [];
    for (const chunk of fallbackChunks) {
      const encoded = encodeURIComponent(chunk);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ur&q=${encoded}`;
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 9000
      });
      if (res.data && res.data.length > 500) {
        audioParts.push(Buffer.from(res.data));
      }
    }
    if (audioParts.length > 0) {
      return Buffer.concat(audioParts);
    }
  } catch (backupErr) {
    console.error('[Sara Fallback] Backup engine failed:', backupErr.message);
  }

  throw new Error('Failed to synthesize Sara voice. Please try a shorter message.');
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

  // Poll status up to 48 times with 350ms intervals (~16.8s wait max for long voice notes)
  for (let i = 0; i < 48; i++) {
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
    // Cap at 600 chars to avoid rate limits on public Voicevox cluster
    const safeText = cleanText.length > 600 ? cleanText.slice(0, 600) : cleanText;
    const speechText = character.intro ? `${character.intro} ${safeText}` : safeText;
    const speakerId = character.speaker || 12;
    const chunks = splitTextIntoChunks(speechText, 250);

    if (chunks.length <= 1) {
      finalBuffer = await generateVoicevoxTTSWithRetry(speakerId, speechText);
    } else {
      const parts = [];
      for (const part of chunks) {
        const buf = await generateVoicevoxTTSWithRetry(speakerId, part);
        parts.push(buf);
        await new Promise(r => setTimeout(r, 600)); // prevent 429 rate limit between chunks
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
    engine: character.id === 'sara' ? 'sara_pakistani_urdu' : 'voicevox'
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
    '🌸 *PAKISTANI URDU & ENGLISH VOICE (HUMAN GIRL):*',
    '• `.sara <message>` - Sara (Authentic Pakistani Urdu & English Girl 🧕)',
    '  _Aliases:_ `.tts sara`, `.tts urdu`, `.urdu <msg>`',
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
