'use strict';

var crypto = require('crypto');
var auth = require('../../lib/auth');
var sec = require('../../lib/security');
var identity = require('../../lib/identity');
var { getDb } = require('../../lib/db');

function verifyTelegramAuth(data, botToken) {
  var check = Object.assign({}, data);
  var hash = check.hash;
  delete check.hash;
  var pairs = Object.keys(check)
    .sort()
    .map(function (k) {
      return k + '=' + check[k];
    });
  var secret = crypto.createHash('sha256').update(botToken).digest();
  var hmac = crypto.createHmac('sha256', secret).update(pairs.join('\n')).digest('hex');
  if (!sec.timingSafeEqual(hmac, hash)) return false;
  var authDate = +check.auth_date;
  if (!authDate || Date.now() / 1000 - authDate > 86400) return false;
  return true;
}

module.exports = async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      sec.json(res, 503, { ok: false, error: 'Telegram не настроен' });
      return;
    }

    var body = await sec.readJson(req);
    if (!verifyTelegramAuth(body, token)) {
      sec.json(res, 401, { ok: false, error: 'Неверная подпись Telegram' });
      return;
    }

    var tgId = +body.id;
    var db = getDb();
    var { data: existing } = await db.from('users').select('*').eq('telegram_id', tgId).maybeSingle();

    var sessionUser = await auth.getSessionUser(req);
    var user = existing;

    if (sessionUser) {
      if (existing && existing.id !== sessionUser.id) {
        sec.json(res, 409, { ok: false, error: 'Этот Telegram уже привязан к другому аккаунту' });
        return;
      }
      if (!existing) {
        var { data: linked, error } = await db
          .from('users')
          .update({
            telegram_id: tgId,
            telegram_username: body.username || null,
            display_name:
              sessionUser.display_name ||
              [body.first_name, body.last_name].filter(Boolean).join(' '),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionUser.id)
          .select('id, email, display_name, telegram_id, telegram_username, created_at')
          .single();
        if (error) throw new Error(error.message);
        user = linked;
      } else {
        var token2 = await auth.createSession(existing.id);
        auth.setSessionCookie(res, token2);
        user = {
          id: existing.id,
          email: existing.email,
          display_name: existing.display_name,
          telegram_id: existing.telegram_id,
          telegram_username: existing.telegram_username,
          created_at: existing.created_at
        };
      }
    } else if (!existing) {
      var { data: created, error: createErr } = await db
        .from('users')
        .insert({
          telegram_id: tgId,
          telegram_username: body.username || null,
          display_name: [body.first_name, body.last_name].filter(Boolean).join(' ') || null
        })
        .select('id, email, display_name, telegram_id, telegram_username, created_at')
        .single();
      if (createErr) throw new Error(createErr.message);
      user = created;
      var sessionToken = await auth.createSession(user.id);
      auth.setSessionCookie(res, sessionToken);
    } else {
      var loginToken = await auth.createSession(existing.id);
      auth.setSessionCookie(res, loginToken);
      user = {
        id: existing.id,
        email: existing.email,
        display_name: existing.display_name,
        telegram_id: existing.telegram_id,
        telegram_username: existing.telegram_username,
        created_at: existing.created_at
      };
    }

    await identity.claimTelegramOrders(user.id, tgId, null);
    await identity.claimTelegramOrders(user.id, tgId, tgId);

    sec.json(res, 200, { ok: true, user: user });
  } catch (err) {
    console.error('[auth/telegram]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка входа через Telegram' });
  }
};
