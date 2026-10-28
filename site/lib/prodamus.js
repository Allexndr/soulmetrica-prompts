'use strict';

var crypto = require('crypto');

var DEFAULT_FORM_URL = 'https://soulmetrica.proeducation.kz/';

function secretKey() {
  return String(process.env.PRODAMUS_SECRET_KEY || '').trim();
}

function formUrl() {
  var raw = String(process.env.PRODAMUS_FORM_URL || DEFAULT_FORM_URL).trim();
  return raw.replace(/\/?$/, '/');
}

function isConfigured() {
  return !!secretKey() && /^https:\/\//i.test(formUrl());
}

function normalizeForSignature(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeForSignature);
  }
  if (value && typeof value === 'object') {
    var sorted = {};
    Object.keys(value)
      .sort()
      .forEach(function (key) {
        sorted[key] = normalizeForSignature(value[key]);
      });
    return sorted;
  }
  if (value == null) return '';
  return String(value);
}

function signaturePayload(data) {
  return JSON.stringify(normalizeForSignature(data)).replace(/\//g, '\\/');
}

function sign(data, key) {
  var secret = String(key || secretKey()).trim();
  if (!secret) throw new Error('Prodamus secret key не задан');
  return crypto.createHmac('sha256', secret).update(signaturePayload(data), 'utf8').digest('hex');
}

function verify(data, signature) {
  var received = String(signature || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received) || !secretKey()) return false;
  var expected = sign(data);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

function appendQuery(params, key, value) {
  if (Array.isArray(value)) {
    value.forEach(function (item, index) {
      appendQuery(params, key + '[' + index + ']', item);
    });
    return;
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(function (childKey) {
      appendQuery(params, key ? key + '[' + childKey + ']' : childKey, value[childKey]);
    });
    return;
  }
  params.append(key, value == null ? '' : String(value));
}

function createPaymentUrl(order, origin) {
  if (!isConfigured()) throw new Error('Prodamus не настроен');

  var amount = Math.round(Number(order && order.sum) || 0);
  if (amount < 30) throw new Error('Некорректная сумма Prodamus (мин. 30 ₸)');

  var siteOrigin = String(origin || '').replace(/\/$/, '');
  if (!/^https:\/\//i.test(siteOrigin)) throw new Error('Некорректный SITE_URL для Prodamus');

  var data = {
    order_id: String(order.id),
    customer_phone: String(order.phone || ''),
    customer_extra: String(order.description || 'SoulMetrica').slice(0, 240),
    products: [
      {
        name: String(order.description || 'Разбор SoulMetrica').slice(0, 120),
        price: amount.toFixed(2),
        quantity: '1',
        type: 'service'
      }
    ],
    do: 'pay',
    currency: 'kzt',
    urlReturn:
      order.failUrl || siteOrigin + '/api/pay-fail?order=' + encodeURIComponent(order.id),
    urlSuccess:
      order.successUrl || siteOrigin + '/api/pay-success?order=' + encodeURIComponent(order.id)
  };

  var sys = String(process.env.PRODAMUS_SYS || '').trim();
  if (sys) {
    data.sys = sys;
  }
  if (sys || order.notifyUrl) {
    data.urlNotification = order.notifyUrl || siteOrigin + '/api/prodamus-webhook';
    data.callbackType = 'json';
  }

  data.signature = sign(data);

  var params = new URLSearchParams();
  Object.keys(data).forEach(function (key) {
    appendQuery(params, key, data[key]);
  });
  return formUrl() + '?' + params.toString();
}

function amountMatches(payload, expectedAmount) {
  var actual = Number(payload && (payload.sum || payload.order_sum));
  var expected = Number(expectedAmount);
  return Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 0.01;
}

function isPaid(payload) {
  return String((payload && payload.payment_status) || '').toLowerCase() === 'success';
}

module.exports = {
  formUrl: formUrl,
  isConfigured: isConfigured,
  normalizeForSignature: normalizeForSignature,
  signaturePayload: signaturePayload,
  sign: sign,
  verify: verify,
  createPaymentUrl: createPaymentUrl,
  amountMatches: amountMatches,
  isPaid: isPaid
};
