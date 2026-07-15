'use strict';

var aipay = require('../../lib/aipay');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var adminLib = require('../../lib/admin');
var sec = require('../../lib/security');
var { payLog, payError } = require('../../lib/pay-log');

function readRaw(req) {
  return new Promise(function (resolve, reject) {
    if (typeof req.body === 'string') {
      resolve(req.body);
      return;
    }
    if (Buffer.isBuffer(req.body)) {
      resolve(req.body.toString('utf8'));
      return;
    }
    if (req.body && typeof req.body === 'object') {
      resolve(JSON.stringify(req.body));
      return;
    }
    var chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function parsePayload(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function dig(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (var i = 0; i < keys.length; i++) {
    if (obj[keys[i]] != null && obj[keys[i]] !== '') return obj[keys[i]];
  }
  if (obj.data && typeof obj.data === 'object') {
    for (var j = 0; j < keys.length; j++) {
      if (obj.data[keys[j]] != null && obj.data[keys[j]] !== '') return obj.data[keys[j]];
    }
  }
  if (obj.invoice && typeof obj.invoice === 'object') {
    for (var k = 0; k < keys.length; k++) {
      if (obj.invoice[keys[k]] != null && obj.invoice[keys[k]] !== '') return obj.invoice[keys[k]];
    }
  }
  return null;
}

async function markPaidPipeline(orderId, source) {
  var order = await orders.getOrder(orderId);
  if (!order) {
    payLog('aipay_webhook.order_missing', { orderId: orderId, source: source });
    return false;
  }
  if (order.status === 'paid') {
    payLog('aipay_webhook.already_paid', { orderId: orderId, source: source });
    return true;
  }
  await orders.markOrderPaid(orderId);
  await readings.startOrderPipeline(orderId);
  await telegram.notifyAdmin(
    '✅ Оплата подтверждена (AIPay ' + source + ')\nOrder: ' + orderId + '\nГенерация разбора запущена.'
  );
  return true;
}

async function handler(req, res) {
  aipay.setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  var started = Date.now();
  try {
    var raw = await readRaw(req);
    var json = parsePayload(raw);
    var invoiceId = dig(json, ['id', 'invoice_id', 'invoiceId', 'payment_id']);
    var status = String(dig(json, ['status', 'state', 'event']) || '').toLowerCase();
    var message = dig(json, ['message', 'comment', 'description']) || '';
    var orderId =
      dig(json, ['order_id', 'orderId', 'external_id', 'externalId']) ||
      aipay.extractOrderIdFromMessage(message) ||
      aipay.extractOrderIdFromMessage(raw);

    var paid =
      aipay.isPaidStatus(json && (json.data || json.invoice || json)) ||
      /paid|success|completed|оплачен/i.test(status) ||
      /"status"\s*:\s*"paid"/i.test(String(raw || ''));

    if (!orderId && invoiceId) {
      var byInv = await orders.findOrderByProviderPaymentId(invoiceId);
      if (byInv) orderId = byInv.id;
    }

    payLog('aipay_webhook.received', {
      method: req.method,
      invoiceId: invoiceId,
      orderId: orderId,
      status: status,
      paid: paid,
      bodyPreview: String(raw || '').slice(0, 2000),
      ms: Date.now() - started
    });

    if (orderId && paid) {
      await markPaidPipeline(orderId, 'webhook');
    } else if (orderId && invoiceId) {
      // Refresh from API when ambiguous
      try {
        var checkout = await adminLib.getCheckoutSettings();
        var inv = await aipay.getInvoice(invoiceId, checkout);
        if (aipay.isPaidStatus(inv)) {
          await markPaidPipeline(orderId, 'webhook_poll');
        }
      } catch (e) {
        payError('aipay_webhook.poll_fail', e, { orderId: orderId, invoiceId: invoiceId });
      }
    }

    sec.json(res, 200, { ok: true });
  } catch (err) {
    payError('aipay_webhook.fail', err, { ms: Date.now() - started });
    sec.json(res, 200, { ok: true });
  }
}

module.exports = handler;
module.exports.default = handler;
