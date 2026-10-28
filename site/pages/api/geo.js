'use strict';

/**
 * Geo for currency: Vercel/Cloudflare country headers + fallback.
 * RU → RUB, KZ (default) → KZT
 */
function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  var h = req.headers || {};
  var country = (
    h['x-vercel-ip-country'] ||
    h['cf-ipcountry'] ||
    h['x-country-code'] ||
    ''
  )
    .toString()
    .trim()
    .toUpperCase();

  if (country === 'XX' || country === 'T1') country = '';

  var currency = 'KZT';
  if (country === 'RU') currency = 'RUB';
  else if (country === 'KZ') currency = 'KZT';
  else if (
    country === 'UZ' ||
    country === 'KG' ||
    country === 'TJ' ||
    country === 'TM' ||
    country === 'AZ' ||
    country === 'AM' ||
    country === 'BY'
  ) {
    currency = 'KZT';
  } else if (country) {
    currency = 'USD';
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.end(
    JSON.stringify({
      ok: true,
      country: country || null,
      currency: currency,
      source: country ? 'ip' : 'default'
    })
  );
}

module.exports = handler;
module.exports.default = handler;
