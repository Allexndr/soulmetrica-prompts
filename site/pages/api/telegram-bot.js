'use strict';

var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var identity = require('../../lib/identity');
var auth = require('../../lib/auth');
var contact = require('../../lib/contact');
var sec = require('../../lib/security');
var { getDb } = require('../../lib/db');

var SITE = process.env.SITE_URL || 'https://yourveluna-theme.vercel.app';

async function sendWebsiteLoginLink(chatId, user, greetingName) {
  if (!user || !user.id) return;
  var token = await auth.createSession(user.id);
  var link = SITE + '/api/auth/tg-session?t=' + encodeURIComponent(token);
  await telegram.sendMessage(
    chatId,
    'Привет' + (greetingName ? ', ' + greetingName : '') + ' ✨\n\n' +
      'Ссылка в кабинет (30 дней, только для тебя):\n' +
      link +
      '\n\nИли /menu — разборы'
  );
}

async function notifyUsernameMismatch(chatId, order, from) {
  var claimed = contact.parseTelegramUsername(order && order.contact);
  var actual = (from && from.username ? String(from.username) : '').toLowerCase();
  if (!claimed) return false;
  if (actual && claimed === actual) return false;
  var claimedLabel = '@' + claimed;
  var actualLabel = actual ? '@' + actual : 'аккаунт без @ника';
  await telegram.sendMessage(
    chatId,
    'На сайте указан ' +
      claimedLabel +
      ', а открыл бота ' +
      actualLabel +
      '.\n\n' +
      'Разбор уйдёт в этот чат — Telegram, которым ты сейчас пишешь, в приоритете. Телефон с формы сохранён.\n\n' +
      'Если это не тот аккаунт — открой ссылку из нужного Telegram:\n' +
      telegram.deepLink(order.id),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Ок, этот Telegram мой', callback_data: 'tgok:' + order.id }],
          [{ text: 'Открыть снова из другого TG', url: telegram.deepLink(order.id) }]
        ]
      }
    }
  );
  return true;
}

async function handlePaidOrderStart(chatId, from, name, orderId, order) {
  var mismatched = await notifyUsernameMismatch(chatId, order, from);
  if (!mismatched) {
    await telegram.sendMessage(
      chatId,
      'Привет' + (name ? ', ' + name : '') + ' ✨\n\nЗаказ привязан к этому Telegram. Телефон с формы сохранён.'
    );
  }

  var user = await identity.ensureTelegramUser(from);
  if (user) await sendWebsiteLoginLink(chatId, user, name);

  var db = getDb();
  var { data: list } = await db
    .from('readings')
    .select('id, status, telegram_delivered_at')
    .eq('order_id', orderId);

  var ready = (list || []).filter(function (r) {
    return r.status === 'ready';
  });
  var pending = (list || []).filter(function (r) {
    return r.status === 'queued' || r.status === 'generating';
  });

  if (ready.length) {
    await telegram.sendMessage(chatId, 'Вот твой разбор:');
    for (var i = 0; i < ready.length; i++) {
      await readings.sendReadingMenu(chatId, ready[i].id);
    }
  } else if (pending.length) {
    await telegram.sendMessage(chatId, 'Оплата принята. Готовим разбор — обычно 10–30 минут.');
  } else {
    await telegram.sendMessage(chatId, 'Оплата принята. Запускаю подготовку разбора…');
    await readings.startOrderPipeline(orderId);
  }
}

async function handlePhoneVerifyStart(chatId, from, name, token) {
  var phone = contact.verifyPhoneVerifyToken(token);
  if (!phone) {
    await telegram.sendMessage(
      chatId,
      'Ссылка устарела. Вернись в профиль на сайте и нажми «Войти по телефону» ещё раз:\n' +
        SITE +
        '/profile.html'
    );
    return;
  }

  var user = await identity.ensureTelegramUser(from);
  var claimed = await identity.claimOrdersByPhone(user.id, phone, chatId);
  await identity.claimTelegramOrders(user.id, from.id, chatId);

  await telegram.sendMessage(
    chatId,
    'Привет' +
      (name ? ', ' + name : '') +
      ' ✨\n\nТелефон ' +
      phone +
      ' подтверждён через этот Telegram.\n' +
      (claimed.length
        ? 'Нашли заказов: ' + claimed.length + '.\n'
        : 'Заказов по этому номеру пока не видно — если платил(а) с другого номера, напиши /menu или открой ссылку из оплаты.\n')
  );
  await sendWebsiteLoginLink(chatId, user, name);
  await sendUserLibrary(chatId, from, name);
}

function readJson(req) {
  return sec.readJson(req);
}

async function sendUserLibrary(chatId, from, greetingName) {
  var user = await identity.ensureTelegramUser(from);
  if (user) {
    await identity.claimTelegramOrders(user.id, from && from.id, chatId);
  }

  var ready = await identity.listReadyReadingsForChat(chatId, user && user.id);
  var pending = await identity.listPendingReadingsForChat(chatId, user && user.id);

  if (ready.length) {
    await telegram.sendMessage(
      chatId,
      'Привет' + (greetingName ? ', ' + greetingName : '') + ' ✨\n\n' +
        'У тебя уже есть ' + ready.length + ' ' + (ready.length === 1 ? 'разбор' : 'разбора') +
        '. Открываю меню.\n\nПрофиль: ' + SITE + '/profile.html'
    );
    for (var i = 0; i < ready.length; i++) {
      await readings.sendReadingMenu(chatId, ready[i].id);
    }
    return true;
  }

  if (pending.length) {
    await telegram.sendMessage(
      chatId,
      'Привет' + (greetingName ? ', ' + greetingName : '') + ' ✨\n\n' +
        'Разбор ещё готовится (' + pending.length + '). Обычно 10–30 минут.'
    );
    return true;
  }

  return false;
}

async function handleCallback(cq) {
  var data = String(cq.data || '');
  var chatId = cq.message && cq.message.chat && cq.message.chat.id;
  var messageId = cq.message && cq.message.message_id;
  if (!chatId) return;

  await telegram.answerCallbackQuery(cq.id);
  if (data === 'noop') return;

  var parts = data.split(':');
  var action = parts[0];
  var readingId = parts[1];
  var page = parts[2];

  if (action === 'tgok') {
    await telegram.sendMessage(chatId, 'Отлично. Работаем с этим Telegram — разборы придут сюда.');
    return;
  }

  if (!readingId) {
    await telegram.sendMessage(chatId, 'Не понял команду.');
    return;
  }

  if (action === 'menu') {
    await readings.sendReadingMenu(chatId, readingId, messageId);
    return;
  }
  if (action === 'page') {
    await readings.sendReadingPage(chatId, readingId, page || 1, messageId);
    return;
  }
  if (action === 'text') {
    await readings.sendReadingFullText(chatId, readingId);
    return;
  }
  if (action === 'html') {
    await readings.sendReadingHtml(chatId, readingId);
    return;
  }
  if (action === 'pdf') {
    await readings.sendReadingPdf(chatId, readingId);
    return;
  }
}

async function handler(req, res) {
  if (req.method === 'GET') {
    sec.json(res, 200, { ok: true, bot: telegram.botUsername() });
    return;
  }

  try {
    var update = await readJson(req);

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    var message = update.message || update.edited_message;
    if (message && message.chat && message.text) {
      var chatId = message.chat.id;
      var text = String(message.text || '');
      var from = message.from || {};
      var username = from.username ? '@' + from.username : '';
      var name = [from.first_name, from.last_name].filter(Boolean).join(' ');

      if (/^\/start(?:\s+|$)/.test(text)) {
        var payload = text.replace(/^\/start\s*/, '').trim();

        var user = await identity.ensureTelegramUser(from);
        if (user) {
          await identity.claimTelegramOrders(user.id, from.id, chatId);
        }

        if (payload && payload.charAt(0) === 'p' && contact.verifyPhoneVerifyToken(payload)) {
          await handlePhoneVerifyStart(chatId, from, name, payload);
        } else if (payload && payload.indexOf('veluna-') === 0) {
          var order = await orders.linkTelegramToOrder(payload, chatId, from);
          if (!order) {
            await telegram.sendMessage(chatId, 'Заказ не найден. Проверь ссылку с сайта или напиши /menu.');
          } else if (order.status === 'paid') {
            await handlePaidOrderStart(chatId, from, name, payload, order);
          } else {
            await telegram.sendMessage(
              chatId,
              'Привет' + (name ? ', ' + name : '') + ' ✨\n\nЗаказ ' + payload + ' ещё не оплачен.'
            );
          }
        } else if (payload === 'login' || payload === 'auth' || payload === 'site') {
          await sendWebsiteLoginLink(chatId, user, name);
          await sendUserLibrary(chatId, from, name);
        } else {
          var known = await sendUserLibrary(chatId, from, name);
          if (!known) {
            await telegram.sendMessage(
              chatId,
              'Привет' + (name ? ', ' + name : '') + ' ✨\n\n' +
                'Это SoulMetrica. Я запомнил твой Telegram.\n\n' +
                'После оплаты на сайте тебя перенаправит сюда — привяжем заказ.\n' +
                'Войти на сайт: ' + SITE + '/profile.html\n\n' +
                'Команды: /menu — мои разборы · /start login — ссылка входа'
            );
          }
        }

        await telegram.notifyAdmin(
          '👤 Telegram /start\nPayload: ' + (payload || '—') + '\nChat: ' + chatId + '\n' + (username || name)
        );
      } else if (/^\/(menu|razbor|разбор|library)/i.test(text)) {
        var opened = await sendUserLibrary(chatId, from, name);
        if (!opened) {
          await telegram.sendMessage(
            chatId,
            'Пока нет готовых разборов.\nСделай заказ на сайте и открой ссылку из оплаты: ' + SITE
          );
        }
      } else if (/^\/help/.test(text)) {
        await telegram.sendMessage(
          chatId,
          'Команды:\n/start — войти / открыть разборы\n/menu — мои разборы\n\n' +
            'В меню: PDF, чтение по главам, весь текст.\n' +
            'Профиль: ' + SITE + '/profile.html'
        );
      } else {
        var hasLib = await sendUserLibrary(chatId, from, name);
        if (!hasLib) {
          await telegram.sendMessage(chatId, 'Напиши /menu или зайди в профиль: ' + SITE + '/profile.html');
        }
      }
    }
  } catch (err) {
    console.error('[telegram-bot]', err);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: true }));
}

module.exports = handler;
module.exports.default = handler;
