'use strict';

var telegram = require('../../lib/telegram');
var orders = require('../../lib/orders');
var readings = require('../../lib/readings');
var identity = require('../../lib/identity');
var auth = require('../../lib/auth');
var contact = require('../../lib/contact');
var sec = require('../../lib/security');
var activity = require('../../lib/activity-log');
var { getDb } = require('../../lib/db');

var SITE = process.env.SITE_URL || 'https://yourveluna-theme.vercel.app';

async function langForChat(chatId, order) {
  if (order) return telegram.orderLang(order);
  if (!chatId) return 'ru';
  try {
    var db = getDb();
    var { data } = await db
      .from('orders')
      .select('language, payment_meta')
      .eq('telegram_chat_id', chatId)
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return telegram.orderLang(data);
  } catch (e) {
    return 'ru';
  }
}

async function sendWebsiteLoginLink(chatId, user, greetingName, lang) {
  if (!user || !user.id) return;
  var token = await auth.createSession(user.id);
  var link = SITE + '/api/auth/tg-session?t=' + encodeURIComponent(token);
  var hi = telegram.copy(
    lang,
    'Привет' + (greetingName ? ', ' + greetingName : '') + ' ✨\n\n',
    'Hi' + (greetingName ? ', ' + greetingName : '') + ' ✨\n\n'
  );
  await telegram.sendMessage(
    chatId,
    hi +
      telegram.copy(
        lang,
        'Ссылка в кабинет (30 дней, только для тебя):\n' +
          link +
          '\n\nИли /menu — разборы',
        'Your account link (30 days, just for you):\n' +
          link +
          '\n\nOr /menu — your readings'
      )
  );
}

async function notifyUsernameMismatch(chatId, order, from) {
  var lang = telegram.orderLang(order);
  var claimed = contact.parseTelegramUsername(order && order.contact);
  var actual = (from && from.username ? String(from.username) : '').toLowerCase();
  if (!claimed) return false;
  if (actual && claimed === actual) return false;
  var claimedLabel = '@' + claimed;
  var actualLabel = actual
    ? '@' + actual
    : telegram.copy(lang, 'аккаунт без @ника', 'an account without a @username');
  await telegram.sendMessage(
    chatId,
    telegram.copy(
      lang,
      'На сайте указан ' +
        claimedLabel +
        ', а открыл бота ' +
        actualLabel +
        '.\n\n' +
        'Разбор уйдёт в этот чат — Telegram, которым ты сейчас пишешь, в приоритете. Телефон с формы сохранён.\n\n' +
        'Если это не тот аккаунт — открой ссылку из нужного Telegram:\n' +
        telegram.deepLink(order.id),
      'The site has ' +
        claimedLabel +
        ', but this bot was opened from ' +
        actualLabel +
        '.\n\n' +
        'The reading will go to this chat — the Telegram you are writing from takes priority. The phone from the form is saved.\n\n' +
        'If this is the wrong account, open the link from the correct Telegram:\n' +
        telegram.deepLink(order.id)
    ),
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: telegram.copy(lang, 'Ок, этот Telegram мой', 'OK, this Telegram is mine'),
              callback_data: 'tgok:' + order.id
            }
          ],
          [
            {
              text: telegram.copy(lang, 'Открыть снова из другого TG', 'Open again from another TG'),
              url: telegram.deepLink(order.id)
            }
          ]
        ]
      }
    }
  );
  return true;
}

async function handlePaidOrderStart(chatId, from, name, orderId, order) {
  var lang = telegram.orderLang(order);
  var mismatched = await notifyUsernameMismatch(chatId, order, from);
  if (!mismatched) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Привет' +
          (name ? ', ' + name : '') +
          ' ✨\n\nЗаказ привязан к этому Telegram. Телефон с формы сохранён.',
        'Hi' +
          (name ? ', ' + name : '') +
          ' ✨\n\nYour order is linked to this Telegram. The phone from the form is saved.'
      )
    );
  }

  var user = await identity.ensureTelegramUser(from);
  if (user) await sendWebsiteLoginLink(chatId, user, name, lang);

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
    await telegram.sendMessage(
      chatId,
      telegram.copy(lang, 'Вот твой разбор:', 'Here is your reading:')
    );
    for (var i = 0; i < ready.length; i++) {
      await readings.sendReadingMenu(chatId, ready[i].id);
    }
  } else if (pending.length) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Оплата принята. Готовим разбор — обычно 10–30 минут.',
        'Payment received. We are preparing your reading — usually 10–30 minutes.'
      )
    );
  } else {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Оплата принята. Запускаю подготовку разбора…',
        'Payment received. Starting your reading…'
      )
    );
    await readings.startOrderPipeline(orderId);
  }
}

async function handlePhoneVerifyStart(chatId, from, name, token) {
  var lang = await langForChat(chatId, null);
  var phone = contact.verifyPhoneVerifyToken(token);
  if (!phone) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Ссылка устарела. Вернись в профиль на сайте и нажми «Войти по телефону» ещё раз:\n' +
          SITE +
          '/profile.html',
        'This link has expired. Go back to your profile and tap “Sign in with phone” again:\n' +
          SITE +
          '/profile.html'
      )
    );
    return;
  }

  var user = await identity.ensureTelegramUser(from);
  var claimed = await identity.claimOrdersByPhone(user.id, phone, chatId);
  await identity.claimTelegramOrders(user.id, from.id, chatId);
  lang = await langForChat(chatId, null);

  await telegram.sendMessage(
    chatId,
    telegram.copy(
      lang,
      'Привет' +
        (name ? ', ' + name : '') +
        ' ✨\n\nТелефон ' +
        phone +
        ' подтверждён через этот Telegram.\n' +
        (claimed.length
          ? 'Нашли заказов: ' + claimed.length + '.\n'
          : 'Заказов по этому номеру пока не видно — если платил(а) с другого номера, напиши /menu или открой ссылку из оплаты.\n'),
      'Hi' +
        (name ? ', ' + name : '') +
        ' ✨\n\nPhone ' +
        phone +
        ' is verified via this Telegram.\n' +
        (claimed.length
          ? 'Orders found: ' + claimed.length + '.\n'
          : 'No orders for this number yet — if you paid with another number, send /menu or open the link from payment.\n')
    )
  );
  await sendWebsiteLoginLink(chatId, user, name, lang);
  await sendUserLibrary(chatId, from, name, lang);
}

async function sendUserLibrary(chatId, from, greetingName, langHint) {
  var user = await identity.ensureTelegramUser(from);
  if (user) {
    await identity.claimTelegramOrders(user.id, from && from.id, chatId);
  }

  var lang = langHint || (await langForChat(chatId, null));
  var ready = await identity.listReadyReadingsForChat(chatId, user && user.id);
  var pending = await identity.listPendingReadingsForChat(chatId, user && user.id);

  if (ready.length) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Привет' +
          (greetingName ? ', ' + greetingName : '') +
          ' ✨\n\n' +
          'У тебя уже есть ' +
          ready.length +
          ' ' +
          (ready.length === 1 ? 'разбор' : 'разбора') +
          '. Открываю меню.\n\nПрофиль: ' +
          SITE +
          '/profile.html',
        'Hi' +
          (greetingName ? ', ' + greetingName : '') +
          ' ✨\n\n' +
          'You already have ' +
          ready.length +
          ' reading' +
          (ready.length === 1 ? '' : 's') +
          '. Opening the menu.\n\nProfile: ' +
          SITE +
          '/profile.html'
      )
    );
    for (var i = 0; i < ready.length; i++) {
      await readings.sendReadingMenu(chatId, ready[i].id);
    }
    return true;
  }

  if (pending.length) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Привет' +
          (greetingName ? ', ' + greetingName : '') +
          ' ✨\n\n' +
          'Разбор ещё готовится (' +
          pending.length +
          '). Обычно 10–30 минут.',
        'Hi' +
          (greetingName ? ', ' + greetingName : '') +
          ' ✨\n\n' +
          'Your reading is still being prepared (' +
          pending.length +
          '). Usually 10–30 minutes.'
      )
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
  var lang = await langForChat(chatId, null);

  if (action === 'tgok') {
    var orderId = readingId;
    var order = orderId ? await orders.getOrder(orderId) : null;
    lang = telegram.orderLang(order) || lang;
    await telegram.sendMessage(
      chatId,
      telegram.copy(
        lang,
        'Отлично. Работаем с этим Telegram — разборы придут сюда.',
        'Great. We will use this Telegram — readings will arrive here.'
      )
    );
    return;
  }

  if (!readingId) {
    await telegram.sendMessage(
      chatId,
      telegram.copy(lang, 'Не понял команду.', 'I did not understand that command.')
    );
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
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method === 'GET') {
    sec.json(res, 200, { ok: true, bot: true });
    return;
  }

  try {
    var update = await sec.readJson(req);
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
      var lang = await langForChat(chatId, null);

      if (/^\/start(?:\s+|$)/.test(text)) {
        var payload = text.replace(/^\/start\s*/, '').trim();

        var user = await identity.ensureTelegramUser(from);
        if (user) {
          await identity.claimTelegramOrders(user.id, from.id, chatId);
        }

        if (payload && payload.charAt(0) === 'p' && contact.verifyPhoneVerifyToken(payload)) {
          activity.logActivity('tg.start', {
            source: 'tg',
            telegramChatId: chatId,
            contact: username || null,
            step: 'phone_verify'
          });
          await handlePhoneVerifyStart(chatId, from, name, payload);
        } else if (payload && payload.indexOf('veluna-') === 0) {
          var order = await orders.linkTelegramToOrder(payload, chatId, from);
          lang = telegram.orderLang(order) || lang;
          activity.logActivity(order ? 'tg.order_linked' : 'tg.start', {
            source: 'tg',
            telegramChatId: chatId,
            contact: username || null,
            orderId: payload,
            phone: order && order.phone,
            product: order && order.product,
            step: order ? order.status : 'order_missing'
          });
          if (!order) {
            await telegram.sendMessage(
              chatId,
              telegram.copy(
                lang,
                'Заказ не найден. Проверь ссылку с сайта или напиши /menu.',
                'Order not found. Check the link from the website or send /menu.'
              )
            );
          } else if (order.status === 'paid') {
            activity.logActivity('tg.paid_open', {
              source: 'tg',
              telegramChatId: chatId,
              contact: username || null,
              orderId: payload,
              phone: order.phone,
              product: order.product
            });
            await handlePaidOrderStart(chatId, from, name, payload, order);
          } else {
            activity.logActivity('tg.order_unpaid', {
              source: 'tg',
              telegramChatId: chatId,
              contact: username || null,
              orderId: payload,
              phone: order.phone,
              product: order.product
            });
            await telegram.sendMessage(
              chatId,
              telegram.copy(
                lang,
                'Привет' +
                  (name ? ', ' + name : '') +
                  ' ✨\n\nЗаказ ' +
                  payload +
                  ' ещё не оплачен.',
                'Hi' +
                  (name ? ', ' + name : '') +
                  ' ✨\n\nOrder ' +
                  payload +
                  ' is not paid yet.'
              )
            );
          }
        } else if (payload === 'login' || payload === 'auth' || payload === 'site') {
          activity.logActivity('tg.start', {
            source: 'tg',
            telegramChatId: chatId,
            contact: username || null,
            step: 'login'
          });
          await sendWebsiteLoginLink(chatId, user, name, lang);
          await sendUserLibrary(chatId, from, name, lang);
        } else {
          activity.logActivity('tg.start', {
            source: 'tg',
            telegramChatId: chatId,
            contact: username || null,
            step: 'welcome'
          });
          var known = await sendUserLibrary(chatId, from, name, lang);
          if (!known) {
            await telegram.sendMessage(
              chatId,
              telegram.copy(
                lang,
                'Привет' +
                  (name ? ', ' + name : '') +
                  ' ✨\n\n' +
                  'Это SoulMetrica. Я запомнил твой Telegram.\n\n' +
                  'После оплаты на сайте тебя перенаправит сюда — привяжем заказ.\n' +
                  'Войти на сайт: ' +
                  SITE +
                  '/profile.html\n\n' +
                  'Команды: /menu — мои разборы · /start login — ссылка входа',
                'Hi' +
                  (name ? ', ' + name : '') +
                  ' ✨\n\n' +
                  'This is SoulMetrica. I saved your Telegram.\n\n' +
                  'After payment on the site you will be redirected here — we will link the order.\n' +
                  'Sign in: ' +
                  SITE +
                  '/profile.html\n\n' +
                  'Commands: /menu — my readings · /start login — account link'
              )
            );
          }
        }

        await telegram.notifyAdmin(
          '👤 Telegram /start\nPayload: ' + (payload || '—') + '\nChat: ' + chatId + '\n' + (username || name)
        );
      } else if (/^\/(menu|razbor|разбор|library)/i.test(text)) {
        var opened = await sendUserLibrary(chatId, from, name, lang);
        if (!opened) {
          await telegram.sendMessage(
            chatId,
            telegram.copy(
              lang,
              'Пока нет готовых разборов.\nСделай заказ на сайте и открой ссылку из оплаты: ' + SITE,
              'No ready readings yet.\nPlace an order on the site and open the link from payment: ' + SITE
            )
          );
        }
      } else if (/^\/help/.test(text)) {
        await telegram.sendMessage(
          chatId,
          telegram.copy(
            lang,
            'Команды:\n/start — войти / открыть разборы\n/menu — мои разборы\n\n' +
              'В меню: PDF, чтение по главам, весь текст.\n' +
              'Профиль: ' +
              SITE +
              '/profile.html',
            'Commands:\n/start — sign in / open readings\n/menu — my readings\n\n' +
              'In the menu: PDF, read by chapter, full text.\n' +
              'Profile: ' +
              SITE +
              '/profile.html'
          )
        );
      } else {
        var hasLib = await sendUserLibrary(chatId, from, name, lang);
        if (!hasLib) {
          await telegram.sendMessage(
            chatId,
            telegram.copy(
              lang,
              'Напиши /menu или зайди в профиль: ' + SITE + '/profile.html',
              'Send /menu or open your profile: ' + SITE + '/profile.html'
            )
          );
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
