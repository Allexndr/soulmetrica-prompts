'use strict';

const https = require('https');

function env(name, fallback) {
  var v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

function getTlsMaterial() {
  var certB64 = process.env.UNICORN_CERT_PEM_B64;
  var keyB64 = process.env.UNICORN_KEY_PEM_B64;
  if (!certB64 || !keyB64) {
    throw new Error('UNICORN_CERT_PEM_B64 / UNICORN_KEY_PEM_B64 не заданы в env');
  }
  return {
    cert: Buffer.from(certB64, 'base64'),
    key: Buffer.from(keyB64, 'base64')
  };
}

function escapeXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractAttr(xml, key) {
  var re = new RegExp(
    '<input[^>]*key="' + key + '"[^>]*value="([^"]*)"',
    'i'
  );
  var m = xml.match(re);
  if (m) return m[1];
  re = new RegExp(
    '<input[^>]*value="([^"]*)"[^>]*key="' + key + '"',
    'i'
  );
  m = xml.match(re);
  return m ? m[1] : null;
}

function extractResultCode(xml) {
  var m = xml.match(/<result[^>]*code="([^"]*)"/i);
  return m ? m[1] : null;
}

function toPhone(contact) {
  var digits = String(contact || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    if (digits.charAt(0) !== '7') digits = '7' + digits;
    return '+' + digits.slice(0, 11);
  }
  return '+77000000000';
}

function buildAuthXml(order) {
  var point = env('UNICORN_POINT', '4554');
  var service = env('UNICORN_SERVICE', '1330');
  var store = env('UNICORN_STORE', 'YourVeluna');
  var siteUrl = env('SITE_URL', 'https://yourveluna-theme.vercel.app').replace(/\/$/, '');
  var successBase = env('UNICORN_SUCCESS_URL', siteUrl + '/api/pay-success');
  var successUrl =
    successBase +
    (successBase.indexOf('?') >= 0 ? '&' : '?') +
    'order=' +
    encodeURIComponent(order.id);
  var failUrl = env('UNICORN_FAIL_URL', siteUrl + '/api/pay-fail');
  var notifyUrl = env('UNICORN_NOTIFY_URL', siteUrl + '/api/unicorn-webhook');

  var desc = String(order.desc || 'YourVeluna').slice(0, 120);
  // Unicorn: sum в тиынах (30 ₸ = 3000). На сайте цены в тенге → ×100.
  var tenge = Math.max(1, Math.round(Number(order.sum) || 0));
  var sumInTiyn = env('UNICORN_SUM_IN_TIYN', '1') !== '0';
  var sum = sumInTiyn ? tenge * 100 : tenge;

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<request point="' + escapeXml(point) + '">' +
    '<advanced service="' + escapeXml(service) + '" function="auth-acquiring">' +
    '<attribute name="amount_currency" value="398"/>' +
    '<attribute name="lang" value="ru"/>' +
    '<attribute name="country_code" value="KZ"/>' +
    '<attribute name="redirect_success_url" value="' + escapeXml(successUrl) + '"/>' +
    '<attribute name="redirect_fail_url" value="' + escapeXml(failUrl) + '"/>' +
    '<attribute name="notify_url" value="' + escapeXml(notifyUrl) + '"/>' +
    '<attribute name="id" value="' + escapeXml(order.id) + '"/>' +
    '<attribute name="desc" value="' + escapeXml(desc) + '"/>' +
    '<attribute name="sum" value="' + escapeXml(sum) + '"/>' +
    '<attribute name="email" value="' + escapeXml(order.email || 'order@yourveluna.kz') + '"/>' +
    '<attribute name="phone_number" value="' + escapeXml(toPhone(order.phone || order.contact)) + '"/>' +
    '<attribute name="name" value="' + escapeXml(order.name || 'Клиент') + '"/>' +
    '<attribute name="redirect_url" value="' + escapeXml(siteUrl + '/') + '"/>' +
    '<attribute name="store" value="' + escapeXml(store) + '"/>' +
    '<attribute name="ip" value="' + escapeXml(order.ip || '127.0.0.1') + '"/>' +
    '</advanced>' +
    '</request>'
  );
}

function unicornRequest(xmlBody) {
  var payLog = require('./pay-log');
  var tls = getTlsMaterial();
  var host = env('UNICORN_API_HOST', 'payment.unicornlab.kz');
  var path = env('UNICORN_API_PATH', '/external/extended-cert');
  var agent = new https.Agent({
    cert: tls.cert,
    key: tls.key,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.2'
  });

  payLog.payLog('unicorn.request', {
    host: host,
    path: path,
    point: env('UNICORN_POINT', '4554'),
    xmlPreview: String(xmlBody || '').slice(0, 1200)
  });

  return new Promise(function (resolve, reject) {
    var started = Date.now();
    var req = https.request(
      {
        hostname: host,
        path: path,
        method: 'POST',
        agent: agent,
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Content-Length': Buffer.byteLength(xmlBody)
        },
        timeout: 20000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          var body = Buffer.concat(chunks).toString('utf8');
          payLog.payLog('unicorn.response', {
            host: host,
            path: path,
            httpStatus: res.statusCode || 0,
            ms: Date.now() - started,
            resultCode: extractResultCode(body),
            payUrl: extractAttr(body, 'pay-url') ? 'present' : null,
            bodyPreview: body.slice(0, 1500)
          });
          resolve({
            status: res.statusCode || 0,
            body: body
          });
        });
      }
    );
    req.on('error', function (err) {
      payLog.payError('unicorn.request_error', err, { host: host, path: path });
      reject(err);
    });
    req.on('timeout', function () {
      var err = new Error('Unicorn timeout');
      payLog.payError('unicorn.timeout', err, { host: host, path: path, ms: Date.now() - started });
      req.destroy(err);
    });
    req.write(xmlBody);
    req.end();
  });
}

async function createPaymentLink(order) {
  var payLog = require('./pay-log');
  payLog.payLog('unicorn.create_link.start', {
    orderId: order && order.id,
    sum: order && order.sum,
    name: order && order.name
  });
  var xml = buildAuthXml(order);
  var res = await unicornRequest(xml);
  if (res.status !== 200) {
    payLog.payError('unicorn.create_link.http_error', new Error('HTTP ' + res.status), {
      orderId: order && order.id,
      bodyPreview: res.body.slice(0, 400)
    });
    throw new Error('Unicorn HTTP ' + res.status + ': ' + res.body.slice(0, 200));
  }
  var code = extractResultCode(res.body);
  var payUrl = extractAttr(res.body, 'pay-url');
  if (code !== '0' || !payUrl) {
    payLog.payError('unicorn.create_link.rejected', new Error('code=' + code), {
      orderId: order && order.id,
      code: code,
      bodyPreview: res.body.slice(0, 500)
    });
    throw new Error('Unicorn отказал (code=' + code + '): ' + res.body.slice(0, 400));
  }
  payLog.payLog('unicorn.create_link.ok', {
    orderId: order && order.id,
    code: code,
    payUrlHost: (function () {
      try {
        return new URL(payUrl).host;
      } catch (e) {
        return 'unknown';
      }
    })()
  });
  return { payUrl: payUrl, raw: res.body, code: code };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  env: env,
  createPaymentLink: createPaymentLink,
  unicornRequest: unicornRequest,
  toPhone: toPhone,
  setCors: setCors,
  extractAttr: extractAttr,
  extractResultCode: extractResultCode
};
