'use strict';

var admin = require('../../lib/admin');
var orders = require('../../lib/orders');
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
      var id = url.searchParams.get('id');
      var status = url.searchParams.get('status');
      if (id) {
        var { data: one } = await db.from('orders').select('*').eq('id', id).maybeSingle();
        if (!one) {
          sec.json(res, 404, { ok: false, error: 'Не найден' });
          return;
        }
        var { data: list } = await db
          .from('readings')
          .select('id, product_key, title, status, created_at, updated_at, telegram_delivered_at, error_message')
          .eq('order_id', id)
          .order('created_at', { ascending: true });
        sec.json(res, 200, { ok: true, order: one, readings: list || [] });
        return;
      }
      var q = db
        .from('orders')
        .select('id, user_id, product, amount, status, customer_name, phone, contact, telegram_chat_id, created_at, paid_at')
        .order('created_at', { ascending: false })
        .limit(120);
      if (status) q = q.eq('status', status);
      var { data, error } = await q;
      if (error) throw new Error(error.message);
      sec.json(res, 200, { ok: true, orders: data || [] });
      return;
    }

    if (req.method === 'PATCH') {
      var body = await sec.readJson(req);
      var orderId = String(body.id || url.searchParams.get('id') || '');
      if (!orderId) {
        sec.json(res, 400, { ok: false, error: 'id обязателен' });
        return;
      }
      var patch = admin.patchOrderSchema.parse(body);
      var action = String(body.action || '');

      if (action === 'mark_paid') {
        var paid = await orders.markOrderPaid(orderId);
        await readings.startOrderPipeline(orderId);
        await admin.audit(actor.id, 'order.mark_paid', 'order', orderId, {}, ip);
        sec.json(res, 200, { ok: true, order: paid });
        return;
      }
      if (action === 'requeue') {
        await readings.startOrderPipeline(orderId);
        await admin.audit(actor.id, 'order.requeue', 'order', orderId, {}, ip);
        sec.json(res, 200, { ok: true });
        return;
      }

      var upd = { updated_at: new Date().toISOString() };
      Object.keys(patch).forEach(function (k) {
        if (patch[k] !== undefined) upd[k] = patch[k];
      });
      if (upd.status === 'paid' && !upd.paid_at) upd.paid_at = new Date().toISOString();

      var { data: updated, error: updErr } = await db
        .from('orders')
        .update(upd)
        .eq('id', orderId)
        .select('*')
        .single();
      if (updErr) throw new Error(updErr.message);
      await admin.audit(actor.id, 'order.patch', 'order', orderId, { fields: Object.keys(patch) }, ip);
      sec.json(res, 200, { ok: true, order: updated });
      return;
    }

    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные' });
      return;
    }
    console.error('[admin/orders]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка orders' });
  }
};
