'use strict';

/**
 * Agent registration stub (Auth.md / agent_auth.register_uri).
 * Does not create live accounts — returns how to proceed via Telegram.
 */
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        register: 'POST',
        types: ['anonymous', 'telegram_login'],
        documentation: 'https://soulmetrica.com/auth.md'
      })
    );
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  var body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      var chunks = [];
      for await (var c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      return;
    }
  }

  var type = String(body.type || body.identity_type || 'anonymous');

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      ok: true,
      type: type,
      status: 'pending_human',
      message:
        'SoulMetrica agent registration requires a human Telegram identity. Open https://t.me/soulmetrica_bot or complete Telegram Login on /profile, then call GET /api/auth/me with the session cookie.',
      next: {
        bot: 'https://t.me/soulmetrica_bot',
        profile: 'https://soulmetrica.com/profile',
        claim: 'https://soulmetrica.com/api/auth/me'
      }
    })
  );
}

module.exports = handler;
module.exports.default = handler;
