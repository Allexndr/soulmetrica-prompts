'use strict';

/**
 * One-time / guarded admin bootstrap.
 * POST + Authorization: Bearer INTERNAL_API_SECRET
 * Body: { email?, password? } — password generated if omitted.
 */

var crypto = require('crypto');
var { z } = require('zod');
var auth = require('../../lib/auth');
var admin = require('../../lib/admin');
var sec = require('../../lib/security');
var { getDb } = require('../../lib/db');

var schema = z.object({
  email: z.string().email().max(120).optional(),
  password: z.string().min(14).max(128).optional(),
  name: z.string().max(80).optional()
});

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
    if (!sec.verifyInternalSecret(req)) {
      sec.json(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }

    var ip = sec.clientIp(req);
    var rl = await sec.rateLimit('admin:bootstrap:' + ip, 5, 3600);
    if (!rl.ok) {
      sec.json(res, 429, { ok: false, error: 'Too many requests' });
      return;
    }

    var body = schema.parse(await sec.readJson(req));
    var db = getDb();
    var { data: existingAdmins } = await db.from('users').select('id').eq('role', 'admin').limit(3);
    if (existingAdmins && existingAdmins.length) {
      sec.json(res, 409, { ok: false, error: 'Админ уже существует. Используй повышение роли через INTERNAL_API_SECRET + promote.' });
      return;
    }

    var email = (body.email || 'admin@yourveluna.kz').toLowerCase();
    var password = body.password || crypto.randomBytes(18).toString('base64url');
    var passwordHash = await auth.hashPassword(password);

    var { data: user, error } = await db
      .from('users')
      .upsert(
        {
          email: email,
          password_hash: passwordHash,
          display_name: body.name || 'Super Admin',
          role: 'admin',
          is_blocked: false,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      )
      .select('id, email, display_name, role, created_at')
      .single();

    if (error) throw new Error(error.message);

    await db.from('users').update({ role: 'admin' }).eq('id', user.id);
    await admin.audit(user.id, 'admin.bootstrap', 'user', user.id, { email: email }, ip);

    sec.json(res, 200, {
      ok: true,
      user: admin.publicUser(Object.assign({}, user, { role: 'admin' })),
      credentials: {
        email: email,
        password: password,
        loginUrl: sec.siteOrigin() + '/admin.html'
      },
      note: 'Сохрани пароль сейчас — повторно он не показывается.'
    });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные' });
      return;
    }
    console.error('[admin/bootstrap]', err.message);
    sec.json(res, 500, { ok: false, error: 'Bootstrap failed' });
  }
};
