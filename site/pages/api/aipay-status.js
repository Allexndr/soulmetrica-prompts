'use strict';

var aipay = require('../../lib/aipay');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var adminLib = require('../../lib/admin');
var sec = require('../../lib/security');
var { payLog, payError } = require('../../lib/pay-log');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var body = req.method === 'POST' ? await sec.readJson(req) : {};
    var url = new URL(req.url, sec.siteOrigin());
    var orderId = String(body.orderId || url.searchParams.get('orderId') || '').trim();
    if (!orderId) {
      sec.json(res, 400, { ok: false, error: 'orderId обязателен' });
      return;
    }

    var order = await orders.getOrder(orderId);
    if (!order) {
      sec.json(res, 404, { ok: false, error: 'Заказ не найден' });
      return;
    }

    if (order.status === 'paid') {
      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        status: 'paid',
        paid: true
      });
      return;
    }

    var invoiceId = order.provider_payment_id || body.invoiceId || url.searchParams.get('invoiceId');
    if (!invoiceId) {
      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        status: order.status,
        paid: false,
        error: 'Нет AIPay invoice id у заказа'
      });
      return;
    }

    var checkout = await adminLib.getCheckoutSettings();
    var inv = await aipay.getInvoice(invoiceId, checkout);
    var paid = aipay.isPaidStatus(inv);

    payLog('aipay_status.check', {
      orderId: orderId,
      invoiceId: invoiceId,
      invoiceStatus: inv && inv.status,
      paid: paid
    });

    if (paid) {
      await orders.markOrderPaid(orderId);
      await readings.startOrderPipeline(orderId);
      telegram
        .notifyAdmin('✅ Оплата подтверждена (AIPay poll)\nOrder: ' + orderId)
        .catch(function () {});
      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        invoiceId: invoiceId,
        status: 'paid',
        paid: true
      });
      return;
    }

    sec.json(res, 200, {
      ok: true,
      orderId: orderId,
      invoiceId: invoiceId,
      status: (inv && inv.status) || order.status,
      paid: false
    });
  } catch (err) {
    payError('aipay_status.fail', err, {});
    sec.json(res, 502, {
      ok: false,
      error: err && err.message ? err.message : 'Ошибка проверки AIPay'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
