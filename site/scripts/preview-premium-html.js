'use strict';

/**
 * Локальный превью premium HTML из reading в БД или из blocks JSON.
 * node scripts/preview-premium-html.js [readingId]
 */

var fs = require('fs');
var path = require('path');

var readingJson = require('../lib/reading-json');
var renderPremium = require('../lib/render-premium');
var htmlReading = require('../lib/html-reading');

async function main() {
  var readingId = process.argv[2];
  var outPath = path.join(__dirname, '..', 'tmp', 'preview-premium.html');

  if (readingId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    var { createClient } = require('@supabase/supabase-js');
    var db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    var { data: reading } = await db.from('readings').select('*').eq('id', readingId).single();
    if (!reading) throw new Error('Reading not found: ' + readingId);
    var { data: order } = await db.from('orders').select('*').eq('id', reading.order_id).single();
    var html = htmlReading.buildReadingHtml(reading, order || {});
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.log('Wrote', outPath, '(' + html.length + ' chars)');
    return;
  }

  var sample = {
    product_key: 'A07',
    title: 'Полный разбор личности',
    blocks_content: [
      {
        num: 1,
        title: 'ОБЛОЖКА',
        text:
          'Карта из двенадцати слоёв — характер, талант, деньги, любовь, блоки, циклы.\n\n«Ты не боишься начинать. Ты боишься остаться там, где начал.»'
      },
      {
        num: 2,
        title: 'РАЗВЁРНУТОЕ ВВЕДЕНИЕ',
        text:
          'Есть в тебе одна вещь, которую замечают почти все: ты появляешься — и пространство сдвигается к тебе.\n\nЗдесь мы назовём то, что повторяется. Паттерн в деньгах, в близости, в деле — это не три разных паттерна. Это один.\n\nЧитай медленно. Особенно там, где захочется пролистнуть.\n\n«Ты силён во всём, что можно начать.»\n\nЭто контур снаружи. Теперь — вглубь.'
      },
      {
        num: 3,
        title: 'ЯДРО ЛИЧНОСТИ',
        text:
          'Если свести тебя к одной точке: ты — исследователь с телом лидера.\n\nГлавный конфликт — между простором и опорой.\n\n«Тебе легко войти в любую комнату — и трудно остаться в одной.»\n\nИз ядра растёт всё остальное. Дальше — по слоям.'
      }
    ]
  };
  var order = { customer_name: 'Александр', birth_day: 14, birth_month: 2, birth_year: 1998 };
  var data = readingJson.assembleFromReading(sample, order);
  var html = renderPremium.buildPremiumHtml(data, order);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote sample', outPath, '(' + html.length + ' chars)');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
