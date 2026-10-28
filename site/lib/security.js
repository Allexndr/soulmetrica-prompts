'use strict';

var crypto = require('crypto');
var { getDb } = require('./db');

var SITE_URL = process.env.SITE_URL || 'https://yourveluna-theme.vercel.app';

function siteOrigin() {
  try {
    return new URL(SITE_URL).origin;
  } catch (e) {
    return 'https://yourveluna-theme.vercel.app';
  }
}

function setSecurityHeaders(res, opts) {
  opts = opts || {};
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', opts.allowFrame ? 'SAMEORIGIN' : 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    opts.allowFrame
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org; frame-ancestors 'self'; frame-src 'self' https://oauth.telegram.org blob:;"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org; frame-ancestors 'self'; frame-src 'self' https://oauth.telegram.org blob:;"
  );
  res.setHeader('Permissions-Policy', 'payment=(), geolocation=()');
}

function setCors(req, res) {
  var origin = (req.headers.origin || '').toString();
  var allowed = {
    [siteOrigin()]: true,
    'https://soulmetrica.com': true,
    'https://www.soulmetrica.com': true,
    'https://yourveluna-theme.vercel.app': true,
    'http://localhost:5173': true,
    'http://localhost:3000': true
  };
  if (allowed[origin]) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

function json(res, status, body) {
  setSecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      resolve(req.body);
      return;
    }
    var chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '0.0.0.0'
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function timingSafeEqual(a, b) {
  var ba = Buffer.from(String(a));
  var bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function verifyInternalSecret(req) {
  var expected = process.env.INTERNAL_API_SECRET;
  if (!expected) return false;
  var header = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return timingSafeEqual(header, expected);
}

async function rateLimit(bucket, limit, windowSec) {
  var db = getDb();
  var now = new Date();
  var windowStart = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);

  var { data: row } = await db
    .from('rate_limits')
    .select('hits')
    .eq('bucket', bucket)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle();

  if (!row) {
    await db.from('rate_limits').insert({
      bucket: bucket,
      window_start: windowStart.toISOString(),
      hits: 1
    });
    return { ok: true, remaining: limit - 1 };
  }

  if (row.hits >= limit) {
    return { ok: false, remaining: 0 };
  }

  await db
    .from('rate_limits')
    .update({ hits: row.hits + 1 })
    .eq('bucket', bucket)
    .eq('window_start', windowStart.toISOString());

  return { ok: true, remaining: limit - row.hits - 1 };
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  siteOrigin,
  setSecurityHeaders,
  setCors,
  json,
  readJson,
  clientIp,
  hashToken,
  verifyInternalSecret,
  rateLimit,
  escapeHtml
};
