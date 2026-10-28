'use strict';

var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var contact = require('../../lib/contact');
var sec = require('../../lib/security');
var metaPixel = require('../../lib/meta-pixel');
var yandexMetrika = require('../../lib/yandex-metrika');
var activity = require('../../lib/activity-log');
var { payLog, payError } = require('../../lib/pay-log');

var DEFAULT_THANK_YOU_URL = 'https://neuro-kids.kz/velunasps';

function thankYouUrl() {
  var raw = String(process.env.PAYMENT_SUCCESS_URL || DEFAULT_THANK_YOU_URL).trim();
  try {
    var parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : DEFAULT_THANK_YOU_URL;
  } catch (e) {
    return DEFAULT_THANK_YOU_URL;
  }
}

function parseOrder(req) {
  try {
    var url = new URL(req.url, sec.siteOrigin());
    return url.searchParams.get('order') || '';
  } catch (e) {
    return '';
  }
}

function html(orderId, botUrl, claimedTg, lang, purchaseAmount, pending) {
  var en = lang === 'en';
  var site = sec.siteOrigin();
  var successUrl = thankYouUrl();
  var safeOrder = sec.escapeHtml(orderId);
  var safeSuccessUrl = sec.escapeHtml(successUrl);
  var purchaseJs =
    !pending && purchaseAmount
      ? metaPixel.purchaseTrackScript(purchaseAmount, 'KZT', orderId) +
        yandexMetrika.purchaseReachGoalScript(purchaseAmount, orderId)
      : '';
  var tgHint = claimedTg
    ? en
      ? '<p class="muted">On the form: <b>' +
        sec.escapeHtml(claimedTg) +
        '</b> — we will confirm when you open the bot.</p>'
      : '<p class="muted">На форме: <b>' +
        sec.escapeHtml(claimedTg) +
        '</b> — подтвердим, когда откроешь бота.</p>'
    : '';
  return (
    '<!DOCTYPE html><html lang="' +
    (en ? 'en' : 'ru') +
    '"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' +
    (en ? 'Payment successful · SoulMetrica' : 'Оплата прошла · SoulMetrica') +
    '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700&family=Onest:wght@600;700&display=swap" rel="stylesheet">' +
    '<script>' +
    metaPixel.pixelBootstrapScript() +
    yandexMetrika.metrikaBootstrapScript() +
    '</script>' +
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
    '<h1>' +
    (pending
      ? en
        ? 'Confirming payment…'
        : 'Подтверждаем оплату…'
      : en
        ? 'Payment successful'
        : 'Оплата прошла') +
    '</h1>' +
    '<p id="statusText">' +
    (pending
      ? en
        ? 'Please wait a few seconds while we confirm your payment.'
        : 'Подожди несколько секунд — подтверждаем оплату.'
      : en
        ? 'Payment confirmed. We will open the next page now.'
        : 'Оплата подтверждена. Сейчас откроем следующую страницу.') +
    '</p>' +
    (orderId
      ? '<p class="muted">' + (en ? 'Order: ' : 'Заказ: ') + safeOrder + '</p>'
      : '') +
    tgHint +
    '<p class="redirect" id="redirectBlock"' +
    (pending ? ' hidden' : '') +
    '>' +
    (en ? 'Redirecting in <b id="sec">3</b> sec…' : 'Переход через <b id="sec">3</b> сек…') +
    '</p>' +
    '<div class="actions" id="actionsBlock"' +
    (pending ? ' hidden' : '') +
    '>' +
    '<a class="btn" id="tgBtn" href="' +
    safeSuccessUrl +
    '">' +
    (en ? 'Continue →' : 'Продолжить →') +
    '</a>' +
    '<a class="btn btn--ghost" href="' +
    site +
    '/profile.html' +
    (orderId ? '?order=' + encodeURIComponent(orderId) + '&need=tg' : '') +
    '">' +
    (en ? 'Go to profile first' : 'Сначала в профиль') +
    '</a>' +
    '<a class="link" href="/">' +
    (en ? 'Home' : 'На главную') +
    '</a>' +
    '</div></div>' +
    '<script>' +
    'try{localStorage.setItem("veluna-last-order","' +
    safeOrder +
    '");}catch(e){}' +
    (pending
      ? 'var orderId=' +
        JSON.stringify(orderId) +
        ',successUrl=' +
        JSON.stringify(successUrl) +
        ',en=' +
        (en ? 'true' : 'false') +
        ',left=45;' +
        'function showPaid(){var h=document.querySelector("h1"),t=document.getElementById("statusText"),r=document.getElementById("redirectBlock"),a=document.getElementById("actionsBlock");' +
        'if(h)h.textContent=en?"Payment successful":"Оплата прошла";' +
        'if(t)t.textContent=en?"Payment confirmed. We will open the next page now.":"Оплата подтверждена. Сейчас откроем следующую страницу.";' +
        'if(r)r.hidden=false;if(a)a.hidden=false;' +
        (purchaseJs ? purchaseJs : '') +
        'var n=3,el=document.getElementById("sec"),url=successUrl;' +
        'var tmr=setInterval(function(){n--;if(el)el.textContent=String(n);if(n<=0){clearInterval(tmr);window.location.href=url;}},1000);}' +
        'function poll(){if(left--<=0){if(document.getElementById("statusText"))document.getElementById("statusText").textContent=en?"Payment is still processing. Open Telegram or contact support.":"Оплата ещё подтверждается. Открой Telegram или напиши в поддержку.";return;}' +
        'fetch("/api/order-status?orderId="+encodeURIComponent(orderId),{credentials:"same-origin",headers:{Accept:"application/json"}})' +
        '.then(function(r){return r.json();}).then(function(j){if(j&&j.paid){showPaid();return;}setTimeout(poll,2000);}).catch(function(){setTimeout(poll,3000);});}' +
        'poll();'
      : 'var n=3,el=document.getElementById("sec"),url=' +
        JSON.stringify(successUrl) +
        ';' +
        'var t=setInterval(function(){n--;if(el)el.textContent=String(n);if(n<=0){clearInterval(t);window.location.href=url;}},1000);' +
        (purchaseJs || '')) +
    '</script>' +
    '<noscript><img height="1" width="1" style="display:none" src="' +
    sec.escapeHtml(metaPixel.noscriptImg()) +
    '" alt=""><div><img src="' +
    sec.escapeHtml(yandexMetrika.noscriptImg()) +
    '" style="position:absolute;left:-9999px" alt=""></div></noscript>' +
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
  var lang = 'ru';
  var order = null;
  var purchaseAmount = 0;
  var pending = false;

  payLog('success_redirect.hit', {
    method: req.method,
    orderId: orderId || null,
    ip: ip,
    url: req.url || null
  });

  if (orderId) {
    try {
      order = await orders.getOrder(orderId);
      if (order) {
        claimedTg = contact.formatTelegramContact(order.contact) || '';
        lang = telegram.orderLang(order);
        purchaseAmount = Math.round(Number(order.amount) || 0);
      }
      payLog('success_redirect.order_lookup', {
        orderId: orderId,
        found: !!order,
        status: order && order.status,
        language: lang,
        claimedTg: claimedTg || null
      });
      if (order && order.status === 'paid') {
        payLog('success_redirect.already_paid', { orderId: orderId });
        activity.logActivity('funnel.success_open', {
          orderId: orderId,
          phone: order.phone,
          contact: order.contact,
          product: order.product,
          provider: order.payment_provider,
          source: 'web',
          landing: 'soulmetrica',
          paid: true
        });
      } else if (order) {
        pending = true;
        payLog('success_redirect.awaiting_confirmation', { orderId: orderId });
        activity.logActivity('funnel.success_open', {
          orderId: orderId,
          phone: order.phone,
          contact: order.contact,
          product: order.product,
          provider: order.payment_provider,
          source: 'web',
          landing: 'soulmetrica',
          paid: false,
          step: 'pending'
        });
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
  res.end(html(orderId, botUrl, claimedTg, lang, purchaseAmount, pending));
}

module.exports = handler;
module.exports.default = handler;
