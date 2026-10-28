'use strict';

var orders = require('../../lib/orders');
var sec = require('../../lib/security');

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
    var url = new URL(req.url, sec.siteOrigin());
    var orderId = String(url.searchParams.get('orderId') || url.searchParams.get('order') || '').trim();
    if (!orderId) {
      sec.json(res, 400, { ok: false, error: 'orderId обязателен' });
      return;
    }

    var order = await orders.getOrder(orderId);
    if (!order) {
      sec.json(res, 404, { ok: false, error: 'Заказ не найден' });
      return;
    }

    sec.json(res, 200, {
      ok: true,
      orderId: orderId,
      status: order.status,
      paid: order.status === 'paid',
      provider: order.payment_provider || null
    });
  } catch (err) {
    sec.json(res, 500, { ok: false, error: 'Ошибка проверки заказа' });
  }
}

module.exports = handler;
module.exports.default = handler;
