'use strict';

/**
 * One-shot: меню доставки (сайт + HTML + PDF + главы) в одном сообщении.
 * GET ?id=readingId&t=shareToken
 */

var sec = require('../lib/security');
var readings = require('../lib/readings');
var orders = require('../lib/orders');
var htmlReading = require('../lib/html-reading');
var telegram = require('../lib/telegram');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    sec.json(res, 405, { ok: false, error: 'GET only' });
    return;
  }
  try {
    var url = new URL(req.url, sec.siteOrigin());
    var id = url.searchParams.get('id') || 'e4c5235e-19d7-4c3d-bfcb-34e98f3fb87b';
    var token = url.searchParams.get('t') || '';
    var chatId = url.searchParams.get('chat') || '5450018125';
    var allowed = token && htmlReading.verifyShareToken(id, token);
    if (!allowed) {
      sec.json(res, 401, { ok: false, error: 'unauthorized' });
      return;
    }
    var reading = await readings.getReading(id);
    if (!reading) {
      sec.json(res, 404, { ok: false, error: 'reading not found' });
      return;
    }
    var order = await orders.getOrder(reading.order_id);
    var siteUrl = await readings.siteReadingUrl(id, order || {});
    var premium = readings.isPremiumReading(reading);
    var chapters = require('../lib/format-reading').getChapters(reading);

    await telegram.sendMessage(
      chatId,
      telegram.readingDeliveryText(reading, {
        orderId: reading.order_id,
        chapters: chapters.length,
        premium: premium
      }),
      {
        reply_markup: telegram.readingMenuKeyboard(id, siteUrl, premium)
      }
    );

    sec.json(res, 200, { ok: true, siteUrl: siteUrl });
  } catch (err) {
    console.error('[dev-send-premium-preview]', err.message);
    sec.json(res, 500, { ok: false, error: err.message });
  }
};
