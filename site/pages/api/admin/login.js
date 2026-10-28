'use strict';

var { z } = require('zod');
var auth = require('../../../lib/auth');
var admin = require('../../../lib/admin');
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
    var rl = await sec.rateLimit('admin:login:' + ip, 6, 900);
    if (!rl.ok) {
      sec.json(res, 429, { ok: false, error: 'Слишком много попыток. Подожди 15 минут.' });
      return;
    }

    var body = schema.parse(await sec.readJson(req));
    var db = getDb();
    var { data: user } = await db
      .from('users')
      .select('id, email, password_hash, display_name, role, is_blocked, telegram_id, telegram_username, phone, created_at')
      .eq('email', body.email.toLowerCase())
      .maybeSingle();

    if (!user || !user.password_hash || user.role !== 'admin' || user.is_blocked) {
      await admin.audit(null, 'admin.login_fail', 'user', body.email.toLowerCase(), {}, ip);
      sec.json(res, 401, { ok: false, error: 'Неверный email или пароль' });
      return;
    }

    var ok = await auth.verifyPassword(user.password_hash, body.password);
    if (!ok) {
      await admin.audit(user.id, 'admin.login_fail', 'user', user.id, {}, ip);
      sec.json(res, 401, { ok: false, error: 'Неверный email или пароль' });
      return;
    }

    var token = await auth.createSession(user.id);
    auth.setSessionCookie(res, token);
    await admin.audit(user.id, 'admin.login_ok', 'user', user.id, {}, ip);
    sec.json(res, 200, { ok: true, user: admin.publicUser(user) });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные' });
      return;
    }
    console.error('[admin/login]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка входа' });
  }
}

module.exports = handler;
module.exports.default = handler;
