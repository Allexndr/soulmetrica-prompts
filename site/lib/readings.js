'use strict';

var { put } = require('@vercel/blob');
var { getDb } = require('./db');
var prompts = require('./prompts');
var llm = require('./llm');
var telegram = require('./telegram');
var orders = require('./orders');
var format = require('./format-reading');
var pdfReading = require('./pdf-reading');
var htmlToPdf = require('./html-to-pdf');
var htmlReading = require('./html-reading');
var readingJson = require('./reading-json');
var auth = require('./auth');
var sec = require('./security');
var fileName = require('./file-name');

var SITE_URL = process.env.SITE_URL || 'https://yourveluna-theme.vercel.app';

function docUrlFor(readingId) {
  var origin = String((sec.siteOrigin && sec.siteOrigin()) || SITE_URL).replace(/\/$/, '');
  var t = htmlReading.shareToken(readingId);
  return origin + '/api/readings/doc?id=' + encodeURIComponent(readingId) + '&t=' + encodeURIComponent(t);
}

async function siteReadingUrl(readingId, order) {
  var db = getDb();
  var userId = order && order.user_id;
  if (!userId && order && order.telegram_chat_id) {
    var { data: linked } = await db
      .from('orders')
      .select('user_id')
      .eq('telegram_chat_id', order.telegram_chat_id)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    userId = linked && linked.user_id;
  }
  var origin = String((sec.siteOrigin && sec.siteOrigin()) || SITE_URL).replace(/\/$/, '');
  if (userId) {
    var sessionToken = await auth.createSession(userId);
    return (
      origin +
      '/api/auth/tg-reading?t=' +
      encodeURIComponent(sessionToken) +
      '&r=' +
      encodeURIComponent(readingId)
    );
  }
  return (
    origin +
    '/reading.html?id=' +
    encodeURIComponent(readingId) +
    '&t=' +
    encodeURIComponent(htmlReading.shareToken(readingId))
  );
}

function isPremiumReading(reading) {
  return reading && (reading.product_key === 'A07' || /полный разбор/i.test(reading.title || ''));
}

function useJsonMode(reading, order) {
  // С addon-модулями всегда идём по merged plan поблочно — JSON one-shot не знает про склейку
  if (prompts.orderHasAddons(order)) return false;
  return isPremiumReading(reading) && process.env.A07_JSON_MODE === '1';
}

function triggerProcess() {
  var secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return Promise.resolve();
  var url = SITE_URL.replace(/\/$/, '') + '/api/readings/process';
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + secret,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ source: 'trigger' })
  }).catch(function (err) {
    console.error('[readings] trigger', err.message);
  });
}

async function getReading(readingId) {
  var db = getDb();
  var { data, error } = await db.from('readings').select('*').eq('id', readingId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function pickNextReading() {
  var db = getDb();
  var { data } = await db
    .from('readings')
    .select('*')
    .in('status', ['queued', 'generating'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

async function processA07Json(reading) {
  var db = getDb();
  var order = await orders.getOrder(reading.order_id);
  if (!order) throw new Error('Order not found');

  var md = prompts.loadPromptFile(reading.product_key);
  var system = prompts.extractSystemPrompt(md);
  var userPrompt = prompts.jsonFullRequest(prompts.buildUserContext(order));

  await db
    .from('readings')
    .update({ status: 'generating', updated_at: new Date().toISOString() })
    .eq('id', reading.id);

  var raw = await llm.callOpenAI(system, userPrompt, order, null, {
    max_tokens: +(process.env.A07_JSON_MAX_TOKENS || 28000),
    temperature: 0.8
  });
  var parsed = readingJson.parseLlmJson(raw);
  if (!parsed) throw new Error('A07 JSON: не удалось распарсить ответ');

  var valid = readingJson.validateReadingJson(parsed);
  if (!valid.success) {
    throw new Error('A07 JSON: схема не прошла валидацию');
  }

  readingJson.mergeJsonWithOrder(parsed, order);
  var blocks = readingJson.jsonToBlocks(parsed);
  var content = blocks.map(function (b) {
    return {
      num: b.num,
      title: format.chapterTitle(b),
      text: format.cleanText(b.text || '')
    };
  });

  var patch = {
    blocks_done: content.length,
    blocks_total: content.length,
    blocks_content: content,
    content_text: format.cleanFullReading({
      title: reading.title,
      blocks_content: content
    }),
    status: 'ready',
    updated_at: new Date().toISOString()
  };

  var { data: updated } = await db.from('readings').update(patch).eq('id', reading.id).select('*').single();
  await finalizeReading(updated, order, blocks);
  return updated;
}

async function processOneBlock(reading) {
  var db = getDb();
  var order = await orders.getOrder(reading.order_id);
  if (!order) throw new Error('Order not found');

  if (useJsonMode(reading, order) && reading.blocks_done === 0) {
    try {
      return await processA07Json(reading);
    } catch (err) {
      console.error('[readings] A07 JSON fallback to blocks:', err.message);
      await telegram.notifyAdmin('⚠️ A07 JSON mode failed → blocks\n' + reading.id + '\n' + err.message);
    }
  }

  var plan = prompts.buildMergedPlan(order);
  var steps = plan.steps;
  var userContext = prompts.buildUserContext(order);

  if (reading.blocks_done >= steps.length) {
    return finalizeReading(reading, order, steps);
  }

  var step = steps[reading.blocks_done];
  var content = Array.isArray(reading.blocks_content) ? reading.blocks_content.slice() : [];

  await db
    .from('readings')
    .update({
      status: 'generating',
      blocks_total: steps.length,
      updated_at: new Date().toISOString()
    })
    .eq('id', reading.id);

  var text;
  var title = format.chapterTitle({ title: step.title });

  if (step.kind === 'divider') {
    text = format.cleanText(
      'Дальше — расширение «' +
        (step.moduleTitle || title) +
        '». Это отдельный глубокий слой по теме, который ты добавил к основному разбору. Читай как продолжение одной карты, а не как второй файл.'
    );
  } else {
    var md = prompts.loadPromptFile(step.productKey);
    var system = prompts.extractSystemPrompt(md);
    var blockForLlm = Object.assign({}, step.block, { title: step.title });
    var userPrompt = prompts.blockRequest(system, userContext, blockForLlm);
    if (step.kind === 'addon') {
      userPrompt +=
        '\n\nКОНТЕКСТ СКЛЕЙКИ: это модуль «' +
        step.moduleTitle +
        '», который дописывается в основной документ клиента. ' +
        'Не пиши отдельную обложку и не повторяй введение «кто ты». Сразу дай содержание главы. ' +
        'Согласуй тон с уже собранным полным разбором.';
    }
    text = format.cleanText(await llm.callOpenAI(system, userPrompt, order, step.block));
  }

  content.push({
    num: step.displayNum,
    title: title,
    text: text,
    source_key: step.productKey,
    kind: step.kind
  });

  var done = reading.blocks_done + 1;
  var patch = {
    blocks_done: done,
    blocks_total: steps.length,
    blocks_content: content,
    updated_at: new Date().toISOString()
  };

  if (done >= steps.length) {
    patch.content_text = format.cleanFullReading({
      title: reading.title,
      blocks_content: content
    });
    patch.status = 'ready';
  }

  var { data: updated } = await db.from('readings').update(patch).eq('id', reading.id).select('*').single();

  if (updated.status === 'ready') {
    await finalizeReading(updated, order, steps);
  }
  return updated;
}

async function finalizeReading(reading, order, blocksOrSteps) {
  var db = getDb();
  var cleanedBlocks = (Array.isArray(reading.blocks_content) ? reading.blocks_content : [])
    .filter(function (b) {
      return b.num !== 0 && b.title !== '__html__';
    })
    .map(function (b) {
    return {
      num: b.num,
      title: format.chapterTitle(b),
      text: format.cleanText(b.text || ''),
      source_key: b.source_key || null,
      kind: b.kind || null
    };
  });
  var full = format.cleanFullReading({
    title: reading.title,
    blocks_content: cleanedBlocks
  });

  var fileName = 'readings/' + reading.order_id + '-' + reading.product_key + '.txt';
  var blobUrl = reading.file_url || null;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      var uploaded = await put(fileName, full, {
        access: 'public',
        contentType: 'text/plain; charset=utf-8',
        addRandomSuffix: true
      });
      blobUrl = uploaded.url;
    }
  } catch (err) {
    console.error('[readings] blob', err.message);
  }

  // HTML (premium for A07 / classic otherwise) — including glued addon chapters
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      var html = htmlReading.buildReadingHtml(
        Object.assign({}, reading, { blocks_content: cleanedBlocks }),
        order
      );
      var htmlUp = await put(
        'readings/' + reading.id + '-' + require('./file-name').readingFileBase(order || {}, reading.title) + '.html',
        html,
        {
          access: 'public',
          contentType: 'text/html; charset=utf-8',
          addRandomSuffix: false
        }
      );
      cleanedBlocks.unshift({ num: 0, title: '__html__', text: htmlUp.url });
    } catch (err) {
      console.error('[readings] html blob', err.message);
    }
  }

  var total =
    Array.isArray(blocksOrSteps) && blocksOrSteps.length
      ? blocksOrSteps.length
      : cleanedBlocks.filter(function (b) {
          return b.title !== '__html__';
        }).length;

  var { data: updated } = await db
    .from('readings')
    .update({
      status: 'ready',
      content_text: full,
      blocks_content: cleanedBlocks,
      file_url: blobUrl,
      user_id: order.user_id || reading.user_id || null,
      blocks_total: total,
      blocks_done: total,
      updated_at: new Date().toISOString()
    })
    .eq('id', reading.id)
    .select('*')
    .single();

  await deliverToTelegram(updated, order);
  return updated;
}

async function deliverToTelegram(reading, order) {
  if (!order.telegram_chat_id) return;
  if (reading.telegram_delivered_at) return;

  var chatId = order.telegram_chat_id;
  var chapters = format.getChapters(reading);
  var premium = isPremiumReading(reading);
  var siteUrl = await siteReadingUrl(reading.id, order);
  var intro = telegram.readingDeliveryText(reading, {
    orderId: reading.order_id,
    chapters: chapters.length,
    premium: premium
  });

  await telegram.sendMessage(chatId, intro, {
    reply_markup: telegram.readingMenuKeyboard(reading.id, siteUrl, premium)
  });

  var db = getDb();
  await db
    .from('readings')
    .update({ telegram_delivered_at: new Date().toISOString() })
    .eq('id', reading.id);

  await telegram.notifyAdmin(
    '📬 Меню разбора отправлено\n' +
      'Order: ' + reading.order_id + '\n' +
      'Product: ' + reading.title + '\n' +
      'Chat: ' + chatId
  );
}

function pageBody(chapter, total, maxLen) {
  var head = chapter.num + ' / ' + total + ' · ' + chapter.title;
  var body = String(chapter.text || '').trim();
  var limit = maxLen || 3500;
  var room = limit - head.length - 40;
  if (body.length > room) {
    body = body.slice(0, Math.max(0, room - 60));
    var cut = Math.max(body.lastIndexOf('\n\n'), body.lastIndexOf('. '), body.lastIndexOf(' '));
    if (cut > room * 0.5) body = body.slice(0, cut + 1);
    body = body.trim() + '\n\n…полный текст главы — в PDF';
  }
  return head + '\n\n' + body;
}

async function sendOrEdit(chatId, messageId, text, extra) {
  if (messageId) {
    var edited = await telegram.editMessageText(chatId, messageId, text, extra);
    if (edited && edited.ok) return edited;
    // identical content / race — ignore common error, else new message
    if (edited && edited.description && /message is not modified/i.test(edited.description)) {
      return edited;
    }
  }
  return telegram.sendMessage(chatId, text, extra);
}

async function sendReadingMenu(chatId, readingId, messageId) {
  var reading = await getReading(readingId);
  if (!reading || reading.status !== 'ready') {
    await sendOrEdit(chatId, messageId, 'Разбор ещё не готов.');
    return;
  }
  var order = await orders.getOrder(reading.order_id);
  var chapters = format.getChapters(reading);
  var siteUrl = await siteReadingUrl(reading.id, order || {});
  var text = telegram.readingDeliveryText(reading, {
    orderId: reading.order_id,
    chapters: chapters.length,
    premium: isPremiumReading(reading)
  });
  await sendOrEdit(chatId, messageId, text, {
    reply_markup: telegram.readingMenuKeyboard(reading.id, siteUrl, isPremiumReading(reading))
  });
}

async function sendReadingPage(chatId, readingId, page, messageId) {
  var reading = await getReading(readingId);
  if (!reading || reading.status !== 'ready') {
    await sendOrEdit(chatId, messageId, 'Разбор ещё не готов.');
    return;
  }
  var chapters = format.getChapters(reading);
  if (!chapters.length) {
    await sendOrEdit(chatId, messageId, 'В разборе пока нет текста.');
    return;
  }
  var total = chapters.length;
  var idx = Math.min(Math.max(+page || 1, 1), total);
  var chapter = chapters[idx - 1];
  var text = pageBody(chapter, total, 3500);
  await sendOrEdit(chatId, messageId, text, {
    reply_markup: telegram.pageKeyboard(reading.id, idx, total)
  });
}

async function sendReadingFullText(chatId, readingId) {
  var reading = await getReading(readingId);
  if (!reading || reading.status !== 'ready') {
    await telegram.sendMessage(chatId, 'Разбор ещё не готов.');
    return;
  }
  var chapters = format.getChapters(reading);
  await telegram.sendMessage(chatId, 'Отправляю текст по главам…');
  for (var i = 0; i < chapters.length; i++) {
    var parts = format.chunkForTelegram(format.formatChapterPlain(chapters[i], chapters.length), 3500);
    for (var j = 0; j < parts.length; j++) {
      await telegram.sendMessage(chatId, parts[j]);
    }
  }
  var order = await orders.getOrder(reading.order_id);
  await telegram.sendMessage(chatId, 'Готово. Разбор также на сайте в профиле:', {
    reply_markup: telegram.readingMenuKeyboard(
      reading.id,
      await siteReadingUrl(reading.id, order || {}),
      isPremiumReading(reading)
    )
  });
}

async function sendReadingHtml(chatId, readingId) {
  var reading = await getReading(readingId);
  if (!reading || reading.status !== 'ready') {
    await telegram.sendMessage(chatId, 'Разбор ещё не готов.');
    return;
  }
  var order = await orders.getOrder(reading.order_id);
  await telegram.sendMessage(chatId, 'Собираю HTML…');
  var html = htmlReading.buildReadingHtml(reading, order || {});
  var fname = fileName.readingFileName(order || {}, 'html', reading.title);
  var caption = ('SoulMetrica · ' + (reading.title || 'Разбор') + ' · ' + ((order && order.customer_name) || '')).trim();
  return telegram.uploadDocumentBuffer(chatId, Buffer.from(html, 'utf8'), fname, caption);
}

async function sendReadingPdf(chatId, readingId) {
  var reading = await getReading(readingId);
  if (!reading || reading.status !== 'ready') {
    await telegram.sendMessage(chatId, 'Разбор ещё не готов.');
    return;
  }
  var order = await orders.getOrder(reading.order_id);
  var fname = fileName.readingFileName(order || {}, 'pdf', reading.title);
  var caption = ('SoulMetrica · ' + (reading.title || 'Разбор') + ' · ' + ((order && order.customer_name) || '')).trim();

  if (isPremiumReading(reading)) {
    await telegram.sendMessage(chatId, 'Собираю PDF…');
    var html = htmlReading.buildReadingHtml(reading, order || {});
    var pdfBuffer = await htmlToPdf.buildPremiumPdf(reading, order, html);
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        var uploaded = await put('readings/' + reading.id + '-' + fileName.readingFileBase(order || {}, reading.title) + '.pdf', pdfBuffer, {
          access: 'public',
          contentType: 'application/pdf',
          addRandomSuffix: false
        });
        var sent = await telegram.sendDocument(chatId, uploaded.url, caption + ' · PDF');
        if (sent && sent.ok) return sent;
      } catch (err) {
        console.error('[readings] premium pdf blob', err.message);
      }
    }
    return telegram.uploadDocumentBuffer(chatId, pdfBuffer, fname, caption + ' · PDF');
  }

  await telegram.sendMessage(chatId, 'Собираю PDF…');
  var pdfBuffer = await pdfReading.buildReadingPdf(reading, order || {});

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      var uploaded2 = await put(
        'readings/' + reading.order_id + '-' + reading.product_key + '.pdf',
        pdfBuffer,
        {
          access: 'public',
          contentType: 'application/pdf',
          addRandomSuffix: true
        }
      );
      var sent2 = await telegram.sendDocument(chatId, uploaded2.url, caption);
      if (sent2 && sent2.ok) return sent2;
    } catch (err) {
      console.error('[readings] pdf blob', err.message);
    }
  }

  return telegram.uploadDocumentBuffer(chatId, pdfBuffer, fname, caption);
}

async function processQueueStep() {
  var reading = await pickNextReading();
  if (!reading) return { done: true, processed: false };

  try {
    if (reading.status === 'queued' || reading.blocks_done < reading.blocks_total) {
      await processOneBlock(reading);
      return { done: false, processed: true };
    }
    return { done: false, processed: false };
  } catch (err) {
    var db = getDb();
    await db
      .from('readings')
      .update({
        status: 'failed',
        error_message: String(err.message || err).slice(0, 500),
        updated_at: new Date().toISOString()
      })
      .eq('id', reading.id);
    await telegram.notifyAdmin('❌ Ошибка генерации\nReading: ' + reading.id + '\n' + err.message);
    throw err;
  }
}

async function processQueueBudget(budgetMs, maxSteps) {
  var started = Date.now();
  var steps = 0;
  var last = { done: true, processed: false };
  var limit = maxSteps || 2;

  while (steps < limit && Date.now() - started < (budgetMs || 32000)) {
    last = await processQueueStep();
    if (!last.processed) break;
    steps += 1;
  }

  var next = await pickNextReading();
  return {
    done: !next,
    processed: steps > 0,
    steps: steps,
    more: !!next
  };
}

async function startOrderPipeline(orderId) {
  var { payLog, payError } = require('./pay-log');
  var order = await orders.getOrder(orderId);
  if (!order || order.status !== 'paid') {
    payLog('pipeline.skip', {
      orderId: orderId,
      found: !!order,
      status: order && order.status
    });
    return null;
  }
  payLog('pipeline.start', {
    orderId: orderId,
    product: order.product,
    amount: order.amount
  });
  try {
    await orders.enqueueReadings(order);
    payLog('pipeline.enqueued', { orderId: orderId });
  } catch (err) {
    payError('pipeline.enqueue_fail', err, { orderId: orderId });
    throw err;
  }
  // не блокируем HTTP-ответ — генерация в фоне
  try {
    var { waitUntil } = require('@vercel/functions');
    waitUntil(triggerProcess());
  } catch (e) {
    triggerProcess();
  }
  return order;
}

async function deliverPendingForOrder(orderId, chatId) {
  var db = getDb();
  var order = await orders.getOrder(orderId);
  if (!order) return;
  var { data: readings } = await db
    .from('readings')
    .select('*')
    .eq('order_id', orderId)
    .eq('status', 'ready')
    .is('telegram_delivered_at', null);
  if (!readings || !readings.length) return;
  for (var i = 0; i < readings.length; i++) {
    await deliverToTelegram(readings[i], Object.assign({}, order, { telegram_chat_id: chatId }));
  }
}

module.exports = {
  triggerProcess,
  getReading,
  docUrlFor,
  siteReadingUrl,
  isPremiumReading,
  processQueueStep,
  processQueueBudget,
  startOrderPipeline,
  deliverPendingForOrder,
  deliverToTelegram,
  sendReadingMenu,
  sendReadingPage,
  sendReadingFullText,
  sendReadingHtml,
  sendReadingPdf
};
