'use strict';

var prodamus = require('../../lib/prodamus');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var { payLog, payError } = require('../../lib/pay-log');

function readRaw(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) {
      chunks.push(chunk);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function fieldTokens(name) {
  var tokens = [];
  String(name || '').replace(/([^[\]]+)/g, function (_, token) {
    tokens.push(token);
    return _;
  });
  return tokens;
}

function setNested(target, name, value) {
  var tokens = fieldTokens(name);
  if (!tokens.length) return;
  var current = target;
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var last = i === tokens.length - 1;
    if (last) {
      current[token] = value;
      return;
    }
    var nextIsIndex = /^\d+$/.test(tokens[i + 1]);
    if (current[token] == null) current[token] = nextIsIndex ? [] : {};
    current = current[token];
  }
}

function parseMultipart(raw, boundary) {
  var result = {};
  var marker = '--' + boundary;
  String(raw || '')
    .split(marker)
    .forEach(function (part) {
      var separator = part.indexOf('\r\n\r\n');
      if (separator < 0) return;
      var headers = part.slice(0, separator);
      var nameMatch = headers.match(/content-disposition:[^\r\n]*\bname="([^"]+)"/i);
      if (!nameMatch) return;
      var value = part.slice(separator + 4).replace(/\r\n--?\s*$/, '').replace(/\r\n$/, '');
      setNested(result, nameMatch[1], value);
    });
  return result;
}

function parsePayload(raw, contentType) {
  var type = String(contentType || '').toLowerCase();
  if (type.indexOf('application/json') >= 0) {
    return JSON.parse(raw || '{}');
  }
  if (type.indexOf('multipart/form-data') >= 0) {
    var match = String(contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) throw new Error('Multipart boundary отсутствует');
    return parseMultipart(raw, match[1] || match[2]);
  }
  var result = {};
  new URLSearchParams(raw || '').forEach(function (value, key) {
    setNested(result, key, value);
  });
  return result;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  var started = Date.now();
  try {
    if (!prodamus.isConfigured()) {
      res.statusCode = 503;
      res.end('Prodamus is not configured');
      return;
    }

    var raw = await readRaw(req);
    var payload = parsePayload(raw, req.headers['content-type']);
    var signature = req.headers.sign || req.headers['x-signature'] || '';
    if (!prodamus.verify(payload, signature)) {
      payLog('prodamus_webhook.bad_signature', {
        bytes: Buffer.byteLength(raw || '', 'utf8'),
        paymentStatus: payload && payload.payment_status
      });
      res.statusCode = 401;
      res.end('Invalid signature');
      return;
    }

    var orderId = String(payload.order_num || payload._param_order_id || '').trim();
    payLog('prodamus_webhook.received', {
      orderId: orderId || null,
      prodamusOrderId: payload.order_id || null,
      paymentStatus: payload.payment_status || null,
      sum: payload.sum || null,
      ms: Date.now() - started
    });

    if (!orderId || !prodamus.isPaid(payload)) {
      res.statusCode = 200;
      res.end('OK');
      return;
    }

    var order = await orders.getOrder(orderId);
    if (!order || order.payment_provider !== 'prodamus') {
      payLog('prodamus_webhook.order_missing', { orderId: orderId });
      res.statusCode = 404;
      res.end('Order not found');
      return;
    }

    if (!prodamus.amountMatches(payload, order.amount)) {
      payError('prodamus_webhook.amount_mismatch', new Error('Prodamus amount mismatch'), {
        orderId: orderId,
        orderAmount: order.amount,
        paidAmount: payload.sum
      });
      res.statusCode = 409;
      res.end('Amount mismatch');
      return;
    }

    if (order.status !== 'paid') {
      await orders.markOrderPaid(orderId);
      await readings.startOrderPipeline(orderId);
      await telegram.notifyAdmin(
        '✅ Оплата подтверждена (Prodamus)\nOrder: ' +
          orderId +
          '\nСумма: ' +
          order.amount +
          ' ₸'
      );
    }

    res.statusCode = 200;
    res.end('OK');
  } catch (err) {
    payError('prodamus_webhook.fail', err, { ms: Date.now() - started });
    res.statusCode = 500;
    res.end('Webhook error');
  }
}

module.exports = handler;
module.exports.default = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
