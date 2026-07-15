'use strict';

var unicorn = require('../../lib/unicorn');
var aipay = require('../../lib/aipay');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var sec = require('../../lib/security');
var auth = require('../../lib/auth');
var contact = require('../../lib/contact');
var adminLib = require('../../lib/admin');
var { payLog, payError } = require('../../lib/pay-log');

function pickProvider(bodyProvider, settings) {
  var pub = adminLib.publicCheckoutSettings(settings);
  var requested = adminLib.normalizeProvider(bodyProvider || pub.payment_provider || 'unicorn');
  if (requested === 'both') {
    requested = pub.aipay_enabled ? 'aipay' : 'unicorn';
  }
  if (requested === 'aipay' && !pub.aipay_enabled) {
    if (pub.unicorn_enabled) return 'unicorn';
    return null;
  }
  if (requested === 'unicorn' && !pub.unicorn_enabled) {
    if (pub.aipay_enabled) return 'aipay';
    return null;
  }
  return requested;
}

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

  var started = Date.now();
  var orderId = null;

  try {
    var body = await sec.readJson(req);
    var phone = contact.normalizePhone(body.phone || '');
    var tgUser = contact.parseTelegramUsername(body.contact || body.telegram || '');
    var product = String(body.product || 'Разбор').slice(0, 60);
    var ip = sec.clientIp(req);
    var addons = Array.isArray(body.addons) ? body.addons : [];
    var checkout = await adminLib.getCheckoutSettings();
    var charged = await adminLib.resolveChargeAmount(product, addons, body.sum || body.total || 0);
    var sum = charged.amount;
    var provider = pickProvider(body.provider || body.payment_provider, checkout);

    payLog('create_payment.request', {
      sum: sum,
      product: product,
      phone: phone ? phone.slice(0, 4) + '***' : null,
      telegram: tgUser ? '@' + tgUser : null,
      name: body.name || null,
      ip: ip,
      hasAddons: addons.length > 0,
      chargeSource: charged.source,
      testMode: !!charged.testMode,
      provider: provider
    });

    if (!provider) {
      sec.json(res, 400, { ok: false, error: 'Нет доступного платёжного провайдера' });
      return;
    }

    if (!sum || sum < 30) {
      payLog('create_payment.reject', { reason: 'bad_sum', sum: sum });
      sec.json(res, 400, { ok: false, error: 'Некорректная сумма (мин. 30 ₸)' });
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

    var addonsText = addons.join(', ');
    var meta = body.meta || {};
    var desc = ('SoulMetrica · ' + product + (addonsText ? ' + ' + addonsText : '')).slice(0, 120);

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
      product: product,
      provider: provider
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
      gender: meta.gender || 'unknown',
      paymentProvider: provider
    });

    var botLink = telegram.deepLink(orderId);
    var adminText =
      '💳 Новый заказ (ожидает оплату)\n' +
      'Провайдер: ' +
      provider +
      '\n' +
      'ID: ' +
      orderId +
      '\n' +
      'Продукт: ' +
      product +
      (addonsText ? '\nДопы: ' + addonsText : '') +
      '\n' +
      'Сумма: ' +
      sum +
      ' ₸\n' +
      'Имя: ' +
      (body.name || '—') +
      '\n' +
      'Телефон: ' +
      phone +
      '\n' +
      'Telegram: ' +
      contactStored +
      '\n' +
      'Дата: ' +
      [meta.day, meta.month, meta.year].filter(Boolean).join('.') +
      '\n' +
      'Бот после оплаты: ' +
      botLink;

    if (provider === 'aipay') {
      var invoice = await aipay.createInvoice(
        {
          id: orderId,
          sum: sum,
          phone: phone,
          message: orderId + ' · ' + desc
        },
        checkout
      );

      await orders.attachProviderPayment(orderId, 'aipay', invoice.invoiceId, {
        status: invoice.status,
        ref: invoice.ref,
        account: invoice.account
      });

      telegram.notifyAdmin(adminText + '\nAIPay invoice: ' + invoice.invoiceId).catch(function (err) {
        payError('create_payment.admin_notify_fail', err, { orderId: orderId });
      });

      payLog('create_payment.ok', {
        orderId: orderId,
        sum: sum,
        ms: Date.now() - started,
        provider: 'aipay',
        invoiceId: invoice.invoiceId
      });

      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        provider: 'aipay',
        mode: 'kaspi_invoice',
        invoiceId: invoice.invoiceId,
        payUrl: null,
        botUrl: botLink,
        skipPayment: false,
        test: !!charged.testMode,
        message:
          'Счёт на ' +
          sum +
          ' ₸ отправлен в Kaspi на номер ' +
          phone +
          '. Открой приложение Kaspi → Платежи → «Вам выставили счёт».'
      });
      return;
    }

    var payment = await unicorn.createPaymentLink({
      id: orderId,
      sum: sum,
      name: body.name || 'Клиент',
      phone: phone,
      contact: contactStored,
      email: body.email || 'order@soulmetrica.com',
      desc: desc,
      ip: ip
    });

    await orders.attachProviderPayment(orderId, 'unicorn', null, { payUrlHost: true });

    telegram.notifyAdmin(adminText).catch(function (err) {
      payError('create_payment.admin_notify_fail', err, { orderId: orderId });
    });

    payLog('create_payment.ok', {
      orderId: orderId,
      sum: sum,
      ms: Date.now() - started,
      provider: 'unicorn',
      payUrlPresent: !!payment.payUrl
    });

    sec.json(res, 200, {
      ok: true,
      orderId: orderId,
      provider: 'unicorn',
      mode: 'redirect',
      payUrl: payment.payUrl,
      botUrl: botLink,
      skipPayment: false,
      test: !!charged.testMode
    });
  } catch (err) {
    payError('create_payment.fail', err, { orderId: orderId, ms: Date.now() - started });
    sec.json(res, 502, {
      ok: false,
      error: err && err.message ? err.message : 'Ошибка создания оплаты'
    });
  }
}

module.exports = handler;
module.exports.default = handler;
