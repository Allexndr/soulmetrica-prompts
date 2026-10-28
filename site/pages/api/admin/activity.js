'use strict';

var admin = require('../../../lib/admin');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var user = await admin.requireAdmin(req, res);
    if (!user) return;
    var db = getDb();
    var url = new URL(req.url, sec.siteOrigin());
    var phone = url.searchParams.get('phone');
    var orderId = url.searchParams.get('orderId');
    var event = url.searchParams.get('event');
    var q = db
      .from('activity_log')
      .select(
        'id, created_at, event, level, order_id, reading_id, phone, contact, telegram_chat_id, ip, meta'
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (phone) q = q.ilike('phone', '%' + String(phone).replace(/\D/g, '').slice(-10) + '%');
    if (orderId) q = q.eq('order_id', orderId);
    if (event) q = q.ilike('event', '%' + event + '%');
    var { data, error } = await q;
    if (error) throw new Error(error.message);
    sec.json(res, 200, { ok: true, activity: data || [] });
  } catch (err) {
    console.error('[admin/activity]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка activity' });
  }
}

module.exports = handler;
module.exports.default = handler;
