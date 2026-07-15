'use strict';

var https = require('https');

function env(name, fallback) {
  var v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

function tgRequest(method, payload) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Promise.resolve({ ok: false, skipped: true, description: 'no TELEGRAM_BOT_TOKEN' });
  }
  var body = JSON.stringify(payload || {});
  return new Promise(function (resolve, reject) {
    var req = https.request(
      {
        hostname: 'api.telegram.org',
        path: '/bot' + token + '/' + method,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 30000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          var raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve({ ok: false, description: raw.slice(0, 300) });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error('Telegram timeout'));
    });
    req.write(body);
    req.end();
  });
}

function sendMessage(chatId, text, extra) {
  var payload = Object.assign(
    {
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true
    },
    extra || {}
  );
  return tgRequest('sendMessage', payload);
}

function answerCallbackQuery(id, text) {
  return tgRequest('answerCallbackQuery', {
    callback_query_id: id,
    text: text || undefined,
    show_alert: false
  });
}

function editMessageText(chatId, messageId, text, extra) {
  var payload = Object.assign(
    {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      disable_web_page_preview: true
    },
    extra || {}
  );
  return tgRequest('editMessageText', payload);
}

function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  return tgRequest('editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup || { inline_keyboard: [] }
  });
}

function notifyAdmin(text) {
  var chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chat) {
    console.log('[telegram-admin-skip]', text.slice(0, 500));
    return Promise.resolve({ ok: false, skipped: true });
  }
  return sendMessage(chat, text);
}

function botUsername() {
  return env('TELEGRAM_BOT_USERNAME', 'soulmetrica_bot').replace(/^@/, '');
}

function deepLink(orderId) {
  return 'https://telegram.me/' + botUsername() + '?start=' + encodeURIComponent(String(orderId || ''));
}

function phoneVerifyDeepLink(token) {
  return 'https://telegram.me/' + botUsername() + '?start=' + encodeURIComponent(String(token || ''));
}

function sendDocument(chatId, documentUrl, caption) {
  return tgRequest('sendDocument', {
    chat_id: chatId,
    document: documentUrl,
    caption: caption ? String(caption).slice(0, 200) : undefined
  });
}

function uploadDocumentBuffer(chatId, buffer, filename, caption) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Promise.resolve({ ok: false, skipped: true });
  }

  var boundary = '----Veluna' + Date.now();
  var chunks = [];

  function pushField(name, value) {
    chunks.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"\r\n\r\n' + value + '\r\n'));
  }

  pushField('chat_id', String(chatId));
  if (caption) pushField('caption', String(caption).slice(0, 200));

  chunks.push(
    Buffer.from(
      '--' +
        boundary +
        '\r\nContent-Disposition: form-data; name="document"; filename="' +
        filename.replace(/"/g, '') +
        '"\r\nContent-Type: application/pdf\r\n\r\n'
    )
  );
  chunks.push(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  chunks.push(Buffer.from('\r\n--' + boundary + '--\r\n'));

  var body = Buffer.concat(chunks);

  return new Promise(function (resolve, reject) {
    var req = https.request(
      {
        hostname: 'api.telegram.org',
        path: '/bot' + token + '/sendDocument',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': body.length
        },
        timeout: 60000
      },
      function (res) {
        var out = [];
        res.on('data', function (c) {
          out.push(c);
        });
        res.on('end', function () {
          var raw = Buffer.concat(out).toString('utf8');
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            resolve({ ok: false, description: raw.slice(0, 300) });
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error('Telegram upload timeout'));
    });
    req.write(body);
    req.end();
  });
}

function readingMenuKeyboard(readingId, siteUrl, premium) {
  var id = String(readingId);
  var rows = [];
  if (siteUrl) {
    rows.push([{ text: '🌐 Открыть на сайте', url: siteUrl }]);
  }
  rows.push([
    { text: '📥 Скачать HTML', callback_data: 'html:' + id },
    { text: '📄 Скачать PDF', callback_data: 'pdf:' + id }
  ]);
  rows.push([
    { text: '📖 Читать по главам', callback_data: 'page:' + id + ':1' },
    { text: '📝 Весь текст', callback_data: 'text:' + id }
  ]);
  return { inline_keyboard: rows };
}

function readingDeliveryText(reading, opts) {
  opts = opts || {};
  var title = (reading && reading.title) || 'Разбор';
  var premium = !!opts.premium;
  var lines = ['✨ «' + title + '» готов'];

  if (opts.orderId) lines.push('Заказ: ' + opts.orderId);
  if (opts.chapters) lines.push('Глав: ' + opts.chapters);

  lines.push('');
  if (premium) {
    lines.push('🌐 Открыть на сайте — профиль и premium-вёрстка');
    lines.push('📥 Скачать HTML · 📄 Скачать PDF');
    lines.push('📖 По главам · 📝 Весь текст — кнопки ниже');
  } else {
    lines.push('🌐 Открыть на сайте · 📥 HTML · 📄 PDF');
    lines.push('📖 По главам · 📝 Весь текст — кнопки ниже');
  }

  return lines.join('\n');
}

function pageKeyboard(readingId, page, total) {
  var id = String(readingId);
  var row = [];
  if (page > 1) row.push({ text: '← Назад', callback_data: 'page:' + id + ':' + (page - 1) });
  row.push({ text: page + ' / ' + total, callback_data: 'noop' });
  if (page < total) row.push({ text: 'Далее →', callback_data: 'page:' + id + ':' + (page + 1) });
  return {
    inline_keyboard: [
      row,
      [
        { text: '📄 PDF', callback_data: 'pdf:' + id },
        { text: '☰ Меню', callback_data: 'menu:' + id }
      ]
    ]
  };
}

module.exports = {
  env: env,
  tgRequest: tgRequest,
  sendMessage: sendMessage,
  sendDocument: sendDocument,
  uploadDocumentBuffer: uploadDocumentBuffer,
  answerCallbackQuery: answerCallbackQuery,
  editMessageText: editMessageText,
  editMessageReplyMarkup: editMessageReplyMarkup,
  notifyAdmin: notifyAdmin,
  botUsername: botUsername,
  deepLink: deepLink,
  phoneVerifyDeepLink: phoneVerifyDeepLink,
  readingMenuKeyboard: readingMenuKeyboard,
  readingDeliveryText: readingDeliveryText,
  pageKeyboard: pageKeyboard
};
