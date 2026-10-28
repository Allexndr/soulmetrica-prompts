'use strict';

var admin = require('../../../lib/admin');
var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    var actor = await admin.requireAdmin(req, res);
    if (!actor) return;
    var db = getDb();
    var ip = sec.clientIp(req);
    var url = new URL(req.url, sec.siteOrigin());

    if (req.method === 'GET') {
      var q = (url.searchParams.get('q') || '').trim().slice(0, 80);
      var id = url.searchParams.get('id');
      if (id) {
        var { data: one } = await db
          .from('users')
          .select('id, email, display_name, telegram_id, telegram_username, phone, role, is_blocked, notes, created_at, updated_at')
          .eq('id', id)
          .maybeSingle();
        if (!one) {
          sec.json(res, 404, { ok: false, error: 'Не найден' });
          return;
        }
        var { data: orders } = await db
          .from('orders')
          .select('id, product, amount, status, phone, contact, created_at, paid_at')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        var { data: readings } = await db
          .from('readings')
          .select('id, order_id, title, status, created_at, telegram_delivered_at')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        sec.json(res, 200, {
          ok: true,
          user: admin.publicUser(one),
          orders: orders || [],
          readings: readings || []
        });
        return;
      }

      var query = db
        .from('users')
        .select('id, email, display_name, telegram_id, telegram_username, phone, role, is_blocked, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (q) {
        // simple search — supabase or filter
        query = query.or(
          'email.ilike.%' + q.replace(/[%:,]/g, '') + '%,' +
            'display_name.ilike.%' + q.replace(/[%:,]/g, '') + '%,' +
            'telegram_username.ilike.%' + q.replace(/[%:,]/g, '') + '%,' +
            'phone.ilike.%' + q.replace(/[%:,]/g, '') + '%'
        );
      }
      var { data: list, error } = await query;
      if (error) throw new Error(error.message);
      sec.json(res, 200, {
        ok: true,
        users: (list || []).map(admin.publicUser)
      });
      return;
    }

    if (req.method === 'PATCH') {
      var body = await sec.readJson(req);
      var userId = String(body.id || url.searchParams.get('id') || '');
      if (!userId) {
        sec.json(res, 400, { ok: false, error: 'id обязателен' });
        return;
      }
      var patch = admin.patchUserSchema.parse(body);
      if (patch.role === 'user' && userId === actor.id) {
        sec.json(res, 400, { ok: false, error: 'Нельзя снять admin с себя' });
        return;
      }
      var upd = { updated_at: new Date().toISOString() };
      Object.keys(patch).forEach(function (k) {
        if (patch[k] !== undefined) upd[k] = patch[k];
      });
      if (upd.email) upd.email = String(upd.email).toLowerCase();
      if (upd.telegram_username) {
        upd.telegram_username = String(upd.telegram_username).replace(/^@/, '').toLowerCase();
      }

      var { data: updated, error: updErr } = await db
        .from('users')
        .update(upd)
        .eq('id', userId)
        .select('id, email, display_name, telegram_id, telegram_username, phone, role, is_blocked, notes, created_at')
        .single();
      if (updErr) throw new Error(updErr.message);

      if (patch.is_blocked === true || patch.role === 'user') {
        await auth.destroyAllSessionsForUser(userId);
      }

      await admin.audit(actor.id, 'user.patch', 'user', userId, { fields: Object.keys(patch) }, ip);
      sec.json(res, 200, { ok: true, user: admin.publicUser(updated) });
      return;
    }

    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные' });
      return;
    }
    console.error('[admin/users]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка users' });
  }
}

module.exports = handler;
module.exports.default = handler;
