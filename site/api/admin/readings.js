'use strict';

var admin = require('../../lib/admin');
var readings = require('../../lib/readings');
var sec = require('../../lib/security');
var { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
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
      var status = url.searchParams.get('status');
      var q = db
        .from('readings')
        .select('id, order_id, user_id, product_key, title, status, created_at, updated_at, telegram_delivered_at, error_message')
        .order('created_at', { ascending: false })
        .limit(100);
      if (status) q = q.eq('status', status);
      var { data, error } = await q;
      if (error) throw new Error(error.message);
      sec.json(res, 200, { ok: true, readings: data || [] });
      return;
    }

    if (req.method === 'POST') {
      var body = await sec.readJson(req);
      var action = String(body.action || '');
      var id = String(body.id || '');
      if (!id) {
        sec.json(res, 400, { ok: false, error: 'id обязателен' });
        return;
      }

      if (action === 'requeue') {
        await db
          .from('readings')
          .update({
            status: 'queued',
            error_message: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        readings.triggerProcess();
        await admin.audit(actor.id, 'reading.requeue', 'reading', id, {}, ip);
        sec.json(res, 200, { ok: true });
        return;
      }

      if (action === 'deliver') {
        var reading = await readings.getReading(id);
        if (!reading) {
          sec.json(res, 404, { ok: false, error: 'Не найден' });
          return;
        }
        var order = await require('../../lib/orders').getOrder(reading.order_id);
        // allow re-deliver by clearing delivered flag
        await db
          .from('readings')
          .update({ telegram_delivered_at: null, updated_at: new Date().toISOString() })
          .eq('id', id);
        reading.telegram_delivered_at = null;
        await readings.deliverToTelegram(reading, order || {});
        await admin.audit(actor.id, 'reading.deliver', 'reading', id, {}, ip);
        sec.json(res, 200, { ok: true });
        return;
      }

      sec.json(res, 400, { ok: false, error: 'Неизвестное действие' });
      return;
    }

    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[admin/readings]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка readings' });
  }
};
