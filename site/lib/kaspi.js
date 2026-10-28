'use strict';

var https = require('https');
var { URL } = require('url');
var { payLog, payError } = require('./pay-log');

var DEFAULT_API_URL = 'https://pay.proverkacheka.kz/api';

function apiKey() {
  return String(process.env.PAYPROVERKA_API_KEY || '').trim();
}

function apiUrl() {
  return String(process.env.PAYPROVERKA_API_URL || DEFAULT_API_URL)
    .trim()
    .replace(/\/$/, '');
}

function isConfigured() {
  return !!apiKey();
}

function normalizePhone(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
  if (digits.length === 10) digits = '7' + digits;
  if (digits.length !== 11 || digits.charAt(0) !== '7') return '';
  return digits;
}

function safeDescription(raw) {
  return String(raw || 'SoulMetrica')
    .replace(/[«»"'']/g, '')
    .replace(/[^\p{L}\p{N}\s\-_.:()/]/gu, '')
    .trim()
    .slice(0, 120);
}

function request(method, path, body) {
  return new Promise(function (resolve, reject) {
    var started = Date.now();
    var url = new URL(apiUrl() + path);
    var payload = body == null ? null : JSON.stringify(body);
    var headers = {
      Accept: 'application/json',
      'X-API-Key': apiKey()
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    var req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: 25000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
          chunks.push(chunk);
        });
        res.on('end', function () {
          var raw = Buffer.concat(chunks).toString('utf8');
          var json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (e) {
            json = null;
          }
          payLog('kaspi.response', {
            method: method,
            path: path,
            httpStatus: res.statusCode || 0,
            ms: Date.now() - started,
            bodyPreview: raw.slice(0, 800)
          });
          resolve({ status: res.statusCode || 0, raw: raw, json: json });
        });
      }
    );

    req.on('error', function (err) {
      payError('kaspi.request_error', err, { method: method, path: path });
      reject(err);
    });
    req.on('timeout', function () {
      var err = new Error('Kaspi invoice API timeout');
      req.destroy(err);
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function apiError(res, fallback) {
  var data = res && res.json;
  var detail = data && data.detail;
  return (
    (detail && (detail.message || detail.code)) ||
    (data && (data.message || data.error)) ||
    (res && res.raw && res.raw.slice(0, 240)) ||
    fallback
  );
}

async function createInvoice(order) {
  if (!isConfigured()) throw new Error('Kaspi API key не задан');

  var phone = normalizePhone(order && order.phone);
  if (!phone) throw new Error('Для Kaspi нужен казахстанский номер +7');

  var amount = Math.round(Number(order && order.sum) || 0);
  if (amount < 30) throw new Error('Некорректная сумма Kaspi (мин. 30 ₸)');

  var description = safeDescription(order && order.description);
  var body = {
    phoneNumber: phone,
    items: [{ name: description, price: amount, count: 1 }]
  };

  payLog('kaspi.create_invoice.start', {
    orderId: order && order.id,
    amount: amount,
    phone: phone.slice(0, 4) + '***'
  });

  var res = await request('POST', '/v1/invoice/create', body);
  var data = res.json;
  if (res.status < 200 || res.status >= 300 || !data || !data.paymentId) {
    throw new Error('Kaspi API отказал: ' + apiError(res, 'не удалось выставить счёт'));
  }

  payLog('kaspi.create_invoice.ok', {
    orderId: order && order.id,
    paymentId: data.paymentId,
    cartId: data.cartId || null,
    amount: amount
  });

  return {
    paymentId: String(data.paymentId),
    cartId: data.cartId ? String(data.cartId) : null,
    amount: data.amount == null ? amount : Number(data.amount),
    status: data.status || 'created'
  };
}

async function getInvoice(paymentId) {
  if (!isConfigured()) throw new Error('Kaspi API key не задан');
  var id = String(paymentId || '').trim();
  if (!id) throw new Error('Kaspi paymentId обязателен');

  var res = await request('GET', '/v1/invoice/' + encodeURIComponent(id));
  if (res.status < 200 || res.status >= 300 || !res.json) {
    throw new Error('Kaspi status API отказал: ' + apiError(res, 'не удалось проверить счёт'));
  }
  return res.json;
}

function normalizedStatus(invoice) {
  return String((invoice && invoice.status) || '')
    .trim()
    .toLowerCase();
}

function isPaidStatus(invoice) {
  var status = normalizedStatus(invoice);
  return (
    status === 'processed' ||
    status === 'paid' ||
    status === 'completed' ||
    status === 'delivered'
  );
}

function isTerminalFailure(invoice) {
  var status = normalizedStatus(invoice);
  return (
    status === 'failed' ||
    status === 'rejected' ||
    status === 'cancelled' ||
    status === 'expired'
  );
}

function amountMatches(invoice, expectedAmount) {
  if (!invoice || invoice.amount == null || invoice.amount === '') return false;
  var raw = invoice.amount;
  var normalized =
    typeof raw === 'number'
      ? raw
      : Number(
          String(raw)
            .replace(/\s/g, '')
            .replace(/[^\d,.-]/g, '')
            .replace(/,/g, '.')
        );
  var actual = Math.round(normalized);
  var expected = Math.round(Number(expectedAmount));
  return Number.isFinite(actual) && Number.isFinite(expected) && actual === expected;
}

module.exports = {
  isConfigured: isConfigured,
  normalizePhone: normalizePhone,
  createInvoice: createInvoice,
  getInvoice: getInvoice,
  normalizedStatus: normalizedStatus,
  isPaidStatus: isPaidStatus,
  isTerminalFailure: isTerminalFailure,
  amountMatches: amountMatches
};
