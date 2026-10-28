'use strict';

var z = require('zod');
var format = require('./format-reading');
var chartCalc = require('./chart-calc');
var diagramKit = require('./diagram-kit');

function isEnglishOrder(order) {
  return !!(
    order &&
    (order.language === 'en' || (order.payment_meta && order.payment_meta.language === 'en'))
  );
}

var ROMAN = [
  '',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL'
];

var JSON_OUTPUT_WRAPPER =
  '\n\n---\n\nСгенерируй ПОЛНЫЙ разбор и верни его СТРОГО одним JSON-объектом по схеме: ' +
  'cover, spheres[10], cycles, agePoints, peakAge, blocks[11]. Никакого текста вне JSON. ' +
  'Значения spheres — целые 0..10. cycles/agePoints — из расчётов.';

var SphereSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().min(0).max(10)
});

var BlockSchema = z.object({
  num: z.string(),
  eyebrow: z.string().optional(),
  title: z.string(),
  paragraphs: z.array(z.string()),
  lead: z.string().nullable().optional(),
  anchor: z.string().nullable().optional(),
  bridge: z.string().nullable().optional(),
  diagram: z.string().nullable().optional(),
  diagramCaption: z.string().nullable().optional()
});

var ReadingSchema = z.object({
  cover: z.object({
    title: z.string(),
    who: z.string().optional(),
    subtitle: z.string(),
    epigraph: z.string()
  }),
  spheres: z.array(SphereSchema).length(10),
  cycles: z.object({
    b1: z.number(),
    b2: z.number(),
    b3: z.number(),
    challenge: z.number().min(1).max(4)
  }),
  agePoints: z.array(z.string()).min(4),
  peakAge: z.string(),
  blocks: z.array(BlockSchema).min(8)
});

function reduceNum(n) {
  n = Math.abs(Number(n) || 0);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split('')
      .reduce(function (a, b) {
        return a + Number(b);
      }, 0);
  }
  return n;
}

var DIAGRAM_BY_TITLE = [
  { re: /введен|introduction/i, diagram: 'arc' },
  { re: /ядро|core personality/i, diagram: 'triad' },
  { re: /талант|гени|talent|genius/i, diagram: 'forces' },
  { re: /денеж|деньг|money/i, diagram: 'money' },
  { re: /любов|love/i, diagram: null },
  { re: /блок|block/i, diagram: 'axis' },
  { re: /цикл|cycle/i, diagram: 'life' },
  { re: /возраст|age map/i, diagram: 'ages' },
  { re: /прогноз|forecast|2026/i, diagram: 'year' },
  { re: /горизонт|5 лет|пять лет|horizon|five.year/i, diagram: null },
  { re: /мисси|точк|mission|choice point/i, diagram: 'map' }
];

var DEFAULT_CAPTIONS = {
  arc: 'Ты входишь через узнавание — и выходишь через выбор.',
  radar: 'Контур силён там, где движение и новизна — и проседает там, где нужно остаться.',
  triad: 'Снаружи — вес и лёгкость. Внутри — аналитик, который не выключается.',
  forces: 'Третья сила работает без твоего ведома — и именно ей тебя запоминают.',
  money: 'Деньги идут туда, где ты настоящий. Не туда, где ты правильный.',
  axis: 'Ты бросаешь за шаг до финиша — той же лёгкостью, которой входишь.',
  life: 'Самый трудный твой цикл — тот, что учит оставаться.',
  ages: 'В переломном возрасте громче всего звучит то, от чего ты бежишь.',
  year: 'В этом году выигрывает не тот, кто начал, а тот, кто довёл.',
  map: 'Деньги, любовь и дело — не три темы. Это один механизм в трёх костюмах.'
};

var DEFAULT_CAPTIONS_EN = {
  arc: 'You enter through recognition — and leave through choice.',
  radar: 'Your contour is strongest where there is movement and novelty, and softer where staying is required.',
  triad: 'Outside: weight and ease. Inside: an analyst who never fully switches off.',
  forces: 'The third strength works without your awareness — and it is what people remember.',
  money: 'Money follows where you are real, not where you are merely correct.',
  axis: 'You stop one step before the finish with the same ease you use to begin.',
  life: 'Your hardest cycle is the one that teaches you to stay.',
  ages: 'At a turning age, what you run from speaks the loudest.',
  year: 'This year rewards the person who finishes, not merely the person who starts.',
  map: 'Money, love and work are not three topics. They are one mechanism in three forms.'
};

function roman(n) {
  n = +n || 0;
  if (n > 0 && n < ROMAN.length) return ROMAN[n];
  return String(n);
}

function scrubName(text, name) {
  var s = String(text || '');
  s = s.replace(/Абла[йяюе]/gi, name || 'ты');
  s = s.replace(/Ablai?/gi, name || 'ты');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s+([,.!?;:])/g, '$1');
  return s.trim();
}

function parseBlockText(raw, name) {
  var text = scrubName(format.cleanText(raw), name);
  if (!text) {
    return { lead: null, paragraphs: [], anchor: null, bridge: null };
  }

  var chunks = text.split(/\n{2,}/).map(function (c) {
    return c.trim();
  }).filter(Boolean);

  var lead = null;
  var anchor = null;
  var bridge = null;
  var paragraphs = [];

  chunks.forEach(function (c, idx) {
    var flat = c.replace(/\n/g, ' ');
    var isQuote =
      /^[«"]/.test(flat) ||
      (/^[«"].+[»"]$/.test(flat) && flat.length < 240);
    var isBridge =
      idx === chunks.length - 1 &&
      flat.length < 240 &&
      /(дальше|туда|слой|карта|сюда|вглубь|горизонт|финал)/i.test(flat);

    if (isQuote && !anchor) {
      anchor = flat.replace(/^["«]\s*/, '').replace(/\s*["»]$/, '');
      return;
    }
    if (isBridge) {
      bridge = flat;
      return;
    }
    paragraphs.push(c);
  });

  if (paragraphs.length >= 2 && paragraphs[0].length < 180 && !/\.\s+[А-ЯA-Z]/.test(paragraphs[0])) {
    lead = paragraphs.shift();
  }

  return { lead: lead, paragraphs: paragraphs, anchor: anchor, bridge: bridge };
}

function diagramForTitle(title) {
  for (var i = 0; i < DIAGRAM_BY_TITLE.length; i++) {
    if (DIAGRAM_BY_TITLE[i].re.test(title || '')) {
      return DIAGRAM_BY_TITLE[i].diagram;
    }
  }
  return null;
}

function spheresFromOrder(order) {
  var scored = chartCalc.sphereScores(order || {});
  var labelsEn = {
    growth: 'Personal growth',
    health: 'Health',
    finance: 'Finances',
    career: 'Career & work',
    relations: 'Relationships',
    circle: 'Social circle',
    creativity: 'Creativity',
    emotions: 'Emotions',
    home: 'Home & comfort',
    spirit: 'Spirituality'
  };
  return diagramKit.SPHERE_META.map(function (meta, i) {
    var src = scored.spheres[i] || {};
    return {
      key: meta.key,
      label: isEnglishOrder(order) ? labelsEn[meta.key] : meta.label || src.label,
      value: Math.round(scored.strong[i] || 5)
    };
  });
}

function computeCycles(order) {
  var day = Number(order && order.birth_day) || 1;
  var month = Number(order && order.birth_month) || 1;
  var year = Number(order && order.birth_year) || 1990;
  var lp = chartCalc.lifePath(day, month, year);
  var lpCore = lp === 11 || lp === 22 || lp === 33 ? reduceNum(lp) : lp;

  var b1 = 27 + (lpCore % 4);
  var b2 = b1 + 8 + (month % 3);
  var b3 = b2 + 9 + (year % 4);

  var now = new Date().getFullYear();
  var age = now - year;
  var challenge = 2;
  if (age < b1) challenge = 1;
  else if (age < b2) challenge = 2;
  else if (age < b3) challenge = 3;
  else challenge = 4;

  return { b1: b1, b2: b2, b3: b3, challenge: challenge };
}

function computeAgePoints(order, cycles) {
  var b1 = cycles.b1;
  var peak = Math.max(26, b1 - 1);
  return [
    '4–9',
    '12–16',
    '19–24',
    peak + '–' + (peak + 2),
    String(cycles.b2 - 3) + '–' + (cycles.b2 - 1),
    String(cycles.b3 - 5) + '–' + (cycles.b3 - 3)
  ];
}

function talentBars(order) {
  var lp = chartCalc.lifePath(
    Number(order && order.birth_day) || 1,
    Number(order && order.birth_month) || 1,
    Number(order && order.birth_year) || 1990
  );
  var core = lp === 11 || lp === 22 || lp === 33 ? reduceNum(lp) : lp;
  var main = 320 + core * 8;
  var support = 220 + (core % 5) * 14;
  var shadow = 140 + (core % 3) * 12;
  return [Math.min(392, main), Math.min(340, support), Math.min(220, shadow)];
}

function extractCover(chapters, order, reading) {
  var en = isEnglishOrder(order);
  var cover = chapters.find(function (c) {
    return c.num === 1 || /облож|cover/i.test(c.title);
  });
  var name = (order && order.customer_name) || '';
  var who = name ? (en ? 'For ' : 'для ') + name : '';
  var readingTitle = String((reading && reading.title) || '').trim();
  var defaultTitle = readingTitle
    ? readingTitle
    : en
      ? 'Personal Reading'
      : 'Персональный разбор';
  var isFull =
    (reading && reading.product_key === 'A07') ||
    /полный|full personality|full reading/i.test(readingTitle);
  var defaultSubtitle = en
    ? isFull
      ? 'A twelve-layer map of your life — character, talent, money, love, blocks, cycles and mission — and how they support one another.'
      : 'Your personal map — character, strengths, lesson and the next clear step.'
    : isFull
      ? 'Карта из двенадцати слоёв твоей жизни — характер, талант, деньги, любовь, блоки, циклы, миссия — и то, как они держат друг друга.'
      : 'Твоя личная карта — характер, сила, урок и следующий ясный шаг.';
  var subtitle = defaultSubtitle;
  var epigraph = en
    ? '“Read slowly. The part you want to argue with is often the most precise.”'
    : '«Читай медленно. Там, где захочется спорить — обычно самое точное.»';

  if (cover && cover.text) {
    var parts = String(cover.text)
      .split(/\n+/)
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
    parts.forEach(function (p) {
      if (/^[«"“]/.test(p) && (epigraph.indexOf('«') === 0 || epigraph.indexOf('“') === 0)) epigraph = p;
      else if (!subtitle || subtitle === defaultSubtitle) {
        if (p.length > 24 && p.length < 200 && !/^[«"]/.test(p)) subtitle = p;
      }
    });
    var m = cover.text.match(/[«"]([^«»"]{12,200})[»"]/);
    if (m) epigraph = '«' + m[1] + '»';
  }

  return {
    title: defaultTitle,
    who: who,
    subtitle: scrubName(subtitle, name),
    epigraph: scrubName(epigraph, name)
  };
}

function isCoverChapter(ch) {
  return ch.num === 1 || /облож|cover/i.test(ch.title || '');
}

function assembleFromReading(reading, order) {
  order = order || {};
  var name = order.customer_name || '';
  var chapters = format.getChapters(reading);
  var cover = extractCover(chapters, order, reading);
  var spheres = spheresFromOrder(order);
  var cycles = computeCycles(order);
  var agePoints = computeAgePoints(order, cycles);
  var peakAge = agePoints[3] || String(cycles.b1 - 1) + '–' + (cycles.b1 + 1);
  var bars = talentBars(order);

  var body = chapters.filter(function (c) {
    return !isCoverChapter(c);
  });
  if (!body.length) body = chapters;

  var blocks = body.map(function (ch, idx) {
    var parsed = parseBlockText(ch.text, name);
    var diagram = diagramForTitle(ch.title);
    return {
      num: roman(idx + 1),
      eyebrow: (isEnglishOrder(order) ? 'Chapter ' : 'Глава ') + roman(idx + 1),
      title: scrubName(ch.title, name),
      paragraphs: parsed.paragraphs,
      lead: parsed.lead,
      anchor: parsed.anchor,
      bridge: parsed.bridge,
      diagram: diagram,
      diagramCaption:
        diagram
          ? (isEnglishOrder(order) ? DEFAULT_CAPTIONS_EN : DEFAULT_CAPTIONS)[diagram] || null
          : null
    };
  });

  return {
    language: isEnglishOrder(order) ? 'en' : 'ru',
    cover: cover,
    spheres: spheres,
    cycles: cycles,
    agePoints: agePoints,
    peakAge: peakAge,
    bars: bars,
    blocks: blocks
  };
}

function validateReadingJson(data) {
  return ReadingSchema.safeParse(data);
}

function parseLlmJson(raw) {
  var s = String(raw || '').trim();
  if (!s) return null;
  if (s.indexOf('```') !== -1) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  var start = s.indexOf('{');
  var end = s.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

function coverToText(cover) {
  cover = cover || {};
  var parts = [];
  if (cover.subtitle) parts.push(cover.subtitle);
  if (cover.epigraph) parts.push(cover.epigraph);
  return parts.join('\n\n');
}

function blockToText(block) {
  var parts = [];
  if (block.lead) parts.push(block.lead);
  (block.paragraphs || []).forEach(function (p) {
    if (p) parts.push(p);
  });
  if (block.anchor) {
    var a = String(block.anchor).trim();
    if (!/^[«"]/.test(a)) a = '«' + a.replace(/^«|»$/g, '') + '»';
    parts.push(a);
  }
  if (block.bridge) parts.push(block.bridge);
  return parts.join('\n\n');
}

function jsonToBlocks(data) {
  data = data || {};
  var blocks = [
    {
      num: 1,
      title: 'ОБЛОЖКА',
      text: coverToText(data.cover)
    }
  ];
  (data.blocks || []).forEach(function (b, idx) {
    blocks.push({
      num: idx + 2,
      title: b.title || 'Глава ' + (idx + 1),
      text: blockToText(b)
    });
  });
  return blocks;
}

function mergeJsonWithOrder(data, order) {
  data = data || {};
  data.language = isEnglishOrder(order) ? 'en' : 'ru';
  if (!data.spheres || data.spheres.length !== 10) {
    data.spheres = spheresFromOrder(order);
  }
  if (!data.cycles) {
    data.cycles = computeCycles(order);
  }
  if (!data.agePoints || !data.agePoints.length) {
    data.agePoints = computeAgePoints(order, data.cycles);
  }
  if (!data.peakAge) {
    data.peakAge = data.agePoints[3] || String(data.cycles.b1 - 1) + '–' + (data.cycles.b1 + 1);
  }
  data.bars = talentBars(order);
  (data.blocks || []).forEach(function (b) {
    if (!b.diagram) b.diagram = diagramForTitle(b.title);
    if (b.diagram && !b.diagramCaption) {
      b.diagramCaption =
        (isEnglishOrder(order) ? DEFAULT_CAPTIONS_EN : DEFAULT_CAPTIONS)[b.diagram] || null;
    }
  });
  return data;
}

function getHtmlCacheUrl(reading) {
  var blocks = Array.isArray(reading.blocks_content) ? reading.blocks_content : [];
  var meta = blocks.find(function (b) {
    return b.num === 0 && b.title === '__html__';
  });
  return meta && meta.text ? String(meta.text).trim() : '';
}

module.exports = {
  JSON_OUTPUT_WRAPPER: JSON_OUTPUT_WRAPPER,
  ReadingSchema: ReadingSchema,
  roman: roman,
  parseBlockText: parseBlockText,
  assembleFromReading: assembleFromReading,
  validateReadingJson: validateReadingJson,
  parseLlmJson: parseLlmJson,
  jsonToBlocks: jsonToBlocks,
  mergeJsonWithOrder: mergeJsonWithOrder,
  getHtmlCacheUrl: getHtmlCacheUrl,
  spheresFromOrder: spheresFromOrder,
  computeCycles: computeCycles,
  diagramForTitle: diagramForTitle
};
