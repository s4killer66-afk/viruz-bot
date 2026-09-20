/**
 * Atlas-MD Utility Functions
 */

// Country to Flag emoji dictionary
const COUNTRY_FLAGS = {
  indonesia: '🇮🇩 Indonesia',
  philippines: '🇵🇭 Philippines',
  malaysia: '🇲🇾 Malaysia',
  singapore: '🇸🇬 Singapore',
  thailand: '🇹🇭 Thailand',
  vietnam: '🇻🇳 Vietnam',
  brazil: '🇧🇷 Brazil',
  unitedstates: '🇺🇸 United States',
  usa: '🇺🇸 United States',
  russia: '🇷🇺 Russia',
  turkey: '🇹🇷 Turkey',
  india: '🇮🇳 India',
  pakistan: '🇵🇰 Pakistan',
  bangladesh: '🇧🇩 Bangladesh',
  japan: '🇯🇵 Japan',
  southkorea: '🇰🇷 South Korea',
  korea: '🇰🇷 South Korea',
  mexico: '🇲🇽 Mexico',
  germany: '🇩🇪 Germany',
  france: '🇫🇷 France',
  unitedkingdom: '🇬🇧 United Kingdom',
  uk: '🇬🇧 United Kingdom',
  egypt: '🇪🇬 Egypt',
  saudiarabia: '🇸🇦 Saudi Arabia',
  uae: '🇦🇪 United Arab Emirates',
  global: '🌐 Global / International',
};

/**
 * Get country with flag emoji
 * @param {string} countryName 
 * @returns {string}
 */
function getCountryWithFlag(countryName) {
  if (!countryName) return '🌐 Global Server';
  const clean = countryName.toLowerCase().replace(/[^a-z]/g, '');
  if (COUNTRY_FLAGS[clean]) return COUNTRY_FLAGS[clean];
  
  // Partial search
  for (const [key, value] of Object.entries(COUNTRY_FLAGS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return value;
    }
  }
  return `🏳️ ${countryName}`;
}

/**
 * Format active status with tick or cross mark
 * @param {boolean} isAvailableOrActive 
 * @param {string} activeText 
 * @param {string} inactiveText 
 * @returns {string}
 */
function formatStatus(isAvailableOrActive, activeText = 'Active / Available', inactiveText = 'Not Available / Unsubscribed') {
  return isAvailableOrActive ? `✅ ${activeText}` : `❌ ${inactiveText}`;
}

/**
 * VIRUZ signature fancy box wrapper
 * @param {string} title 
 * @param {string} body 
 * @param {string} footer 
 * @returns {string}
 */
function atlasBox(title, body, footer = 'VIRUZ • WHATSAPP BOT') {
  return `╭───『 *${title.toUpperCase()}* 』───╮\n${body}\n╰───『 *${footer}* 』───╯`;
}

/**
 * Format seconds to readable duration
 * @param {number} seconds 
 * @returns {string}
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
}

module.exports = {
  getCountryWithFlag,
  formatStatus,
  atlasBox,
  viruzBox: atlasBox,
  formatUptime,
};
