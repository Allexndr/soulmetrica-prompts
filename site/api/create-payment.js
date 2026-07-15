'use strict';

var unicorn = require('../lib/unicorn');
var telegram = require('../lib/telegram');
var orders = require('../lib/orders');
var sec = require('../lib/security');
var auth = require('../lib/auth');
var contact = require('../lib/contact');
var { payLog, payError } = require('../lib/pay-log');

module.exports = async function handler(req, res) {
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

  var started = Date.now();
  var orderId = null;

  try {
    var body = await sec.readJson(req);
    var sum = Math.round(Number(body.sum || body.total || 0));
    // TEMP тест: минимум Unicorn = 30 ₸. Вернуть: удалить блок / поставить null.
    var TEST_PAY_SUM = 30;
    if (TEST_PAY_SUM != null) sum = TEST_PAY_SUM;
    var phone = contact.normalizePhone(body.phone || '');
    var tgUser = contact.parseTelegramUsername(body.contact || body.telegram || '');
    var product = String(body.product || 'Разбор').slice(0, 60);
    var ip = sec.clientIp(req);

    payLog('create_payment.request', {
      sum: sum,
      product: product,
      phone: phone ? phone.slice(0, 4) + '***' : null,
      telegram: tgUser ? '@' + tgUser : null,
      name: body.name || null,
      ip: ip,
      hasAddons: Array.isArray(body.addons) && body.addons.length > 0,
      testPay: TEST_PAY_SUM != null
    });

    if (!sum || sum < 1) {
      payLog('create_payment.reject', { reason: 'bad_sum', sum: sum });
      sec.json(res, 400, { ok: false, error: 'Некорректная сумма' });
      return;
    }

    if (!phone) {
      payLog('create_payment.reject', { reason: 'no_phone' });
      sec.json(res, 400, { ok: false, error: 'Укажи номер телефона' });
      return;
    }

    if (!tgUser) {
      payLog('create_payment.reject', { reason: 'no_telegram' });
      sec.json(res, 400, { ok: false, error: 'Укажи Telegram в формате @ник' });
      return;
    }

    var contactStored = contact.formatTelegramContact(tgUser);

    orderId =
      body.orderId ||
      'veluna-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);

    var addons = Array.isArray(body.addons) ? body.addons : [];
    var addonsText = addons.join(', ');
    var meta = body.meta || {};
    var desc = ('YourVeluna · ' + product + (addonsText ? ' + ' + addonsText : '')).slice(0, 120);

    var sessionUser = null;
    try {
      sessionUser = await auth.getSessionUser(req);
    } catch (e) {
      sessionUser = null;
    }

    payLog('create_payment.order_upsert', {
      orderId: orderId,
      userId: sessionUser && sessionUser.id,
      sum: sum,
      product: product
    });

    await orders.upsertPendingOrder({
      id: orderId,
      userId: sessionUser && sessionUser.id,
      product: product,
      addons: addons,
      amount: sum,
      customerName: body.name,
      phone: phone,
      contact: contactStored,
      birthDay: meta.day,
      birthMonth: meta.month,
      birthYear: meta.year,
      birthTime: meta.time,
      birthCity: meta.city,
      gender: meta.gender || 'unknown'
    });

    var payment = await unicorn.createPaymentLink({
      id: orderId,
      sum: sum,
      name: body.name || 'Клиент',
      phone: phone,
      contact: contactStored,
      email: body.email || 'order@yourveluna.kz',
      desc: desc,
      ip: ip
    });

    var botLink = telegram.deepLink(orderId);
    var adminText =
      '💳 Новый заказ (ожидает оплату)\n' +
      'ID: ' + orderId + '\n' +
      'Продукт: ' + product + (addonsText ? '\nДопы: ' + addonsText : '') + '\n' +
      'Сумма: ' + sum + ' ₸\n' +
      'Имя: ' + (body.name || '—') + '\n' +
      'Телефон: ' + phone + '\n' +
      'Telegram: ' + contactStored + '\n' +
      'Дата: ' + [meta.day, meta.month, meta.year].filter(Boolean).join('.') + '\n' +
      'Бот после оплаты: ' + botLink;

    telegram.notifyAdmin(adminText).catch(function (err) {
      payError('create_payment.admin_notify_fail', err, { orderId: orderId });
    });

    payLog('create_payment.ok', {
      orderId: orderId,
      sum: sum,
      ms: Date.now() - started,
      payUrlPresent: !!payment.payUrl
    });

    sec.json(res, 200, {
      ok: true,
      orderId: orderId,
      payUrl: payment.payUrl,
      botUrl: botLink,
      skipPayment: false,
      test: false
    });
  } catch (err) {
    payError('create_payment.fail', err, { orderId: orderId, ms: Date.now() - started });
    sec.json(res, 502, {
      ok: false,
      error: err && err.message ? err.message : 'Ошибка создания оплаты'
    });
  }
};
