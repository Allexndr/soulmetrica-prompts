'use strict';

var crypto = require('crypto');

function send(res, status, body) {
  res.status(status).json(body);
}

function authorized(req) {
  var expected = String(process.env.PAYMENT_BROKER_SECRET || '');
  var received = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!expected || !received) return false;
  var a = Buffer.from(expected);
  var b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    var sorted = {};
    Object.keys(value)
      .sort()
      .forEach(function (key) {
        sorted[key] = normalize(value[key]);
      });
    return sorted;
  }
  return value == null ? '' : String(value);
}

function signaturePayload(data) {
  return JSON.stringify(normalize(data)).replace(/\//g, '\\/');
}

function prodamusSign(data) {
  var secret = String(process.env.PRODAMUS_SECRET_KEY || '').trim();
  if (!secret) throw new Error('Card payment key is not configured');
  return crypto.createHmac('sha256', secret).update(signaturePayload(data), 'utf8').digest('hex');
}

function prodamusVerify(data, signature) {
  var received = String(signature || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  var expected = prodamusSign(data);
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
    Object.keys(value).forEach(function (child) {
      appendQuery(params, key ? key + '[' + child + ']' : child, value[child]);
    });
    return;
  }
  params.append(key, value == null ? '' : String(value));
}

function paymentUrl(body) {
  var amount = Math.round(Number(body.amountKzt) || 0);
  var data = {
    order_id: String(body.orderId),
    customer_phone: String(body.phone || ''),
    customer_extra: String(body.description || 'BrandWars.kz').slice(0, 240),
    products: [
      {
        name: String(body.description || 'Размещение BrandWars.kz').slice(0, 120),
        price: amount.toFixed(2),
        quantity: '1',
        type: 'service'
      }
    ],
    do: 'pay',
    currency: 'kzt',
    urlReturn: body.failUrl,
    urlSuccess: body.successUrl,
    urlNotification: body.notifyUrl,
    callbackType: 'json'
  };
  var sys = String(process.env.PRODAMUS_SYS || '').trim();
  if (sys) data.sys = sys;
  data.signature = prodamusSign(data);
  var params = new URLSearchParams();
  Object.keys(data).forEach(function (key) {
    appendQuery(params, key, data[key]);
  });
  var form = String(
    process.env.PRODAMUS_FORM_URL || 'https://soulmetrica.proeducation.kz/'
  ).replace(/\/?$/, '/');
  return form + '?' + params.toString();
}

function validOrderId(value) {
  return /^[a-zA-Z0-9_-]{8,200}$/.test(String(value || ''));
}

function validBrandWarsUrl(value) {
  try {
    var url = new URL(String(value || ''));
    return url.protocol === 'https:' && url.hostname === 'brand-wars.vercel.app';
  } catch (error) {
    return false;
  }
}

function normalizePhone(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
  if (digits.length === 10) digits = '7' + digits;
  return digits.length === 11 && digits.charAt(0) === '7' ? digits : '';
}

async function kaspi(path, init) {
  var key = String(process.env.PAYPROVERKA_API_KEY || '').trim();
  if (!key) throw new Error('Kaspi key is not configured');
  var base = String(
    process.env.PAYPROVERKA_API_URL || 'https://pay.proverkacheka.kz/api'
  ).replace(/\/$/, '');
  var response = await fetch(base + path, {
    method: (init && init.method) || 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-Key': key,
      'Content-Type': 'application/json'
    },
    body: init && init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(25000)
  });
  var text = await response.text();
  var data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = {};
  }
  if (!response.ok) {
    throw new Error(String(data.message || data.error || text.slice(0, 200) || 'Kaspi error'));
  }
  return data;
}

async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return send(res, 401, { ok: false, error: 'Unauthorized' });

  try {
    var body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.action === 'create_card') {
      if (
        !validOrderId(body.orderId) ||
        !validBrandWarsUrl(body.successUrl) ||
        !validBrandWarsUrl(body.failUrl) ||
        !validBrandWarsUrl(body.notifyUrl)
      ) {
        return send(res, 400, { ok: false, error: 'Invalid BrandWars request' });
      }
      var amount = Math.round(Number(body.amountKzt) || 0);
      if (amount < 500 || amount > 10000000) {
        return send(res, 400, { ok: false, error: 'Invalid amount' });
      }
      return send(res, 200, { ok: true, payUrl: paymentUrl(body) });
    }

    if (body.action === 'verify_prodamus') {
      var payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
      return send(res, 200, {
        ok: true,
        valid: prodamusVerify(payload, body.signature),
        paid: String(payload.payment_status || '').toLowerCase() === 'success',
        orderId: String(payload.order_num || payload._param_order_id || ''),
        amount: Number(payload.sum || payload.order_sum || 0)
      });
    }

    if (body.action === 'create_kaspi') {
      var phone = normalizePhone(body.phone);
      if (!validOrderId(body.orderId) || !phone) {
        return send(res, 400, { ok: false, error: 'Invalid Kaspi request' });
      }
      var invoice = await kaspi('/v1/invoice/create', {
        method: 'POST',
        body: {
          phoneNumber: phone,
          items: [
            {
              name: String(body.description || 'BrandWars.kz').slice(0, 120),
              price: Math.round(Number(body.amountKzt)),
              count: 1
            }
          ]
        }
      });
      return send(res, 200, {
        ok: true,
        paymentId: invoice.paymentId,
        amount: invoice.amount,
        status: invoice.status
      });
    }

    if (body.action === 'kaspi_status') {
      var status = await kaspi('/v1/invoice/' + encodeURIComponent(String(body.paymentId || '')));
      return send(res, 200, {
        ok: true,
        status: status.status || null,
        amount: status.amount == null ? null : status.amount
      });
    }

    return send(res, 400, { ok: false, error: 'Unknown action' });
  } catch (error) {
    return send(res, 502, {
      ok: false,
      error: error && error.message ? error.message : 'Payment broker error'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
