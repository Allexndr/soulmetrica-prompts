'use strict';

var format = require('./format-reading');
var crypto = require('crypto');
var diagrams = require('./diagrams');
var readingJson = require('./reading-json');
var renderPremium = require('./render-premium');

var ROMAN = [
  '',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL'
];

function esc(s) {
  return format.escapeHtml(s);
}

function roman(n) {
  n = +n || 0;
  if (n > 0 && n < ROMAN.length) return ROMAN[n];
  return String(n);
}

function shareSecrets() {
  return [
    process.env.READING_SHARE_SECRET,
    process.env.INTERNAL_API_SECRET,
    process.env.TELEGRAM_BOT_TOKEN,
    'veluna'
  ].filter(Boolean);
}

function shareToken(readingId) {
  var secret = shareSecrets()[0] || 'veluna';
  return crypto.createHmac('sha256', secret).update('reading:' + String(readingId)).digest('base64url').slice(0, 28);
}

function verifyShareToken(readingId, token) {
  if (!token) return false;
  var secrets = shareSecrets();
  for (var i = 0; i < secrets.length; i++) {
    var expected = crypto
      .createHmac('sha256', secrets[i])
      .update('reading:' + String(readingId))
      .digest('base64url')
      .slice(0, 28);
    try {
      var a = Buffer.from(String(token));
      var b = Buffer.from(expected);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch (e) {}
  }
  return false;
}

function splitParts(text) {
  var raw = String(text || '').trim();
  if (!raw) return { lead: '', paragraphs: [], anchor: '', bridge: '' };

  var chunks = raw.split(/\n{2,}/).map(function (c) {
    return c.trim();
  }).filter(Boolean);

  var lead = '';
  var anchor = '';
  var bridge = '';
  var paragraphs = [];

  chunks.forEach(function (c, idx) {
    var isQuote =
      /^[«"]/.test(c) ||
      (/^[«"].+[»"]$/.test(c.replace(/\n/g, ' ')) && c.length < 220);
    var isBridge =
      idx === chunks.length - 1 &&
      c.length < 220 &&
      /(дальше|туда|слой|карта|дальше\.|сюда\.)/i.test(c);

    if (isQuote && !anchor) {
      anchor = c.replace(/^["«]\s*/, '').replace(/\s*["»]$/, '');
      return;
    }
    if (isBridge) {
      bridge = c;
      return;
    }
    if (!lead && idx === 0 && c.length < 180 && !/\.\s+[А-ЯA-Z]/.test(c)) {
      // short first line → lead-ish; keep as normal if it looks like full paragraph
    }
    paragraphs.push(c);
  });

  if (paragraphs.length >= 2 && paragraphs[0].length < 160) {
    lead = paragraphs.shift();
  }

  return { lead: lead, paragraphs: paragraphs, anchor: anchor, bridge: bridge };
}

function extractCoverCopy(chapters, order) {
  var cover = chapters.find(function (c) {
    return c.num === 1 || /облож/i.test(c.title);
  });
  var name = (order && order.customer_name) || 'тебя';
  var sub = '';
  var epi = '';
  if (cover && cover.text) {
    var parts = String(cover.text).split(/\n+/).map(function (x) {
      return x.trim();
    }).filter(Boolean);
    parts.forEach(function (p) {
      if (/^[«"]/.test(p) && !epi) epi = p;
      else if (!sub && p.length > 20) sub = p;
    });
    if (!epi) {
      var m = cover.text.match(/[«"]([^«»"]{12,160})[»"]/);
      if (m) epi = '«' + m[1] + '»';
    }
  }
  if (!sub) {
    sub = 'Карта характера, денег, близости и блоков — собранная в одну рабочую формулу.';
  }
  if (!epi) {
    epi = '«Читай медленно. Там, где захочется спорить — обычно самое точное.»';
  }
  return { name: name, sub: sub, epi: epi };
}

function paraHtml(text) {
  var s = esc(text);
  // light strong markup: already cleaned; keep simple
  s = s.replace(/\n/g, '<br>');
  return '<p>' + s + '</p>';
}

function scrubAblay(text) {
  var s = String(text || '');
  s = s.replace(/Абла[йяюе]/gi, '');
  s = s.replace(/Ablai?/gi, '');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s+([,.!?;:])/g, '$1');
  s = s.replace(/^\s*,\s*/gm, '');
  return s.trim();
}

function chapterHtml(chapter, bodyIndex, order) {
  var parts = splitParts(scrubAblay(chapter.text));
  var numLabel = roman(bodyIndex);
  var chart = diagrams.forChapter(chapter.title, order);
  // колесо уже на intro — не дублировать
  if (bodyIndex === 1 && /введен|с чего/i.test(chapter.title || '')) {
    chart = '';
  }
  var html = '';
  html += '<section class="chapter">';
  html += '<div class="num">' + esc(numLabel) + '</div>';
  html += '<h2>' + esc(scrubAblay(chapter.title)) + '</h2>';
  if (chart) html += chart;
  if (parts.lead) html += '<p class="lead">' + esc(parts.lead) + '</p>';
  parts.paragraphs.forEach(function (p) {
    html += paraHtml(p);
  });
  if (parts.anchor) {
    html += '<div class="anchor">' + esc(parts.anchor).replace(/\n/g, '<br>') + '</div>';
  }
  if (parts.bridge) {
    html += '<p class="bridge">' + esc(scrubAblay(parts.bridge)) + '</p>';
  }
  html += '</section>';
  return html;
}

function css() {
  return (
    "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Manrope:wght@200;300;400;500;600&display=swap');\n" +
    ':root{--ink:#2b2622;--ink-soft:#5c5148;--ink-faint:#8a7d72;--paper:#faf7f2;--paper-warm:#f3ece2;--gold:#b08d57;--gold-soft:#d9c4a3;--line:#e3d9cb;}' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    "body{background:var(--paper);color:var(--ink);font-family:'Manrope',system-ui,sans-serif;font-weight:300;font-size:19px;line-height:1.85;-webkit-font-smoothing:antialiased}" +
    '.page{max-width:760px;margin:0 auto;padding:110px 56px}' +
    '.cover{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(170deg,#f7f1e8 0%,#efe5d6 100%);padding:60px 40px}' +
    ".cover .mark{font-family:'Cormorant Garamond',serif;font-size:13px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold);margin-bottom:64px}" +
    ".cover h1{font-family:'Cormorant Garamond',serif;font-weight:300;font-size:clamp(38px,6vw,60px);line-height:1.18;letter-spacing:.005em;margin-bottom:26px}" +
    ".cover .who{font-family:'Cormorant Garamond',serif;font-size:30px;font-style:italic;color:var(--gold);margin-bottom:52px}" +
    '.cover .sub{max-width:520px;font-size:18px;line-height:1.75;color:var(--ink-soft);margin-bottom:64px}' +
    ".cover .epi{max-width:520px;font-family:'Cormorant Garamond',serif;font-size:25px;font-style:italic;line-height:1.55;color:var(--ink);padding-top:44px;border-top:1px solid var(--gold-soft)}" +
    '.chapter{padding-top:40px}' +
    ".num{font-family:'Cormorant Garamond',serif;font-size:60px;font-weight:300;color:var(--gold-soft);line-height:1;margin-bottom:14px}" +
    "h2{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:clamp(32px,4.6vw,44px);line-height:1.22;margin-bottom:28px;padding-bottom:26px;border-bottom:1px solid var(--line)}" +
    'p{margin-bottom:26px}p.lead{font-family:\'Cormorant Garamond\',serif;font-size:25px;line-height:1.65;color:var(--ink-soft);font-style:italic;margin-bottom:34px}' +
    'strong{font-weight:600;color:var(--ink)}em{font-style:italic}' +
    ".anchor{font-family:'Cormorant Garamond',serif;font-size:27px;font-style:italic;line-height:1.5;color:var(--gold);text-align:center;margin:52px 0;padding:36px 28px;border-top:1px solid var(--gold-soft);border-bottom:1px solid var(--gold-soft)}" +
    '.bridge{color:var(--ink-faint);font-size:17px;font-style:italic;margin-top:44px;padding-top:24px;border-top:1px dashed var(--line)}' +
    ".end{text-align:center;padding:120px 40px 90px;color:var(--ink-faint);font-family:'Cormorant Garamond',serif;font-size:15px;letter-spacing:.3em;text-transform:uppercase}" +
    '.diagram{margin:10px 0 42px}.diagram figcaption{font-family:\'Cormorant Garamond\',serif;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px;text-align:center}' +
    '.diagram svg{width:100%;height:auto;display:block;border-radius:18px;box-shadow:0 18px 50px -28px rgba(40,20,10,.45)}' +
    '.diagram-note{font-size:15px;color:var(--ink-soft);font-style:italic;margin:-18px 0 36px;text-align:center}' +
    '@media print{@page{size:A4;margin:18mm 16mm}body{background:#fff;font-size:12pt;line-height:1.7}.cover{min-height:auto;height:250mm;page-break-after:always;background:#fff}.chapter{page-break-before:always;padding-top:0}.page{padding:0;max-width:100%}h2{page-break-after:avoid}.anchor,.diagram{page-break-inside:avoid}p{orphans:3;widows:3}}' +
    '@media(max-width:640px){body{font-size:17px}.page{padding:64px 26px}.anchor{font-size:22px;padding:28px 16px}.num{font-size:44px}}'
  );
}

function usePremiumTemplate(reading) {
  return reading && (reading.product_key === 'A07' || /полный разбор/i.test(reading.title || ''));
}

function buildReadingHtml(reading, order) {
  if (usePremiumTemplate(reading)) {
    var data = readingJson.assembleFromReading(reading, order || {});
    return renderPremium.buildPremiumHtml(data, order || {});
  }

  var chapters = format.getChapters(reading);
  var coverMeta = extractCoverCopy(chapters, order || {});
  var rawName = String(coverMeta.name || '').trim();
  var showName = rawName && !/абла/i.test(rawName) ? rawName : '';
  var body = chapters.filter(function (c) {
    return !(c.num === 1 || /облож/i.test(c.title));
  });
  if (!body.length) body = chapters;

  var title = reading.title || 'Полный разбор личности и жизни';
  var dateStr = '';
  if (order && order.birth_day && order.birth_month && order.birth_year) {
    dateStr =
      String(order.birth_day).padStart(2, '0') +
      '.' +
      String(order.birth_month).padStart(2, '0') +
      '.' +
      order.birth_year;
  }

  var chaptersHtml = body
    .map(function (ch, i) {
      return chapterHtml(ch, i + 1, order);
    })
    .join('\n');

  var opener =
    '<section class="chapter">' +
    '<div class="num">✶</div>' +
    '<h2>Твоя карта сфер</h2>' +
    '<p class="lead">Сначала — картина целиком. Потом — словами.</p>' +
    diagrams.forIntro(order) +
    '<p class="diagram-note">Колесо собрано по твоей дате через расчётный слой разбора (без «магии ради картинки»).</p>' +
    '</section>';

  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' +
    esc(title) +
    '</title><style>' +
    css() +
    '</style></head><body>' +
    '<section class="cover">' +
    '<div class="mark">SoulMetrica</div>' +
    '<h1>' +
    esc(title).replace(/\s+и\s+/, '<br>и ') +
    '</h1>' +
    (showName ? '<div class="who">Для ' + esc(showName) + '</div>' : '') +
    '<p class="sub">' +
    esc(scrubAblay(coverMeta.sub)) +
    '</p>' +
    '<p class="epi">' +
    esc(scrubAblay(coverMeta.epi)).replace(/\n/g, '<br>') +
    '</p>' +
    (dateStr ? '<p style="margin-top:36px;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)">' + esc(dateStr) + '</p>' : '') +
    '</section>' +
    '<div class="page">' +
    opener +
    chaptersHtml +
    '</div>' +
    '<div class="end">SoulMetrica</div>' +
    '</body></html>'
  );
}

module.exports = {
  buildReadingHtml: buildReadingHtml,
  shareToken: shareToken,
  verifyShareToken: verifyShareToken,
  roman: roman
};
