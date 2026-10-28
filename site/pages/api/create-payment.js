'use strict';

var unicorn = require('../../lib/unicorn');
var aipay = require('../../lib/aipay');
var kaspi = require('../../lib/kaspi');
var prodamus = require('../../lib/prodamus');
var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var sec = require('../../lib/security');
var auth = require('../../lib/auth');
var contact = require('../../lib/contact');
var adminLib = require('../../lib/admin');
var { payLog, payError } = require('../../lib/pay-log');
var activity = require('../../lib/activity-log');
var metaCapi = require('../../lib/meta-capi');

function providerEnabled(pub, provider) {
  if (provider === 'unicorn') return pub.unicorn_enabled !== false;
  if (provider === 'kaspi') return !!pub.kaspi_enabled;
  if (provider === 'prodamus') return !!pub.prodamus_enabled;
  if (provider === 'aipay') return !!pub.aipay_enabled;
  return false;
}

function pickProvider(bodyProvider, settings) {
  var pub = adminLib.publicCheckoutSettings(settings);
  var explicit = String(bodyProvider || '').trim();
  if (
    explicit &&
    ['unicorn', 'kaspi', 'payproverka', 'prodamus', 'proeducation', 'aipay', 'paylab', 'both'].indexOf(
      explicit.toLowerCase()
    ) < 0
  ) {
    return null;
  }
  var requested = adminLib.normalizeProvider(explicit || pub.payment_provider || 'unicorn');

  if (requested === 'both') {
    if (pub.unicorn_enabled !== false) return 'unicorn';
    if (pub.prodamus_enabled) return 'prodamus';
    if (pub.kaspi_enabled) return 'kaspi';
    if (pub.aipay_enabled) return 'aipay';
    return null;
  }

  if (explicit && !providerEnabled(pub, requested)) {
    return null;
  }

  if (!providerEnabled(pub, requested)) {
    if (requested === 'kaspi' && pub.unicorn_enabled !== false) return 'unicorn';
    if (requested === 'prodamus' && pub.unicorn_enabled !== false) return 'unicorn';
    if (requested === 'aipay' && pub.unicorn_enabled !== false) return 'unicorn';
    if (requested === 'unicorn' && pub.prodamus_enabled) return 'prodamus';
    if (requested === 'unicorn' && pub.kaspi_enabled) return 'kaspi';
    if (requested === 'unicorn' && pub.aipay_enabled) return 'aipay';
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
    if (!adminLib.NAME_TO_KEY[product]) {
      payLog('create_payment.reject', { reason: 'unknown_product', product: product });
      sec.json(res, 400, { ok: false, error: 'Неизвестный продукт' });
      return;
    }
    var ip = sec.clientIp(req);
    var addons = Array.isArray(body.addons) ? body.addons : [];
    var language = body.language === 'en' || (body.meta && body.meta.language === 'en') ? 'en' : 'ru';
    var priceCurrency =
      body.currency ||
      body.price_currency ||
      (body.meta && (body.meta.currency || body.meta.price_currency)) ||
      '';
    var checkout = await adminLib.getCheckoutSettings();
    var charged;
    try {
      charged = await adminLib.resolveChargeAmount(product, addons, language, priceCurrency);
    } catch (chargeErr) {
      payLog('create_payment.reject', {
        reason: 'catalog_price',
        product: product,
        error: chargeErr && chargeErr.message
      });
      sec.json(res, 400, {
        ok: false,
        error: (chargeErr && chargeErr.message) || 'Не удалось определить цену'
      });
      return;
    }
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
      var wanted = adminLib.normalizeProvider(body.provider || body.payment_provider || '');
      var providerMsg =
        body.provider || body.payment_provider
          ? 'Выбранный способ оплаты сейчас недоступен'
          : 'Нет доступного платёжного провайдера';
      payLog('create_payment.reject', { reason: 'no_provider', wanted: wanted || null });
      sec.json(res, 400, { ok: false, error: providerMsg });
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

    orderId = 'veluna-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);

    var addonsText = addons.join(', ');
    var meta = body.meta || {};
    var clickIds = metaCapi.clickIdsFromRequest(req, meta);
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
      language: language,
      paymentMeta: {
        language: language,
        visitorId: body.visitorId || meta.visitorId || null,
        landing: meta.landing || 'soulmetrica',
        utm: meta.utm || null,
        fbp: clickIds.fbp,
        fbc: clickIds.fbc,
        fbclid: clickIds.fbclid,
        client_user_agent: clickIds.client_user_agent,
        client_ip: ip
      },
      paymentProvider: provider
    });

    metaCapi
      .sendInitiateCheckout(
        { id: orderId, amount: sum, product: product, phone: phone, payment_meta: { language: language } },
        {
          eventId: orderId + ':checkout',
          fbp: clickIds.fbp,
          fbc: clickIds.fbc,
          client_ip: ip,
          client_user_agent: clickIds.client_user_agent,
          visitorId: body.visitorId || meta.visitorId || null,
          contentName: product
        }
      )
      .catch(function () {});

    activity.logActivity('order.created', {
      orderId: orderId,
      phone: phone,
      contact: contactStored,
      userId: sessionUser && sessionUser.id,
      ip: ip,
      product: product,
      amount: sum,
      provider: provider,
      language: language,
      name: body.name || null,
      addons: addons,
      birth: [meta.day, meta.month, meta.year].filter(Boolean).join('.') || null,
      visitorId: body.visitorId || (meta && meta.visitorId) || null,
      source: 'web',
      landing: (meta && meta.landing) || 'soulmetrica',
      utm: (meta && meta.utm) || null
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

    if (provider === 'prodamus') {
      var prodamusUrl = prodamus.createPaymentUrl(
        {
          id: orderId,
          sum: sum,
          phone: phone,
          description: desc
        },
        sec.siteOrigin()
      );

      await orders.attachProviderPayment(orderId, 'prodamus', null, {
        paymentPage: prodamus.formUrl(),
        amount: sum
      });

      telegram.notifyAdmin(adminText + '\nProdamus: ссылка создана').catch(function (err) {
        payError('create_payment.admin_notify_fail', err, { orderId: orderId });
      });

      payLog('create_payment.ok', {
        orderId: orderId,
        sum: sum,
        ms: Date.now() - started,
        provider: 'prodamus',
        payUrlPresent: true
      });

      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        provider: 'prodamus',
        mode: 'redirect',
        payUrl: prodamusUrl,
        botUrl: botLink,
        skipPayment: false,
        test: !!charged.testMode
      });
      return;
    }

    if (provider === 'kaspi') {
      var kaspiInvoice = await kaspi.createInvoice({
        id: orderId,
        sum: sum,
        phone: phone,
        description: desc
      });

      await orders.attachProviderPayment(orderId, 'kaspi', kaspiInvoice.paymentId, {
        status: kaspiInvoice.status,
        cartId: kaspiInvoice.cartId,
        invoiceAmount: kaspiInvoice.amount
      });

      telegram
        .notifyAdmin(adminText + '\nKaspi payment: ' + kaspiInvoice.paymentId)
        .catch(function (err) {
          payError('create_payment.admin_notify_fail', err, { orderId: orderId });
        });

      payLog('create_payment.ok', {
        orderId: orderId,
        sum: sum,
        ms: Date.now() - started,
        provider: 'kaspi',
        paymentId: kaspiInvoice.paymentId
      });

      sec.json(res, 200, {
        ok: true,
        orderId: orderId,
        provider: 'kaspi',
        mode: 'kaspi_invoice',
        invoiceId: kaspiInvoice.paymentId,
        payUrl: null,
        botUrl: botLink,
        skipPayment: false,
        test: !!charged.testMode,
        amount: sum,
        message:
          'Счёт на ' +
          sum +
          ' ₸ отправлен в Kaspi на номер ' +
          phone +
          '. Открой приложение Kaspi и подтверди оплату.'
      });
      return;
    }

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
