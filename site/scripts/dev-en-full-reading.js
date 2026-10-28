'use strict';

/**
 * Full English reading flow without payment.
 * Usage: node scripts/dev-en-full-reading.js
 */

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8')
    .split(/\n/)
    .forEach(function (line) {
      line = line.trim();
      if (!line || line[0] === '#') return;
      var i = line.indexOf('=');
      if (i < 1) return;
      var key = line.slice(0, i).trim();
      var val = line.slice(i + 1).trim();
      if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")) {
        val = val.slice(1, -1);
      }
      // Never overwrite a real shell/runtime secret with an empty .env value.
      if (!val) return;
      if (process.env[key] == null || process.env[key] === '') process.env[key] = val;
    });
}

loadEnv(path.join(__dirname, '..', '.env.local'));
loadEnv(path.join(__dirname, '..', '.env.production.local'));

process.env.A07_JSON_MODE = '1';

var orders = require('../lib/orders');
var readings = require('../lib/readings');
var htmlReading = require('../lib/html-reading');
var { getDb } = require('../lib/db');

function uuid() {
  return crypto.randomUUID();
}

async function pauseOthers(exceptId) {
  var db = getDb();
  var { data } = await db
    .from('readings')
    .select('id, status')
    .in('status', ['queued', 'generating'])
    .neq('id', exceptId);
  var paused = [];
  for (var i = 0; i < (data || []).length; i++) {
    var row = data[i];
    paused.push({ id: row.id, status: row.status });
    await db
      .from('readings')
      .update({ status: 'paused_dev', updated_at: new Date().toISOString() })
      .eq('id', row.id);
  }
  return paused;
}

async function restorePaused(paused) {
  var db = getDb();
  for (var i = 0; i < paused.length; i++) {
    await db
      .from('readings')
      .update({ status: paused[i].status, updated_at: new Date().toISOString() })
      .eq('id', paused[i].id);
  }
}

async function main() {
  var orderId = uuid();
  var name = process.argv[2] || 'Alex';
  var day = +(process.argv[3] || 14);
  var month = +(process.argv[4] || 2);
  var year = +(process.argv[5] || 1998);

  console.log('[dev-en] creating order', orderId, { name: name, language: 'en' });

  await orders.upsertPendingOrder({
    id: orderId,
    product: 'Полный разбор',
    addons: [],
    amount: 0,
    currency: 'KZT',
    customerName: name,
    birthDay: day,
    birthMonth: month,
    birthYear: year,
    birthTime: null,
    birthCity: 'London',
    gender: 'female',
    language: 'en',
    paymentMeta: { language: 'en', source: 'dev-en-full-reading' },
    paymentProvider: 'dev'
  });

  var order = await orders.markOrderPaid(orderId, {});
  console.log('[dev-en] marked paid', order && order.language);

  var created = await orders.enqueueReadings(order);
  var readingId = created[0] && created[0].id;
  if (!readingId) throw new Error('No reading enqueued');
  console.log('[dev-en] reading queued', readingId);

  var paused = await pauseOthers(readingId);
  console.log('[dev-en] paused other queue items:', paused.length);

  try {
    var steps = 0;
    var maxSteps = 40;
    while (steps < maxSteps) {
      var current = await readings.getReading(readingId);
      if (!current) throw new Error('Reading disappeared');
      if (current.status === 'ready') break;
      if (current.status === 'failed') throw new Error('Reading failed');

      console.log(
        '[dev-en] process step',
        steps + 1,
        'status=' + current.status,
        'blocks=' + current.blocks_done + '/' + current.blocks_total
      );
      var result = await readings.processQueueStep();
      if (!result.processed) {
        current = await readings.getReading(readingId);
        if (current && current.status === 'ready') break;
        throw new Error('Queue did not process our reading (status=' + (current && current.status) + ')');
      }
      steps += 1;
    }

    var ready = await readings.getReading(readingId);
    if (!ready || ready.status !== 'ready') {
      throw new Error('Reading not ready after ' + steps + ' steps');
    }

    order = await orders.getOrder(orderId);
    var html = htmlReading.buildReadingHtml(ready, order || {});
    var outDir = path.join(__dirname, '..', 'tmp');
    fs.mkdirSync(outDir, { recursive: true });
    var outPath = path.join(outDir, 'en-full-reading-' + readingId.slice(0, 8) + '.html');
    fs.writeFileSync(outPath, html, 'utf8');

    var docUrl = readings.docUrlFor(readingId);
    var cyr = /[А-Яа-яЁё]/.test(html);
    console.log('[dev-en] READY');
    console.log('[dev-en] orderId=', orderId);
    console.log('[dev-en] readingId=', readingId);
    console.log('[dev-en] language=', order && (order.language || (order.payment_meta && order.payment_meta.language)));
    console.log('[dev-en] title=', ready.title);
    console.log('[dev-en] chapters=', (ready.blocks_content || []).filter(function (b) {
      return b.title !== '__html__';
    }).length);
    console.log('[dev-en] htmlChars=', html.length);
    console.log('[dev-en] htmlHasCyrillic=', cyr);
    console.log('[dev-en] demoMode=', /Demo mode|Демо-режим/i.test(html));
    console.log('[dev-en] localHtml=', outPath);
    console.log('[dev-en] shareUrl=', docUrl.replace('yourveluna-theme.vercel.app', 'soulmetrica.com'));
  } finally {
    await restorePaused(paused);
    console.log('[dev-en] restored paused queue items');
  }
}

main().catch(function (err) {
  console.error('[dev-en] FAIL', err && err.stack ? err.stack : err);
  process.exit(1);
});
