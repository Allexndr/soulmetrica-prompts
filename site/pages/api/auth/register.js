'use strict';

var { z } = require('zod');
var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

var schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(10).max(128),
  name: z.string().min(1).max(80).optional()
});

var weak = ['123456', 'password', 'qwerty', 'admin', 'password123'];

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
    var rl = await sec.rateLimit('auth:register:' + ip, 8, 3600);
    if (!rl.ok) {
      sec.json(res, 429, { ok: false, error: 'Слишком много попыток. Попробуй позже.' });
      return;
    }

    var body = schema.parse(await sec.readJson(req));
    var lower = body.password.toLowerCase();
    if (weak.some(function (w) { return lower.indexOf(w) !== -1; })) {
      sec.json(res, 400, { ok: false, error: 'Слишком простой пароль' });
      return;
    }

    var db = getDb();
    var { data: existing } = await db.from('users').select('id').eq('email', body.email.toLowerCase()).maybeSingle();
    if (existing) {
      sec.json(res, 409, { ok: false, error: 'Email уже зарегистрирован' });
      return;
    }

    var passwordHash = await auth.hashPassword(body.password);
    var { data: user, error } = await db
      .from('users')
      .insert({
        email: body.email.toLowerCase(),
        password_hash: passwordHash,
        display_name: body.name || null
      })
      .select('id, email, display_name, telegram_id, telegram_username, created_at')
      .single();
    if (error) throw new Error(error.message);

    var token = await auth.createSession(user.id);
    auth.setSessionCookie(res, token);
    sec.json(res, 200, { ok: true, user: user });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Проверь email и пароль (мин. 10 символов)' });
      return;
    }
    console.error('[auth/register]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка регистрации' });
  }
}

module.exports = handler;
module.exports.default = handler;
