'use strict';

var crypto = require('crypto');
var kaspi = require('../../lib/kaspi');
var prodamus = require('../../lib/prodamus');

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function authorized(req) {
  var expected = String(process.env.PAYMENT_BROKER_SECRET || '');
  var received = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !received) return false;
  var a = Buffer.from(expected);
  var b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validOrderId(value) {
  return /^[a-zA-Z0-9_-]{8,200}$/.test(String(value || ''));
}

function validBrandWarsUrl(value) {
  try {
    var url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === 'brand-wars.vercel.app';
  } catch (e) {
    return false;
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  if (!authorized(req)) {
    json(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    var body = req.body && typeof req.body === 'object' ? req.body : {};
    var action = String(body.action || '');

    if (action === 'create_card') {
      if (
        !validOrderId(body.orderId) ||
        !validBrandWarsUrl(body.successUrl) ||
        !validBrandWarsUrl(body.failUrl) ||
        !validBrandWarsUrl(body.notifyUrl)
      ) {
        json(res, 400, { ok: false, error: 'Invalid BrandWars payment request' });
        return;
      }
      var amount = Math.round(Number(body.amountKzt) || 0);
      if (amount < 500 || amount > 10000000) {
        json(res, 400, { ok: false, error: 'Invalid amount' });
        return;
      }
      var paymentUrl = prodamus.createPaymentUrl({
        id: body.orderId,
        sum: amount,
        phone: String(body.phone || ''),
        description: String(body.description || 'BrandWars.kz').slice(0, 120),
        successUrl: body.successUrl,
        failUrl: body.failUrl,
        notifyUrl: body.notifyUrl
      }, 'https://brand-wars.vercel.app');
      json(res, 200, { ok: true, payUrl: paymentUrl });
      return;
    }

    if (action === 'verify_prodamus') {
      var signature = String(body.signature || '');
      var payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
      var orderId = String(payload.order_num || payload._param_order_id || '').trim();
      json(res, 200, {
        ok: true,
        valid: prodamus.verify(payload, signature),
        paid: prodamus.isPaid(payload),
        orderId: orderId,
        amount: Number(payload.sum || payload.order_sum || 0)
      });
      return;
    }

    if (action === 'create_kaspi') {
      if (!validOrderId(body.orderId)) {
        json(res, 400, { ok: false, error: 'Invalid order id' });
        return;
      }
      var invoice = await kaspi.createInvoice({
        id: body.orderId,
        sum: body.amountKzt,
        phone: body.phone,
        description: String(body.description || 'BrandWars.kz').slice(0, 120)
      });
      json(res, 200, {
        ok: true,
        paymentId: invoice.paymentId,
        amount: invoice.amount,
        status: invoice.status
      });
      return;
    }

    if (action === 'kaspi_status') {
      var invoiceStatus = await kaspi.getInvoice(String(body.paymentId || ''));
      json(res, 200, {
        ok: true,
        status: invoiceStatus.status || null,
        amount: invoiceStatus.amount == null ? null : invoiceStatus.amount
      });
      return;
    }

    json(res, 400, { ok: false, error: 'Unknown action' });
  } catch (error) {
    json(res, 502, {
      ok: false,
      error: error && error.message ? error.message : 'Payment broker error'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
