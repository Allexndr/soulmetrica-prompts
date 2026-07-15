'use strict';

var contact = require('../../../lib/contact');
var telegram = require('../../../lib/telegram');
var orders = require('../../../lib/orders');
var sec = require('../../../lib/security');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var body = await sec.readJson(req);
    var phone = contact.normalizePhone(body.phone || '');
    if (!phone) {
      sec.json(res, 400, { ok: false, error: 'Укажи номер телефона' });
      return;
    }

    var token = contact.makePhoneVerifyToken(phone);
    if (!token) {
      sec.json(res, 400, { ok: false, error: 'Некорректный телефон' });
      return;
    }

    // Optional: check if we even have orders for this phone (soft hint)
    var dbOrders = [];
    try {
      var { getDb } = require('../../../lib/db');
      var db = getDb();
      var { data } = await db
        .from('orders')
        .select('id, phone, status, telegram_chat_id, contact')
        .order('created_at', { ascending: false })
        .limit(40);
      dbOrders = (data || []).filter(function (o) {
        return contact.phonesMatch(o.phone, phone);
      });
    } catch (e) {
      dbOrders = [];
    }

    var botUrl = telegram.phoneVerifyDeepLink(token);
    sec.json(res, 200, {
      ok: true,
      phone: phone,
      botUrl: botUrl,
      ordersFound: dbOrders.length,
      hasTelegram: dbOrders.some(function (o) {
        return !!o.telegram_chat_id;
      }),
      message:
        'Чтобы войти, открой Telegram-бота — так мы подтвердим, что номер и аккаунт твои. Без SMS: код/ссылка придут в бота.'
    });
  } catch (err) {
    console.error('[auth/phone-start]', err.message);
    sec.json(res, 500, { ok: false, error: 'Не удалось начать вход по телефону' });
  }
}

module.exports = handler;
module.exports.default = handler;
