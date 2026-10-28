'use strict';

var kaspi = require('../../lib/kaspi');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
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
      sec.json(res, 200, { ok: true, orderId: orderId, status: 'paid', paid: true });
      return;
    }

    if (order.payment_provider !== 'kaspi') {
      sec.json(res, 400, { ok: false, error: 'Заказ создан не через Kaspi' });
      return;
    }

    var paymentId = order.provider_payment_id;
    if (!paymentId) {
      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        status: order.status,
        paid: false,
        error: 'Нет Kaspi paymentId у заказа'
      });
      return;
    }

    var invoice = await kaspi.getInvoice(paymentId);
    var paid = kaspi.isPaidStatus(invoice);
    var amountMatches = kaspi.amountMatches(invoice, order.amount);

    payLog('kaspi_status.check', {
      orderId: orderId,
      paymentId: paymentId,
      invoiceStatus: invoice && invoice.status,
      orderAmount: order.amount,
      invoiceAmount: invoice && invoice.amount,
      amountMatches: amountMatches,
      paid: paid
    });

    if (paid && !amountMatches) {
      payError('kaspi_status.amount_mismatch', new Error('Kaspi invoice amount mismatch'), {
        orderId: orderId,
        paymentId: paymentId,
        orderAmount: order.amount,
        invoiceAmount: invoice && invoice.amount
      });
      sec.json(res, 409, {
        ok: false,
        orderId: orderId,
        status: 'amount_mismatch',
        paid: false,
        error: 'Сумма оплаченного счёта не совпадает с суммой заказа'
      });
      return;
    }

    if (paid) {
      await orders.markOrderPaid(orderId, {
        kaspiStatus: invoice.status,
        kaspiAmount: invoice.amount
      });
      await readings.startOrderPipeline(orderId);
      telegram
        .notifyAdmin('✅ Оплата подтверждена (Kaspi)\nOrder: ' + orderId)
        .catch(function () {});
      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        invoiceId: paymentId,
        status: 'paid',
        paid: true
      });
      return;
    }

    sec.json(res, 200, {
      ok: true,
      orderId: orderId,
      invoiceId: paymentId,
      status: kaspi.normalizedStatus(invoice) || order.status,
      paid: false,
      terminal: kaspi.isTerminalFailure(invoice)
    });
  } catch (err) {
    payError('kaspi_status.fail', err, {});
    sec.json(res, 502, {
      ok: false,
      error: err && err.message ? err.message : 'Ошибка проверки Kaspi'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
