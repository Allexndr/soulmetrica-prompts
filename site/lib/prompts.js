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

var TITLES_EN = {
  A01: 'Personal Express Reading',
  A02: 'Money Code',
  A03: 'Love Scenario',
  A04: 'Realization',
  A05: 'Hidden Blocks',
  A06: 'Couple Compatibility',
  A07: 'Full Personality Reading',
  A08: '2026 Forecast',
  A09: 'Child Reading'
};

var BLOCK_TITLES_EN = {
  A01: ['Cover', 'Introduction', 'Core Personality', 'Strengths', 'Hidden Block', 'Money Scenario', 'Intimacy Scenario', 'Final Insight and Choice Point'],
  A02: ['Cover', 'Introduction', 'Money Archetype', 'How Money Reaches You', 'Money Roles', 'Fields and Directions', 'Money Ceiling', 'Hidden Money Blocks', 'Your Money Year: 2026', 'Activation and Choice Point'],
  A03: ['Cover', 'Introduction', 'Intimacy Scenario', 'The Magnet: Who Draws You In', 'The Match: Who Suits You', 'Relationship Phases', 'What You Unconsciously Do With Intimacy', 'Emotional and Sexual Scenario', 'The Relationship Lesson', 'Activation and Choice Point'],
  A04: ['Cover', 'Introduction', 'Realization Archetype', 'Zone of Genius', 'Three Precise Niches', 'Your Role and Work Style', 'The Environment That Helps You Grow', 'Growth Map: 5 / 10 / 20 Years', 'What Blocks Your Realization', 'Activation and Choice Point'],
  A05: ['Cover', 'Introduction', 'The Main Family Pattern', 'Four Key Blocks by Life Area', 'Self-Sabotage', 'Activation Triggers', 'The Ages When the Pattern Formed', 'The Core Lesson', 'How to Switch the Pattern Off', 'Activation and Choice Point'],
  A06: ['Couple Cover', 'Introduction', 'Your Couple Type', 'Dynamics: Who Leads and Who Follows', 'Points of Attraction', 'Points of Friction', 'Emotional and Sexual Compatibility', 'Money and Daily Life as a Couple', 'The Couple Forecast: 1–3 Years', 'Activation and Choice Point'],
  A07: ['Cover', 'Expanded Introduction', 'Core Personality', 'Talents and Zone of Genius', 'Full Money Map', 'Full Love Map', 'Map of Hidden Blocks', 'Life Cycles: Four Peaks', 'Age Map', '2026 Forecast', 'Five-Year Horizon', 'Life Mission and Choice Point'],
  A08: ['Cover', 'Introduction', 'Your 2026 Year Type', 'Forecast by Phases of the Year', 'Money in 2026', 'Love and Relationships in 2026', 'Work and Realization in 2026', 'The Main Window of the Year', 'The Main Risk and Turning Point', 'Choice Point and What 2026 Sets in Motion'],
  A09: ['Cover', 'Introduction', 'The Child’s Nature', 'Inborn Talents', 'How the Child Learns and Thinks', 'Emotional World and What the Child Needs', 'Challenges and Growth Areas', 'The Main Parenting Mistakes to Avoid', 'Age Development Map', 'The Child’s Nature and Your Role']
};

function orderLanguage(order) {
  return order &&
    (order.language === 'en' || (order.payment_meta && order.payment_meta.language === 'en'))
    ? 'en'
    : 'ru';
}

function titleForKey(key, language) {
  return language === 'en' ? TITLES_EN[key] || TITLES[key] : TITLES[key];
}

function blockTitleFor(key, block, language) {
  if (language !== 'en') return block.title;
  var titles = BLOCK_TITLES_EN[key] || [];
  return titles[Math.max(0, Number(block.num || 1) - 1)] || 'Chapter ' + Number(block.num || 1);
}

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
  if (!d || !mo || !y) return orderLanguage(order) === 'en' ? 'not provided' : 'не указана';
  return String(d).padStart(2, '0') + '.' + String(mo).padStart(2, '0') + '.' + y;
}

function buildUserContext(order) {
  var language = orderLanguage(order);
  if (language === 'en') {
    var genderEn =
      order.gender === 'male' ? 'male' : order.gender === 'female' ? 'female' : 'not provided';
    var timeEn = order.birth_time || 'not provided';
    var placeEn = order.birth_city || 'not provided';
    return (
      'OUTPUT LANGUAGE: ENGLISH ONLY. Translate all concepts and chapter content into natural English. ' +
      'Do not use Russian or mix languages.\n' +
      'Client data: Name ' +
      (order.customer_name || 'Client') +
      ' — birth date ' +
      formatDate(order) +
      ' — gender ' +
      genderEn +
      ' — birth time ' +
      timeEn +
      ' — birth place ' +
      placeEn +
      '.\nIf birth time or place is missing, follow the v12 data-degradation rule. Do not invent an Ascendant or Human Design data.\n' +
      (order.contact ? 'Contact: ' + order.contact + '\n' : '')
    );
  }
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

function blockRequest(systemPrompt, userContext, block, language) {
  if (language === 'en') {
    return (
      userContext +
      '\n\nGenerate ONLY this chapter of the v12 reading.\n' +
      'STRICT FORMAT RULES:\n' +
      '1) English only. No Russian words and no mixed language.\n' +
      '2) No markdown: no # ## ### ** __ ` or ---.\n' +
      '3) Do not repeat the chapter heading or chapter number.\n' +
      '4) No placeholders. Use the client name exactly as provided.\n' +
      '5) Style: clear, dense, direct and warm. Address the reader as “you”. Use short paragraphs.\n' +
      '6) Do not name source systems or expose calculations. Do not invent Ascendant/Human Design data.\n' +
      '7) End with one anchor sentence in quotation marks, without a label.\n' +
      '8) The source specification below is in Russian; follow its meaning but write the entire response in fluent English.\n\n' +
      block.body
    );
  }
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

function jsonFullRequest(userContext, language) {
  var readingJson = require('./reading-json');
  if (language === 'en') {
    return (
      userContext +
      '\n\nGenerate the COMPLETE A07 reading in ENGLISH ONLY.\n' +
      readingJson.JSON_OUTPUT_WRAPPER +
      '\n\nReturn valid JSON only. Every user-visible field must be natural English: cover title, subtitle, epigraph, eyebrow, chapter title, lead, paragraphs, anchor, bridge and captions. ' +
      'The blocks array contains 11 body chapters. Keep diagram identifiers unchanged: arc, radar, triad, forces, money, null, axis, life, ages, year, null, map.'
    );
  }
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
  var language = orderLanguage(order);
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
      title: blockTitleFor(mainKey, block, language)
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

    var moduleTitle = titleForKey(key, language) || String(addon || '').trim() || key;
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
        title: (language === 'en' ? 'Module · ' : 'Модуль · ') + moduleTitle,
        body: ''
      },
      title: (language === 'en' ? 'Module · ' : 'Модуль · ') + moduleTitle
    });

    contentBlocks.forEach(function (block) {
      pushBlock({
        productKey: key,
        kind: 'addon',
        moduleTitle: moduleTitle,
        block: block,
        title: moduleTitle + ' · ' + blockTitleFor(key, block, language)
      });
    });
  });

  return {
    mainKey: mainKey,
    mainTitle: titleForKey(mainKey, language) || order.product,
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
  TITLES_EN,
  orderLanguage,
  titleForKey,
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
