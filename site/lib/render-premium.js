'use strict';

var format = require('./format-reading');
var diagramKit = require('./diagram-kit');

function esc(s) {
  return format.escapeHtml(s);
}

function scrubAblay(text) {
  var s = String(text || '');
  s = s.replace(/Абла[йяюе]/gi, '');
  s = s.replace(/Ablai?/gi, '');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s+([,.!?;:])/g, '$1');
  return s.trim();
}

function inlineStrong(text) {
  var s = esc(scrubAblay(text));
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return s.replace(/\n/g, '<br>');
}

function premiumCss() {
  return (
    "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Marcellus&family=Manrope:wght@200;300;400;500;600&display=swap');" +
    ':root{--bg:#0c1030;--bg2:#141a44;--card:#151a41;--card2:#1b2150;--ink:#efe9dd;--ink-soft:#c3bdd6;--ink-faint:#8f8ab0;--gold:#e2ba75;--gold-2:#f4d79a;--gold-soft:#8f7846;--purple:#9a7ff0;--purple-2:#c4a9ff;--line:rgba(226,186,117,.22);--line-2:rgba(226,186,117,.12);}' +
    '*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}' +
    "body{background:var(--bg);color:var(--ink);font-family:'Manrope',system-ui,sans-serif;font-weight:300;font-size:19px;line-height:1.9;-webkit-font-smoothing:antialiased;position:relative;overflow-x:hidden}" +
    '.stars{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1.4px 1.4px at 20% 30%,#fff9 40%,transparent),radial-gradient(1.4px 1.4px at 75% 15%,#fff8 40%,transparent),radial-gradient(1.2px 1.2px at 40% 70%,#ffe9c880 40%,transparent),radial-gradient(1.6px 1.6px at 85% 55%,#fff7 40%,transparent),radial-gradient(1px 1px at 60% 40%,#fff6 40%,transparent),radial-gradient(1.3px 1.3px at 12% 80%,#fff7 40%,transparent),radial-gradient(1.1px 1.1px at 90% 85%,#ffe9c870 40%,transparent),radial-gradient(1.2px 1.2px at 30% 12%,#fff6 40%,transparent),radial-gradient(1400px 700px at 50% -10%,#24205a55,transparent),radial-gradient(1200px 900px at 90% 20%,#3a2b6033,transparent),linear-gradient(180deg,#0c1030 0%,#0e1236 50%,#0b0e2a 100%);background-repeat:no-repeat}' +
    '.stars::after{content:"";position:absolute;inset:0;background:radial-gradient(1px 1px at 55% 22%,#fff,transparent),radial-gradient(1px 1px at 25% 55%,#fff,transparent),radial-gradient(1px 1px at 80% 38%,#fff,transparent),radial-gradient(1px 1px at 15% 35%,#fff,transparent),radial-gradient(1px 1px at 68% 75%,#fff,transparent);opacity:.5;animation:tw 5s ease-in-out infinite alternate}' +
    '@keyframes tw{from{opacity:.25}to{opacity:.7}}' +
    '.wrap{position:relative;z-index:1}.page{max-width:770px;margin:0 auto;padding:96px 56px}' +
    '.cover{position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px 28px;overflow:hidden}' +
    '.mandala{position:absolute;top:50%;left:50%;transform:translate(-50%,-52%);width:min(680px,116vw);opacity:.9;z-index:0}' +
    '.mandala .spin{transform-origin:290px 290px;animation:spin 120s linear infinite}' +
    '.mandala .spin-r{transform-origin:290px 290px;animation:spin 90s linear infinite reverse}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '.cover-inner{position:relative;z-index:2}' +
    ".cover .mark{font-family:'Marcellus',serif;font-size:13px;letter-spacing:.5em;text-transform:uppercase;color:var(--gold);margin-bottom:40px}" +
    ".cover .mark::before,.cover .mark::after{content:\"✦\";color:var(--gold-soft);margin:0 14px;font-size:9px;vertical-align:middle}" +
    ".cover h1{font-family:'Marcellus',serif;font-weight:400;font-size:clamp(40px,7vw,68px);line-height:1.12;letter-spacing:.01em;margin-bottom:26px;background:linear-gradient(180deg,#f7e6c2,#e2ba75 55%,#b98f4f);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 40px rgba(226,186,117,.25)}" +
    ".cover .who{font-family:'Cormorant Garamond',serif;font-size:32px;font-style:italic;color:var(--purple-2);margin-bottom:40px;text-shadow:0 0 24px rgba(154,127,240,.4)}" +
    '.cover .sub{max-width:540px;font-size:18px;line-height:1.8;color:var(--ink-soft);margin:0 auto 46px}' +
    ".cover .epi{max-width:520px;font-family:'Cormorant Garamond',serif;font-size:26px;font-style:italic;line-height:1.6;color:var(--gold-2);padding-top:38px;border-top:1px solid var(--line);margin:0 auto}" +
    '.scroll-cue{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);color:var(--ink-faint);font-size:12px;letter-spacing:.3em;text-transform:uppercase;z-index:2}' +
    '.chapter{padding-top:30px;margin-bottom:20px}' +
    ".eyebrow{display:flex;align-items:center;gap:14px;margin-bottom:16px;color:var(--gold);font-family:'Manrope';font-size:12px;letter-spacing:.32em;text-transform:uppercase}" +
    '.eyebrow::before{content:"";width:34px;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}' +
    ".num{font-family:'Marcellus',serif;font-size:15px;letter-spacing:.2em;color:var(--gold-soft)}" +
    "h2{font-family:'Marcellus',serif;font-weight:400;font-size:clamp(30px,4.4vw,42px);line-height:1.2;margin-bottom:44px;padding-bottom:24px;position:relative;color:var(--gold-2)}" +
    'h2::after{content:"";position:absolute;bottom:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,var(--gold),var(--line-2) 60%,transparent)}' +
    'p{margin-bottom:24px;color:var(--ink)}' +
    "p.lead{font-family:'Cormorant Garamond',serif;font-size:26px;line-height:1.6;color:var(--gold-2);font-style:italic;margin-bottom:30px}" +
    'strong{font-weight:500;color:var(--gold-2)}em{font-style:italic;color:var(--purple-2)}' +
    ".anchor{font-family:'Cormorant Garamond',serif;font-size:28px;font-style:italic;line-height:1.55;color:var(--gold-2);text-align:center;margin:48px 0;padding:38px 30px;background:radial-gradient(120% 140% at 50% 0%,rgba(154,127,240,.10),transparent 70%);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}" +
    '.anchor::before{content:"“";display:block;font-size:46px;color:var(--gold-soft);line-height:.2;margin-bottom:10px}' +
    '.bridge{color:var(--ink-faint);font-size:17px;font-style:italic;margin-top:40px;padding-top:22px;border-top:1px dashed var(--line-2)}' +
    ".end{text-align:center;padding:110px 40px 80px;color:var(--gold-soft);font-family:'Marcellus',serif;font-size:14px;letter-spacing:.35em;text-transform:uppercase}" +
    '.end::before{content:"✦ ✦ ✦";display:block;color:var(--gold-soft);letter-spacing:.5em;margin-bottom:22px;font-size:10px}' +
    '.figure{margin:46px 0;padding:40px 30px 30px;border-radius:14px;position:relative;background:linear-gradient(165deg,rgba(30,34,78,.75),rgba(16,20,52,.85));border:1px solid var(--line);box-shadow:0 20px 60px -30px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.04)}' +
    ".figure .cap-top{font-family:'Manrope';font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);text-align:center;margin-bottom:26px}" +
    ".d-cap{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:20px;color:var(--gold-2);text-align:center;margin-top:22px;line-height:1.5}" +
    'svg{display:block;width:100%;height:auto;overflow:visible}' +
    ".lbl{font-family:'Manrope';font-size:13px;fill:var(--ink-soft)}" +
    ".lbl-s{font-family:'Manrope';font-size:11px;letter-spacing:.14em;text-transform:uppercase;fill:var(--ink-faint)}" +
    ".lbl-serif{font-family:'Cormorant Garamond',serif;font-style:italic}" +
    '.stroke{fill:none;stroke:var(--gold);stroke-width:1.4}' +
    '.stroke-soft{fill:none;stroke:var(--purple);stroke-width:1.2;opacity:.7}' +
    '.hair{fill:none;stroke:var(--line);stroke-width:1}' +
    '.dot{fill:var(--gold);filter:url(#glow)}' +
    '.dot-o{fill:var(--card);stroke:var(--gold);stroke-width:1.4}' +
    '.bar-track{fill:rgba(255,255,255,.05)}' +
    '.bar-fill{fill:url(#goldgrad)}' +
    '.bar-fill.soft{fill:var(--gold-soft)}' +
    ".bar-lbl{font-family:'Manrope';font-size:14px;fill:var(--ink)}" +
    ".bar-sub{font-family:'Manrope';font-size:12px;fill:var(--ink-faint)}" +
    '@media(max-width:640px){body{font-size:17px}.page{padding:64px 22px}.anchor{font-size:23px;padding:28px 16px}.figure{padding:26px 14px 20px}.cover .who{font-size:26px}}' +
    '@media print{@page{size:A4;margin:16mm}body{background:#0c1030!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.stars{position:absolute}.cover{min-height:auto;height:262mm;page-break-after:always}.chapter{page-break-before:always;padding-top:0}.page{padding:0;max-width:100%}h2{page-break-after:avoid}.anchor,.figure{page-break-inside:avoid}.scroll-cue{display:none}}'
  );
}

function svgDefs() {
  return (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<filter id="glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<filter id="glowbig" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<linearGradient id="goldgrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b98f4f"/><stop offset=".5" stop-color="#e2ba75"/><stop offset="1" stop-color="#f4d79a"/></linearGradient>' +
    '<radialGradient id="radarfill" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#c4a9ff" stop-opacity=".55"/><stop offset="1" stop-color="#7a5fd0" stop-opacity=".22"/></radialGradient>' +
    '<radialGradient id="core" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3d8"/><stop offset=".5" stop-color="#e2ba75"/><stop offset="1" stop-color="#8f7846" stop-opacity="0"/></radialGradient>' +
    '</defs></svg>'
  );
}

function mandalaSvg() {
  return (
    '<svg class="mandala" viewBox="0 0 580 580" aria-hidden="true">' +
    '<g fill="none" stroke="#e2ba75">' +
    '<circle class="spin" cx="290" cy="290" r="270" stroke-width="1" stroke-opacity=".18" stroke-dasharray="2 10"/>' +
    '<circle cx="290" cy="290" r="232" stroke-width="1" stroke-opacity=".22"/>' +
    '<circle class="spin-r" cx="290" cy="290" r="216" stroke-width="1" stroke-opacity=".16" stroke-dasharray="1 7"/>' +
    '<circle cx="290" cy="290" r="150" stroke-width="1" stroke-opacity=".3"/>' +
    '<circle cx="290" cy="290" r="120" stroke-width="1" stroke-opacity=".18"/>' +
    '</g>' +
    '<g class="spin" stroke="#e2ba75" stroke-opacity=".28" stroke-width="1">' +
    '<g id="ray"><line x1="290" y1="58" x2="290" y2="120"/></g>' +
    '<use href="#ray" transform="rotate(30 290 290)"/><use href="#ray" transform="rotate(60 290 290)"/>' +
    '<use href="#ray" transform="rotate(90 290 290)"/><use href="#ray" transform="rotate(120 290 290)"/>' +
    '<use href="#ray" transform="rotate(150 290 290)"/><use href="#ray" transform="rotate(180 290 290)"/>' +
    '<use href="#ray" transform="rotate(210 290 290)"/><use href="#ray" transform="rotate(240 290 290)"/>' +
    '<use href="#ray" transform="rotate(270 290 290)"/><use href="#ray" transform="rotate(300 290 290)"/>' +
    '<use href="#ray" transform="rotate(330 290 290)"/>' +
    '</g>' +
    '<g fill="#f4d79a" class="spin-r">' +
    '<circle cx="290" cy="74" r="2.4"/><circle cx="474" cy="182" r="1.8"/><circle cx="474" cy="398" r="1.8"/>' +
    '<circle cx="290" cy="506" r="2.4"/><circle cx="106" cy="398" r="1.8"/><circle cx="106" cy="182" r="1.8"/>' +
    '</g>' +
    '<circle cx="290" cy="290" r="96" fill="url(#core)" opacity=".55"/>' +
    '<g fill="none" stroke="#f4d79a" stroke-width="1.4" filter="url(#glowbig)">' +
    '<path d="M290 232 C318 268 318 312 290 348 C262 312 262 268 290 232Z" stroke-opacity=".85"/>' +
    '<path d="M232 290 C268 262 312 262 348 290 C312 318 268 318 232 290Z" stroke-opacity=".85"/>' +
    '<circle cx="290" cy="290" r="7" fill="#f4d79a" stroke="none"/>' +
    '</g></svg>'
  );
}

function renderCover(cover, order) {
  var dateStr = '';
  if (order && order.birth_day && order.birth_month && order.birth_year) {
    dateStr =
      String(order.birth_day).padStart(2, '0') +
      '.' +
      String(order.birth_month).padStart(2, '0') +
      '.' +
      order.birth_year;
  }
  var who = cover.who || '';
  if (who && /абла/i.test(who)) who = '';

  return (
    '<section class="cover">' +
    mandalaSvg() +
    '<div class="cover-inner">' +
    '<div class="mark">SoulMetrica</div>' +
    '<h1>' +
    esc(cover.title || 'Полный разбор личности и жизни').replace(/\s+и\s+/, '<br>и ') +
    '</h1>' +
    (who ? '<div class="who">' + esc(who) + '</div>' : '') +
    '<p class="sub">' +
    inlineStrong(cover.subtitle) +
    '</p>' +
    '<p class="epi">' +
    inlineStrong(cover.epigraph) +
    '</p>' +
    (dateStr
      ? '<p style="margin-top:36px;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)">' +
        esc(dateStr) +
        '</p>'
      : '') +
    '</div>' +
    '<div class="scroll-cue">листай вниз ↓</div>' +
    '</section>'
  );
}

function renderSpheresSection(data) {
  return (
    '<section class="chapter">' +
    '<div class="eyebrow"><span class="num">Карта сфер</span></div>' +
    '<h2>Сильные и слабые стороны в сферах жизни</h2>' +
    '<p class="lead">Сначала — картина целиком. Потом — словами.</p>' +
    diagramKit.renderDiagram('radar', { spheres: data.spheres }, data.radarCaption) +
    '</section>'
  );
}

function renderBlock(block, data) {
  var html = '';
  html += '<section class="chapter">';
  html +=
    '<div class="eyebrow"><span class="num">' + esc(block.eyebrow || 'Глава ' + block.num) + '</span></div>';
  html += '<h2>' + esc(block.title) + '</h2>';

  if (block.lead) {
    html += '<p class="lead">' + inlineStrong(block.lead) + '</p>';
  }

  var diagramData = {
    spheres: data.spheres,
    cycles: data.cycles,
    agePoints: data.agePoints,
    peakAge: data.peakAge,
    bars: data.bars
  };
  if (block.diagram) {
    html += diagramKit.renderDiagram(block.diagram, diagramData, block.diagramCaption);
  }

  (block.paragraphs || []).forEach(function (p) {
    html += '<p>' + inlineStrong(p) + '</p>';
  });

  if (block.anchor) {
    html += '<div class="anchor">' + inlineStrong(block.anchor) + '</div>';
  }
  if (block.bridge) {
    html += '<p class="bridge">' + inlineStrong(block.bridge) + '</p>';
  }
  html += '</section>';
  return html;
}

function buildPremiumHtml(data, order) {
  data = data || {};
  order = order || {};

  var introIdx = -1;
  (data.blocks || []).forEach(function (b, i) {
    if (introIdx === -1 && /введен/i.test(b.title || '')) introIdx = i;
  });

  var blocksHtml = '';
  (data.blocks || []).forEach(function (block, i) {
    blocksHtml += renderBlock(block, data);
    if (i === introIdx) {
      blocksHtml += renderSpheresSection(data);
    }
  });

  if (introIdx === -1) {
    blocksHtml = renderSpheresSection(data) + blocksHtml;
  }

  return (
    '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' +
    esc(data.cover && data.cover.title ? data.cover.title : 'Полный разбор') +
    ' · SoulMetrica</title><style>' +
    premiumCss() +
    '</style></head><body>' +
    '<div class="stars"></div>' +
    svgDefs() +
    '<div class="wrap">' +
    renderCover(data.cover || {}, order) +
    '<div class="page">' +
    blocksHtml +
    '</div>' +
    '<div class="end">SoulMetrica · полный разбор</div>' +
    '</div></body></html>'
  );
}

module.exports = {
  buildPremiumHtml: buildPremiumHtml,
  premiumCss: premiumCss
};
