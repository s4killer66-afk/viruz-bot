/**
 * Integration Test for Express Web Server & API Endpoints
 */

const assert = require('assert');
const config = require('../config');

async function testServer() {
  console.log('🌐 Testing Web Server and API Endpoints...');
  const baseUrl = `http://localhost:${config.port}`;

  // 1. Test /api/status
  const statusRes = await fetch(`${baseUrl}/api/status`);
  assert.strictEqual(statusRes.status, 200, 'Status endpoint should return 200');
  const statusData = await statusRes.json();
  assert(statusData.botName === 'VIRUZ', 'Bot name should be VIRUZ');
  console.log('  ✅ GET /api/status verified.');

  // 2. Test /api/test-game for Mobile Legends
  const mlRes = await fetch(`${baseUrl}/api/test-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'ml', query: '1114917746 13486' })
  });
  assert.strictEqual(mlRes.status, 200, 'Test-game endpoint should return 200');
  const mlData = await mlRes.json();
  assert(mlData.success === true, 'Response success should be true');
  assert(mlData.formattedText.includes('Mobile Legends'), 'Formatted text should contain Mobile Legends');
  console.log('  ✅ POST /api/test-game (.ml) verified.');

  // 3. Test /api/test-game for PUBG Mobile
  const pubgRes = await fetch(`${baseUrl}/api/test-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: 'pubg', query: '5123456789' })
  });
  assert.strictEqual(pubgRes.status, 200, 'PUBG test endpoint should return 200');
  const pubgData = await pubgRes.json();
  assert(pubgData.formattedText.includes('PUBG Mobile'), 'Formatted text should contain PUBG Mobile');
  console.log('  ✅ POST /api/test-game (.pubg) verified.');

  // 4. Test Web Dashboard HTML static serving
  const pageRes = await fetch(`${baseUrl}/`);
  assert.strictEqual(pageRes.status, 200, 'Root HTML page should return 200');
  const pageHtml = await pageRes.text();
  assert(pageHtml.includes('VIRUZ'), 'HTML should contain VIRUZ title');
  assert(pageHtml.includes('Link Bot to Your WhatsApp'), 'HTML should contain pairing portal');
  console.log('  ✅ Static Webpage (index.html) serving verified.');

  console.log('\n🎉 ALL WEB SERVER INTEGRATION TESTS PASSED! 🎉\n');
  process.exit(0);
}

testServer().catch(err => {
  console.error('❌ Server test failure:', err);
  process.exit(1);
});
