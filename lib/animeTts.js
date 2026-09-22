const axios = require('axios');

const CHARACTERS = {
  goku: {
    id: 'goku',
    name: 'Son Goku',
    anime: 'Dragon Ball',
    speaker: 29,
    aliases: ['goku', 'dbz', 'dragonball', 'kakarot', 'saiyan'],
    googleLang: 'ja',
    desc: 'Energetic Saiyan Warrior'
  },
  gojo: {
    id: 'gojo',
    name: 'Gojo Satoru',
    anime: 'Jujutsu Kaisen',
    speaker: 11,
    aliases: ['gojo', 'satoru'],
    googleLang: 'ja',
    desc: 'The Honored One'
  },
  sukuna: {
    id: 'sukuna',
    name: 'Ryomen Sukuna',
    anime: 'Jujutsu Kaisen',
    speaker: 13,
    aliases: ['sukuna', 'sakuna', 'kingofcurses'],
    googleLang: 'ja',
    desc: 'King of Curses'
  },
  makima: {
    id: 'makima',
    name: 'Makima',
    anime: 'Chainsaw Man',
    speaker: 20,
    aliases: ['makima', 'control'],
    googleLang: 'ja',
    desc: 'Control Devil'
  },
  eren: {
    id: 'eren',
    name: 'Eren Yeager',
    anime: 'Attack on Titan',
    speaker: 21,
    aliases: ['eren', 'yeager', 'erenyeager', 'titan'],
    googleLang: 'ja',
    desc: 'Attack Titan'
  },
  naruto: {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    anime: 'Naruto',
    speaker: 1,
    aliases: ['naruto', 'uzumaki', 'hokage'],
    googleLang: 'ja',
    desc: 'Seventh Hokage'
  },
  vegeta: {
    id: 'vegeta',
    name: 'Vegeta',
    anime: 'Dragon Ball',
    speaker: 13,
    aliases: ['vegeta', 'prince'],
    googleLang: 'ja',
    desc: 'Prince of all Saiyans'
  },
  levi: {
    id: 'levi',
    name: 'Levi Ackerman',
    anime: 'Attack on Titan',
    speaker: 11,
    aliases: ['levi', 'ackerman', 'captain'],
    googleLang: 'ja',
    desc: "Humanity's Strongest Soldier"
  }
};

function resolveCharacter(query) {
  if (!query || typeof query !== 'string') return null;
  const q = query.trim().toLowerCase();
  for (const [key, char] of Object.entries(CHARACTERS)) {
    if (key === q || (char.aliases && char.aliases.includes(q))) {
      return char;
    }
  }
  return null;
}

async function fetchGoogleTts(text, lang = 'ja') {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`;
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 5000
  });
  return Buffer.from(res.data);
}

async function fetchVoicevox(speaker, text) {
  const url = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text.slice(0, 200))}&speaker=${speaker}`;
  const initRes = await axios.get(url, { timeout: 6000 });
  if (!initRes.data || !initRes.data.success) {
    throw new Error(initRes.data?.errorMessage || 'Voicevox synthesis error');
  }

  const { audioStatusUrl, mp3DownloadUrl } = initRes.data;
  for (let i = 0; i < 8; i++) {
    const statusRes = await axios.get(audioStatusUrl, { timeout: 4000 });
    if (statusRes.data?.isAudioReady) {
      const audioRes = await axios.get(mp3DownloadUrl, { responseType: 'arraybuffer', timeout: 8000 });
      return Buffer.from(audioRes.data);
    }
    if (statusRes.data?.isAudioError) {
      throw new Error('Voicevox processing failed');
    }
    await new Promise(r => setTimeout(r, 600));
  }
  throw new Error('Voicevox synthesis timed out');
}

async function generateAnimeTts(characterInput, text) {
  const char = resolveCharacter(characterInput) || CHARACTERS.goku;
  const cleanText = (text || '').trim();
  if (!cleanText) {
    throw new Error('Text to speak cannot be empty');
  }

  // Primary: Voicevox Engine
  try {
    const buffer = await fetchVoicevox(char.speaker, cleanText);
    return {
      buffer,
      character: char,
      engine: 'voicevox'
    };
  } catch (err) {
    // Fallback: Google TTS (zero downtime)
    console.warn(`[AnimeTTS] Voicevox failed for ${char.name} (${err.message}), falling back to Google TTS`);
    const buffer = await fetchGoogleTts(cleanText, char.googleLang || 'ja');
    return {
      buffer,
      character: char,
      engine: 'google-tts'
    };
  }
}

module.exports = {
  CHARACTERS,
  resolveCharacter,
  generateAnimeTts
};
