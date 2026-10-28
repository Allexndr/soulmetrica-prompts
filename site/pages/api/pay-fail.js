'use strict';

var { payLog } = require('../../lib/pay-log');
var sec = require('../../lib/security');

function parseOrder(req) {
  try {
    var url = new URL(req.url, sec.siteOrigin());
    return url.searchParams.get('order') || '';
  } catch (e) {
    return '';
  }
}

function readRaw(req) {
  return new Promise(function (resolve) {
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
    req.on('error', function () {
      resolve('');
    });
  });
}

function html() {
  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Оплата не прошла · SoulMetrica</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700&family=Onest:wght@600;700&display=swap" rel="stylesheet">' +
    '<style>' +
    ':root{--text:#241b2e;--accent:#d45e83}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif;color:var(--text);background:linear-gradient(180deg,#ffd6e8 0%,#fff8fa 55%,#fff 100%);padding:24px}' +
    '.card{width:min(480px,100%);background:#fff;border-radius:28px;border:1px solid rgba(226,101,144,.28);padding:40px 32px;box-shadow:0 24px 60px rgba(200,83,121,.12);text-align:center}' +
    'h1{font-family:Onest,sans-serif;font-size:28px;line-height:1.2;margin-bottom:12px}' +
    'p{color:rgba(36,27,46,.72);line-height:1.55;margin-bottom:28px}' +
    'a{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 28px;border-radius:100px;text-decoration:none;background:linear-gradient(168deg,#f06e9c 0%,#d45e83 48%,#b23e66 100%);color:#fff;font-weight:700}' +
    '</style></head><body><div class="card">' +
    '<h1>Оплата не прошла</h1>' +
    '<p>Ничего страшного — можно попробовать ещё раз с другой картой или написать нам в Telegram.</p>' +
    '<a href="/#products">Попробовать снова</a>' +
    '</div></body></html>'
  );
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  var orderId = parseOrder(req);
  var raw = '';
  try {
    raw = await readRaw(req);
  } catch (e) {
    raw = '';
  }

  payLog('fail_redirect.hit', {
    method: req.method,
    orderId: orderId || null,
    ip: (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim(),
    url: req.url || null,
    bodyPreview: String(raw || '').slice(0, 1500)
  });

  sec.setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html());
}

module.exports = handler;
module.exports.default = handler;
