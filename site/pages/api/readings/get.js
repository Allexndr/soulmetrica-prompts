'use strict';

var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');
var readings = require('../../../lib/readings');
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

    var user = await auth.getSessionUser(req);
    var allowed = user && reading.user_id === user.id;
    if (!allowed && token && htmlReading.verifyShareToken(id, token)) allowed = true;
    if (!allowed) {
      sec.json(res, 401, { ok: false, error: 'Требуется вход' });
      return;
    }

    sec.json(res, 200, {
      ok: true,
      reading: {
        id: reading.id,
        title: reading.title,
        orderId: reading.order_id,
        content: reading.content_text,
        fileUrl: reading.file_url,
        premium: readings.isPremiumReading(reading)
      }
    });
  } catch (err) {
    console.error('[readings/get]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка загрузки разбора' });
  }
}

module.exports = handler;
module.exports.default = handler;
