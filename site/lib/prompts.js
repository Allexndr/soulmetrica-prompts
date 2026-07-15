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

var _resolvedPromptsDir = null;

function promptsDir() {
  if (_resolvedPromptsDir) return _resolvedPromptsDir;
  var candidates = [
    // Next/Vercel often executes bundled copies under .next/server/chunks,
    // so __dirname alone cannot find lib/prompts/*.md.
    path.join(process.cwd(), 'lib', 'prompts'),
    path.join(process.cwd(), 'prompts'),
    path.join(__dirname, 'prompts'),
    path.join(__dirname, '..', 'prompts'),
    path.join(__dirname, '..', 'lib', 'prompts'),
    path.join(__dirname, '..', '..', 'lib', 'prompts'),
    path.join(__dirname, '..', '..', '..', 'lib', 'prompts')
  ];
  for (var i = 0; i < candidates.length; i++) {
    try {
      if (fs.existsSync(path.join(candidates[i], PROMPT_FILES.A07))) {
        _resolvedPromptsDir = candidates[i];
        return _resolvedPromptsDir;
      }
    } catch (e) {}
  }
  _resolvedPromptsDir = path.join(process.cwd(), 'lib', 'prompts');
  return _resolvedPromptsDir;
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
  var full = path.join(promptsDir(), file);
  try {
    return fs.readFileSync(full, 'utf8');
  } catch (err) {
    throw new Error(
      'Prompt missing: ' +
        full +
        ' cwd=' +
        process.cwd() +
        ' dirname=' +
        __dirname
    );
  }
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

/**
 * Единый план глав: основной продукт + addon-модули в один документ.
 * У модулей пропускаем обложку и введение (уже есть в основном разборе).
 */
function buildMergedPlan(order) {
  var mainKey = resolveProductKey(order.product);
  var plan = [];
  var displayNum = 0;

  function pushBlock(opts) {
    displayNum += 1;
    plan.push({
      productKey: opts.productKey,
      kind: opts.kind,
      moduleTitle: opts.moduleTitle || null,
      block: opts.block,
      displayNum: displayNum,
      title: opts.title
    });
  }

  var mainBlocks = parseBlocks(loadPromptFile(mainKey));
  mainBlocks.forEach(function (block) {
    pushBlock({
      productKey: mainKey,
      kind: 'main',
      block: block,
      title: block.title
    });
  });

  var addons = Array.isArray(order.addons) ? order.addons : [];
  var seen = {};
  seen[mainKey] = true;

  addons.forEach(function (addon) {
    var key = resolveProductKey(addon);
    if (seen[key]) return;
    // Полный разбор уже покрывает экспресс — трипвайер внутрь A07 не клеим
    if (mainKey === 'A07' && key === 'A01') return;
    seen[key] = true;

    var moduleTitle = String(addon || '').trim() || TITLES[key] || key;
    var blocks = parseBlocks(loadPromptFile(key));
    // Cover + intro already exist in the main doc — glue only depth chapters
    var contentBlocks = blocks.filter(function (b) {
      return Number(b.num) >= 3;
    });
    if (!contentBlocks.length) contentBlocks = blocks.slice(2);

    pushBlock({
      productKey: key,
      kind: 'divider',
      moduleTitle: moduleTitle,
      block: {
        num: 0,
        title: 'Модуль · ' + moduleTitle,
        body: ''
      },
      title: 'Модуль · ' + moduleTitle
    });

    contentBlocks.forEach(function (block) {
      pushBlock({
        productKey: key,
        kind: 'addon',
        moduleTitle: moduleTitle,
        block: block,
        title: moduleTitle + ' · ' + block.title
      });
    });
  });

  return {
    mainKey: mainKey,
    mainTitle: TITLES[mainKey] || order.product,
    addonKeys: Object.keys(seen).filter(function (k) {
      return k !== mainKey;
    }),
    steps: plan
  };
}

function orderHasAddons(order) {
  return Array.isArray(order && order.addons) && order.addons.length > 0;
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
  buildMergedPlan,
  orderHasAddons,
  blockRequest,
  jsonFullRequest
};
