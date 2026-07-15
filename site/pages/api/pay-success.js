'use strict';

var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var contact = require('../../lib/contact');
var sec = require('../../lib/security');
var { payLog, payError } = require('../../lib/pay-log');

function parseOrder(req) {
  try {
    var url = new URL(req.url, sec.siteOrigin());
    return url.searchParams.get('order') || '';
  } catch (e) {
    return '';
  }
}

function html(orderId, botUrl, claimedTg) {
  var site = sec.siteOrigin();
  var safeOrder = sec.escapeHtml(orderId);
  var safeBot = sec.escapeHtml(botUrl);
  var tgHint = claimedTg
    ? '<p class="muted">На форме: <b>' + sec.escapeHtml(claimedTg) + '</b> — подтвердим, когда откроешь бота.</p>'
    : '';
  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Оплата прошла · SoulMetrica</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700&family=Onest:wght@600;700&display=swap" rel="stylesheet">' +
    '<style>' +
    ':root{--text:#241b2e;--accent:#d45e83}' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Nunito,sans-serif;color:var(--text);background:linear-gradient(180deg,#ffd6e8 0%,#fff8fa 55%,#fff 100%);padding:24px}' +
    '.card{width:min(520px,100%);background:#fff;border-radius:28px;border:1px solid rgba(226,101,144,.28);padding:40px 32px;box-shadow:0 24px 60px rgba(200,83,121,.12);text-align:center}' +
    'h1{font-family:Onest,sans-serif;font-size:28px;line-height:1.2;margin-bottom:12px}' +
    'p{color:rgba(36,27,46,.72);line-height:1.55;margin-bottom:12px}' +
    '.muted{font-size:13px;color:rgba(36,27,46,.45);margin-bottom:16px;word-break:break-all}' +
    '.redirect{margin:18px 0 8px;font-size:15px;color:rgba(36,27,46,.7)}' +
    '.redirect b{color:var(--accent)}' +
    '.actions{display:flex;flex-direction:column;gap:12px;align-items:center;margin-top:16px}' +
    'a.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 28px;border-radius:100px;text-decoration:none;background:linear-gradient(168deg,#f06e9c 0%,#d45e83 48%,#b23e66 100%);color:#fff;font-weight:700;width:100%;max-width:340px}' +
    'a.btn--ghost{background:#fff;color:var(--accent);border:2px solid rgba(212,94,131,.35)}' +
    'a.link{color:var(--accent);font-weight:700;font-size:14px}' +
    '</style></head><body><div class="card">' +
    '<h1>Оплата прошла</h1>' +
    '<p>Сейчас откроем Telegram — так мы подтвердим аккаунт и пришлём разбор.</p>' +
    (orderId ? '<p class="muted">Заказ: ' + safeOrder + '</p>' : '') +
    tgHint +
    '<p class="redirect">Переход через <b id="sec">3</b> сек…</p>' +
    '<div class="actions">' +
    '<a class="btn" id="tgBtn" href="' +
    safeBot +
    '">Открыть Telegram сейчас →</a>' +
    '<a class="btn btn--ghost" href="' +
    site +
    '/profile.html' +
    (orderId ? '?order=' + encodeURIComponent(orderId) + '&need=tg' : '') +
    '">Сначала в профиль</a>' +
    '<a class="link" href="/">На главную</a>' +
    '</div></div>' +
    '<script>' +
    'try{localStorage.setItem("veluna-last-order","' +
    safeOrder +
    '");}catch(e){}' +
    'var n=3,el=document.getElementById("sec"),url=' +
    JSON.stringify(botUrl) +
    ';' +
    'var t=setInterval(function(){n--;if(el)el.textContent=String(n);if(n<=0){clearInterval(t);window.location.href=url;}},1000);' +
    '</script>' +
    '</body></html>'
  );
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  var orderId = parseOrder(req);
  var ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  var botUrl = telegram.deepLink(orderId || 'login');
  var claimedTg = '';

  payLog('success_redirect.hit', {
    method: req.method,
    orderId: orderId || null,
    ip: ip,
    url: req.url || null
  });

  if (orderId) {
    try {
      var order = await orders.getOrder(orderId);
      if (order) claimedTg = contact.formatTelegramContact(order.contact) || '';
      payLog('success_redirect.order_lookup', {
        orderId: orderId,
        found: !!order,
        status: order && order.status,
        claimedTg: claimedTg || null
      });
      if (order && order.status !== 'paid') {
        await orders.markOrderPaid(orderId);
        payLog('success_redirect.marked_paid', { orderId: orderId, source: 'success_redirect' });
        await readings.startOrderPipeline(orderId);
        payLog('success_redirect.pipeline_started', { orderId: orderId });
        await telegram.notifyAdmin('✅ Оплата (success redirect)\nOrder: ' + orderId);
      } else if (order && order.status === 'paid') {
        payLog('success_redirect.already_paid', { orderId: orderId });
      }
    } catch (err) {
      payError('success_redirect.fail', err, { orderId: orderId });
    }
  } else {
    payLog('success_redirect.no_order', { url: req.url || null });
  }

  sec.setSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html(orderId, botUrl, claimedTg));
}

module.exports = handler;
module.exports.default = handler;
