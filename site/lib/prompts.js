'use strict';

var fs = require('fs');
var path = require('path');

var PRODUCT_MAP = {
  'число судьбы': 'A01',
  'персональный экспресс': 'A01',
  'трипваер': 'A01',
  'денежный код': 'A02',
  'сценарий любви': 'A03',
  'реализация': 'A04',
  'скрытые блоки': 'A05',
  'совместимость': 'A06',
  'совместимость пары': 'A06',
  'полный разбор': 'A07',
  'ты — целиком': 'A07',
  'ты - целиком': 'A07',
  'прогноз 2026': 'A08',
  'детский разбор': 'A09',
  'ребёнок': 'A09'
};

var PROMPT_FILES = {
  A01: 'A01_tripwire.md',
  A02: 'A02_money_code.md',
  A03: 'A03_love_scenario.md',
  A04: 'A04_realization.md',
  A05: 'A05_blocks.md',
  A06: 'A06_compatibility.md',
  A07: 'A07_full_reading_v12.md',
  A08: 'A08_forecast_2026.md',
  A09: 'A09_child_reading.md'
};

var ENGINE_FILE = '00_ДВИЖОК_v12_источник_правды.md';

var TITLES = {
  A01: 'Персональный экспресс-разбор',
  A02: 'Денежный код',
  A03: 'Сценарий любви',
  A04: 'Реализация',
  A05: 'Скрытые блоки',
  A06: 'Совместимость пары',
  A07: 'Полный разбор личности',
  A08: 'Прогноз 2026',
  A09: 'Детский разбор'
};

function normalizeProduct(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .trim();
}

function resolveProductKey(productName) {
  var n = normalizeProduct(productName);
  if (PRODUCT_MAP[n]) return PRODUCT_MAP[n];
  var keys = Object.keys(PRODUCT_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (n.indexOf(keys[i]) !== -1 || keys[i].indexOf(n) !== -1) {
      return PRODUCT_MAP[keys[i]];
    }
  }
  return 'A07';
}

function promptsDir() {
  return path.join(__dirname, 'prompts');
}

function loadEnginePrompt() {
  try {
    return fs.readFileSync(path.join(promptsDir(), ENGINE_FILE), 'utf8');
  } catch (e) {
    return '';
  }
}

function loadPromptFile(key) {
  var file = PROMPT_FILES[key];
  if (!file) throw new Error('Unknown prompt key: ' + key);
  return fs.readFileSync(path.join(promptsDir(), file), 'utf8');
}

function extractSystemPrompt(md) {
  var start = md.indexOf('## 🧠 СИСТЕМНЫЙ ПРОМТ');
  if (start === -1) return md.slice(0, 4000);
  var rest = md.slice(start);
  var end = rest.search(/\n---\n\n## 1\./);
  if (end === -1) end = rest.search(/\n## 1\./);
  var system = end === -1 ? rest : rest.slice(0, end);
  var engine = loadEnginePrompt();
  if (engine) {
    var degradation = engine.match(/правил[ао] деградации[\s\S]{0,1200}/i);
    if (degradation) {
      system += '\n\n---\n\n### КАНОН v12 (деградация данных)\n' + degradation[0].trim();
    }
  }
  return system;
}

function parseBlocks(md) {
  var blocks = [];
  var re = /^## (\d+)\.\s+(.+)$/gm;
  var matches = [];
  var m;
  while ((m = re.exec(md)) !== null) {
    matches.push({ index: m.index, num: +m[1], title: m[2].trim() });
  }
  for (var i = 0; i < matches.length; i++) {
    var cur = matches[i];
    var next = matches[i + 1];
    var body = md.slice(cur.index, next ? next.index : md.length);
    blocks.push({
      num: cur.num,
      title: cur.title,
      body: body.trim()
    });
  }
  return blocks;
}

function formatDate(order) {
  var d = order.birth_day;
  var mo = order.birth_month;
  var y = order.birth_year;
  if (!d || !mo || !y) return 'не указана';
  return String(d).padStart(2, '0') + '.' + String(mo).padStart(2, '0') + '.' + y;
}

function buildUserContext(order) {
  var gender =
    order.gender === 'male' ? 'мужской' : order.gender === 'female' ? 'женский' : 'не указан';
  var time = order.birth_time ? order.birth_time : 'не указано';
  var place = order.birth_city ? order.birth_city : 'не указано';
  return (
    'Данные: Имя ' +
    (order.customer_name || 'Клиент') +
    ' — дата ' +
    formatDate(order) +
    ' — пол ' +
    gender +
    ' — время ' +
    time +
    ' — место ' +
    place +
    '.\n' +
    'Если время и место не указаны — работай по правилу деградации данных v12 (без выдуманного Asc/HD).\n' +
    (order.contact ? 'Контакт: ' + order.contact + '\n' : '')
  );
}

function blockRequest(systemPrompt, userContext, block) {
  return (
    userContext +
    '\n\nСгенерируй ТОЛЬКО этот блок разбора (v12).\n' +
    'ЖЁСТКИЕ ПРАВИЛА ФОРМАТА:\n' +
    '1) Только русский язык. Без английских слов, без смеси языков.\n' +
    '2) Без markdown: никаких # ## ### ** __ ` ---\n' +
    '3) Не дублируй заголовок блока. Не пиши номер главы повторно.\n' +
    '4) Без плейсхолдеров вроде {name}, {avav}. Используй имя из данных как есть (с заглавной).\n' +
    '5) Стиль: чётко, тезисно, плотно. На «ты». Короткие абзацы.\n' +
    '6) Не называй системы и числа. Не выдумывай Asc/HD без времени и места.\n' +
    '7) Якорную фразу дай одной строкой в кавычках в конце блока, без подписи «якорная фраза».\n\n' +
    block.body
  );
}

function jsonFullRequest(userContext) {
  var readingJson = require('./reading-json');
  return (
    userContext +
    '\n\nСгенерируй ПОЛНЫЙ разбор A07 целиком.\n' +
    readingJson.JSON_OUTPUT_WRAPPER +
    '\n\nСхема blocks[11]: num (римская I–XI), eyebrow, title, paragraphs[], lead, anchor, bridge, diagram.\n' +
    'diagram по блокам: arc, radar, triad, forces, money, null, axis, life, ages, year, null, map.\n' +
    'Карта сфер (radar) — отдельный блок после введения с diagram=radar.\n' +
    'Только валидный JSON, без markdown-обёртки.'
  );
}

function productsForOrder(order) {
  var items = [];
  var mainKey = resolveProductKey(order.product);
  items.push({ key: mainKey, title: TITLES[mainKey] || order.product });

  var addons = Array.isArray(order.addons) ? order.addons : [];
  var seen = {};
  seen[mainKey] = true;
  addons.forEach(function (addon) {
    var key = resolveProductKey(addon);
    if (seen[key]) return;
    seen[key] = true;
    items.push({ key: key, title: TITLES[key] || addon });
  });
  return items;
}

module.exports = {
  PRODUCT_MAP,
  TITLES,
  resolveProductKey,
  loadPromptFile,
  extractSystemPrompt,
  parseBlocks,
  buildUserContext,
  productsForOrder,
  blockRequest,
  jsonFullRequest
};
