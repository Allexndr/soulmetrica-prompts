'use strict';

var { z } = require('zod');
var auth = require('../../lib/auth');
var sec = require('../../lib/security');
var orders = require('../../lib/orders');

var schema = z.object({
  orderId: z.string().min(3).max(80)
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
    var user = await auth.requireUser(req, res);
    if (!user) return;

    var body = schema.parse(await sec.readJson(req));
    var order = await orders.getOrder(body.orderId);
    if (!order) {
      sec.json(res, 404, { ok: false, error: 'Заказ не найден' });
      return;
    }
    if (order.user_id && order.user_id !== user.id) {
      sec.json(res, 403, { ok: false, error: 'Заказ привязан к другому аккаунту' });
      return;
    }

    await orders.linkOrderToUser(body.orderId, user.id);
    sec.json(res, 200, { ok: true });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректный orderId' });
      return;
    }
    console.error('[orders/link]', err.message);
    sec.json(res, 500, { ok: false, error: 'Не удалось привязать заказ' });
  }
};
