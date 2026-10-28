'use strict';

var { z } = require('zod');
var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

var schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(128)
});

async function handler(req, res) {
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
    var ip = sec.clientIp(req);
    var rl = await sec.rateLimit('auth:login:' + ip, 12, 900);
    if (!rl.ok) {
      sec.json(res, 429, { ok: false, error: 'Слишком много попыток. Подожди 15 минут.' });
      return;
    }

    var body = schema.parse(await sec.readJson(req));
    var db = getDb();
    var { data: user } = await db
      .from('users')
      .select('id, email, password_hash, display_name, telegram_id, telegram_username, created_at')
      .eq('email', body.email.toLowerCase())
      .maybeSingle();

    if (!user || !user.password_hash) {
      sec.json(res, 401, { ok: false, error: 'Неверный email или пароль' });
      return;
    }

    var ok = await auth.verifyPassword(user.password_hash, body.password);
    if (!ok) {
      sec.json(res, 401, { ok: false, error: 'Неверный email или пароль' });
      return;
    }

    delete user.password_hash;
    var token = await auth.createSession(user.id);
    auth.setSessionCookie(res, token);
    sec.json(res, 200, { ok: true, user: user });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные' });
      return;
    }
    console.error('[auth/login]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка входа' });
  }
}

module.exports = handler;
module.exports.default = handler;
