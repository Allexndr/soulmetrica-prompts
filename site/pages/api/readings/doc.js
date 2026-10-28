'use strict';

var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var readings = require('../../../lib/readings');
var orders = require('../../../lib/orders');
var htmlReading = require('../../../lib/html-reading');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var url = new URL(req.url, sec.siteOrigin());
    var id = url.searchParams.get('id');
    var token = url.searchParams.get('t') || '';
    if (!id) {
      sec.json(res, 400, { ok: false, error: 'id обязателен' });
      return;
    }

    var reading = await readings.getReading(id);
    if (!reading || reading.status !== 'ready') {
      sec.json(res, 404, { ok: false, error: 'Разбор не найден' });
      return;
    }

    var order = await orders.getOrder(reading.order_id);
    var allowed = htmlReading.verifyShareToken(id, token);
    if (!allowed) {
      var user = await auth.getSessionUser(req);
      if (user) {
        if (reading.user_id && reading.user_id === user.id) allowed = true;
        else if (order && order.user_id && order.user_id === user.id) allowed = true;
      }
    }
    if (!allowed) {
      sec.json(res, 401, { ok: false, error: 'Нужна ссылка из Telegram или вход в профиль' });
      return;
    }
    var html = htmlReading.buildReadingHtml(reading, order || {});
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.end(html);
  } catch (err) {
    console.error('[readings/doc]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка сборки разбора' });
  }
}

module.exports = handler;
module.exports.default = handler;
