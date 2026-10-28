'use strict';

var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

var SITE = (process.env.SITE_URL || 'https://yourveluna-theme.vercel.app').replace(/\/$/, '');

async function handler(req, res) {
  try {
    var url = new URL(req.url, 'http://localhost');
    var token = String(url.searchParams.get('t') || '').trim();
    var readingId = String(url.searchParams.get('r') || '').trim();
    if (!token || token.length < 20) {
      res.statusCode = 302;
      res.setHeader('Location', SITE + '/profile.html?err=tg');
      res.end();
      return;
    }

    var db = getDb();
    var tokenHash = sec.hashToken(token);
    var { data: session } = await db
      .from('sessions')
      .select('id, user_id, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!session || new Date(session.expires_at) < new Date()) {
      res.statusCode = 302;
      res.setHeader('Location', SITE + '/profile.html?err=tg');
      res.end();
      return;
    }

    auth.setSessionCookie(res, token);
    var dest = SITE + '/profile.html';
    if (readingId) {
      dest =
        SITE +
        '/profile.html?view=readings&reading=' +
        encodeURIComponent(readingId);
    }
    res.statusCode = 302;
    res.setHeader('Location', dest);
    res.end();
  } catch (err) {
    console.error('[auth/tg-reading]', err);
    res.statusCode = 302;
    res.setHeader('Location', SITE + '/profile.html?err=tg');
    res.end();
  }
}

module.exports = handler;
module.exports.default = handler;
