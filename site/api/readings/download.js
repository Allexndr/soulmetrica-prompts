'use strict';

var auth = require('../../lib/auth');
var sec = require('../../lib/security');
var readings = require('../../lib/readings');
var orders = require('../../lib/orders');
var htmlReading = require('../../lib/html-reading');
var htmlToPdf = require('../../lib/html-to-pdf');
var fileName = require('../../lib/file-name');

module.exports = async function handler(req, res) {
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
    var fmt = (url.searchParams.get('fmt') || 'html').toLowerCase();
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

    var allowed = htmlReading.verifyShareToken(id, token);
    if (!allowed) {
      var user = await auth.getSessionUser(req);
      if (user && reading.user_id === user.id) allowed = true;
    }
    if (!allowed) {
      sec.json(res, 401, { ok: false, error: 'Нужен вход или ссылка из Telegram' });
      return;
    }

    var order = await orders.getOrder(reading.order_id);
    var html = htmlReading.buildReadingHtml(reading, order || {});
    var name = fileName.readingFileBase(order || {}, reading.title);

    if (fmt === 'pdf') {
      var pdfBuf = readings.isPremiumReading(reading)
        ? await htmlToPdf.buildPremiumPdf(reading, order, html)
        : await require('../../lib/pdf-reading').buildReadingPdf(reading, order || {});
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="' + name + '.pdf"');
      res.setHeader('Cache-Control', 'private, max-age=120');
      res.end(pdfBuf);
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + name + '.html"');
    res.setHeader('Cache-Control', 'private, max-age=120');
    res.end(html);
  } catch (err) {
    console.error('[readings/download]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка скачивания' });
  }
};
