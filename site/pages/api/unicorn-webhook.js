'use strict';

var unicorn = require('../../lib/unicorn');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
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

function isPaidWebhook(raw) {
  var s = String(raw || '');
  if (/state="80"/.test(s) && /final="1"/.test(s)) return true;
  if (/pg_result=1/.test(s) || /"status"\s*:\s*"paid"/i.test(s)) return true;
  if (/RC" value="00"/.test(s) || /name="ACTION" value="0"/.test(s)) return true;
  return false;
}

function extractSignals(raw) {
  var s = String(raw || '');
  return {
    state80: /state="80"/i.test(s),
    final1: /final="1"/i.test(s),
    pgResult1: /pg_result=1/i.test(s),
    rc00: /RC" value="00"/i.test(s),
    action0: /name="ACTION" value="0"/i.test(s),
    hasVelunaId: /\bveluna-[a-zA-Z0-9-]+\b/.test(s)
  };
}

async function handler(req, res) {
  unicorn.setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  var started = Date.now();
  try {
    var raw = await readRaw(req);
    var paid = isPaidWebhook(raw);
    var signals = extractSignals(raw);
    var orderMatch = String(raw || '').match(/\b(veluna-[a-zA-Z0-9-]+)\b/);
    var orderId = orderMatch ? orderMatch[1] : null;

    payLog('webhook.received', {
      method: req.method,
      ip: (req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || '').toString().split(',')[0].trim(),
      contentType: req.headers['content-type'] || null,
      bytes: Buffer.byteLength(String(raw || ''), 'utf8'),
      orderId: orderId,
      paid: paid,
      signals: signals,
      bodyPreview: String(raw || '').slice(0, 2500),
      query: req.url || null
    });

    if (orderId && paid) {
      var order = await orders.getOrder(orderId);
      payLog('webhook.order_lookup', {
        orderId: orderId,
        found: !!order,
        status: order && order.status
      });

      if (order && order.status !== 'paid') {
        await orders.markOrderPaid(orderId);
        payLog('webhook.marked_paid', { orderId: orderId, source: 'webhook' });
        await readings.startOrderPipeline(orderId);
        payLog('webhook.pipeline_started', { orderId: orderId });
        await telegram.notifyAdmin('✅ Оплата подтверждена (webhook)\nOrder: ' + orderId + '\nГенерация разбора запущена.');
      } else if (order && order.status === 'paid') {
        payLog('webhook.already_paid', { orderId: orderId });
      } else {
        payLog('webhook.order_missing', { orderId: orderId });
      }
    } else if (orderId) {
      payLog('webhook.not_paid_signal', { orderId: orderId, signals: signals });
      await telegram.notifyAdmin(
        '📩 Unicorn webhook (не paid)\nOrder: ' + orderId + '\n' + String(raw || '').slice(0, 400)
      );
    } else {
      payLog('webhook.no_order_id', { signals: signals });
    }

    payLog('webhook.done', { orderId: orderId, paid: paid, ms: Date.now() - started });
  } catch (err) {
    payError('webhook.fail', err, { ms: Date.now() - started });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('OK');
}

module.exports = handler;
module.exports.default = handler;
