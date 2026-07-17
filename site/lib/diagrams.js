'use strict';

var calc = require('./chart-calc');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function polar(cx, cy, r, angleDeg) {
  var a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function polyPoints(cx, cy, rMax, values) {
  var n = values.length;
  return values
    .map(function (v, i) {
      var p = polar(cx, cy, (Math.max(0, Math.min(10, v)) / 10) * rMax, (360 / n) * i);
      return p.x.toFixed(1) + ',' + p.y.toFixed(1);
    })
    .join(' ');
}

function nodeSvg(x, y, value, label, variant) {
  var r = variant === 'core' ? 28 : variant === 'mid' ? 20 : 24;
  var fill = variant === 'core' ? '#b08d57' : variant === 'mid' ? '#efe6d6' : '#faf7f2';
  var stroke = '#b08d57';
  var ink = variant === 'core' ? '#fff' : '#2b2622';
  var out =
    '<circle cx="' +
    x +
    '" cy="' +
    y +
    '" r="' +
    r +
    '" fill="' +
    fill +
    '" stroke="' +
    stroke +
    '" stroke-width="2"/>' +
    '<text x="' +
    x +
    '" y="' +
    (y + 6) +
    '" text-anchor="middle" fill="' +
    ink +
    '" font-family="Cormorant Garamond,Georgia,serif" font-size="' +
    (variant === 'core' ? 22 : 18) +
    '" font-weight="600">' +
    esc(value) +
    '</text>';
  if (label) {
    out +=
      '<text x="' +
      x +
      '" y="' +
      (y + r + 16) +
      '" text-anchor="middle" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="11">' +
      esc(label) +
      '</text>';
  }
  return out;
}

/** Главное колесо сфер — вау на 1–2 стр. */
function lifeWheelSvg(order) {
  var data = calc.sphereScores(order || {});
  var cx = 400;
  var cy = 390;
  var rMax = 210;
  var n = data.strong.length;
  var rings = [0.2, 0.4, 0.6, 0.8, 1];

  var grid = rings
    .map(function (t) {
      return (
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        (rMax * t).toFixed(1) +
        '" fill="none" stroke="rgba(176,141,87,.32)" stroke-width="1"/>'
      );
    })
    .join('');

  var axes = '';
  var labels = '';
  for (var i = 0; i < n; i++) {
    var ang = (360 / n) * i;
    var tip = polar(cx, cy, rMax, ang);
    var lab = polar(cx, cy, rMax + 48, ang);
    axes +=
      '<line x1="' +
      cx +
      '" y1="' +
      cy +
      '" x2="' +
      tip.x.toFixed(1) +
      '" y2="' +
      tip.y.toFixed(1) +
      '" stroke="rgba(176,141,87,.35)" stroke-width="1"/>';
    axes +=
      '<circle cx="' +
      tip.x.toFixed(1) +
      '" cy="' +
      tip.y.toFixed(1) +
      '" r="5" fill="#b08d57"/>';
    labels +=
      '<text x="' +
      lab.x.toFixed(1) +
      '" y="' +
      lab.y.toFixed(1) +
      '" text-anchor="middle" dominant-baseline="middle" fill="#5c5148" font-family="Cormorant Garamond, Georgia, serif" font-size="13">' +
      esc(data.spheres[i].label) +
      '</text>';
  }

  var weakPoly = polyPoints(cx, cy, rMax, data.weak);
  var strongPoly = polyPoints(cx, cy, rMax, data.strong);

  return (
    '<figure class="diagram diagram--wheel">' +
    '<figcaption>Сильные и зоны роста в сферах жизни</figcaption>' +
    '<svg viewBox="0 0 800 820" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Колесо сфер">' +
    '<rect width="800" height="820" rx="22" fill="#faf7f2"/>' +
    '<rect x="14" y="14" width="772" height="792" rx="18" fill="none" stroke="rgba(176,141,87,.45)" stroke-width="1.2"/>' +
    '<text x="400" y="48" text-anchor="middle" fill="#b08d57" font-family="Cormorant Garamond,Georgia,serif" font-size="15" letter-spacing="3">КАРТА СФЕР · ПО ТВОИМ ДАННЫМ</text>' +
    grid +
    axes +
    '<polygon points="' +
    weakPoly +
    '" fill="rgba(140,110,180,.16)" stroke="#8c6eb4" stroke-width="2"/>' +
    '<polygon points="' +
    strongPoly +
    '" fill="rgba(176,141,87,.14)" stroke="#b08d57" stroke-width="2.2"/>' +
    labels +
    '<g transform="translate(40,750)">' +
    '<circle cx="8" cy="0" r="5" fill="#b08d57"/>' +
    '<text x="22" y="4" fill="#5c5148" font-family="Manrope,sans-serif" font-size="12">Сильные стороны</text>' +
    '<circle cx="190" cy="0" r="5" fill="#8c6eb4"/>' +
    '<text x="204" y="4" fill="#5c5148" font-family="Manrope,sans-serif" font-size="12">Зоны роста</text>' +
    '</g>' +
    '</svg></figure>'
  );
}

/**
 * Матрица судьбы — ромб с арканами (реальная персональная карта).
 */
function destinyMatrixSvg(order) {
  var m = calc.destinyMatrix(order || {});
  var p = m.points;
  var cx = 340;
  var cy = 300;
  var R = 210;

  // ромб: A верх, B лево, C право, D низ
  var A = { x: cx, y: cy - R };
  var B = { x: cx - R, y: cy };
  var C = { x: cx + R, y: cy };
  var D = { x: cx, y: cy + R };
  var E = { x: cx, y: cy };
  var F = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  var G = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  var H = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  var I = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };
  var U = { x: cx, y: cy };

  function line(a, b) {
    return (
      '<line x1="' +
      a.x +
      '" y1="' +
      a.y +
      '" x2="' +
      b.x +
      '" y2="' +
      b.y +
      '" stroke="#d9c4a3" stroke-width="1.6"/>'
    );
  }

  var frame =
    line(A, B) +
    line(B, D) +
    line(D, C) +
    line(C, A) +
    line(A, D) +
    line(B, C) +
    line(F, H) +
    line(H, I) +
    line(I, G) +
    line(G, F) +
    '<polygon points="' +
    F.x +
    ',' +
    F.y +
    ' ' +
    H.x +
    ',' +
    H.y +
    ' ' +
    I.x +
    ',' +
    I.y +
    ' ' +
    G.x +
    ',' +
    G.y +
    '" fill="rgba(176,141,87,.1)" stroke="none"/>';

  var nodes =
    nodeSvg(A.x, A.y, p.A, 'День', 'corner') +
    nodeSvg(B.x, B.y, p.B, 'Месяц', 'corner') +
    nodeSvg(C.x, C.y, p.C, 'Год', 'corner') +
    nodeSvg(D.x, D.y, p.D, 'Судьба', 'corner') +
    nodeSvg(F.x, F.y, p.F, '', 'mid') +
    nodeSvg(G.x, G.y, p.G, '', 'mid') +
    nodeSvg(H.x, H.y, p.H, '', 'mid') +
    nodeSvg(I.x, I.y, p.I, '', 'mid') +
    nodeSvg(E.x, E.y - 8, p.E, 'Комфорт', 'core') +
    '<text x="' +
    cx +
    '" y="' +
    (cy + 42) +
    '" text-anchor="middle" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="11">центр ' +
    esc(p.U) +
    '</text>';

  var purposes =
    '<g transform="translate(620,120)">' +
    '<text x="0" y="0" fill="#b08d57" font-family="Cormorant Garamond,serif" font-size="14" letter-spacing="1">ПРЕДНАЗНАЧЕНИЕ</text>' +
    '<text x="0" y="36" fill="#2b2622" font-family="Cormorant Garamond,serif" font-size="28">' +
    esc(m.purposes.general) +
    '</text>' +
    '<text x="0" y="58" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="11">общее в этой жизни</text>' +
    '<text x="0" y="96" fill="#2b2622" font-family="Cormorant Garamond,serif" font-size="20">' +
    esc(m.purposes.personal) +
    ' · ' +
    esc(m.purposes.social) +
    '</text>' +
    '<text x="0" y="118" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="11">личное · социальное</text>' +
    '<text x="0" y="156" fill="#2b2622" font-family="Cormorant Garamond,serif" font-size="18">' +
    esc(m.purposes.planetary) +
    '</text>' +
    '<text x="0" y="178" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="11">планетарное</text>' +
    '</g>';

  return (
    '<figure class="diagram diagram--destiny">' +
    '<figcaption>Матрица судьбы · ' +
    esc(m.dateStr) +
    '</figcaption>' +
    '<svg viewBox="0 0 820 620" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Матрица судьбы">' +
    '<rect width="820" height="620" rx="18" fill="#faf7f2"/>' +
    '<rect x="10" y="10" width="800" height="600" rx="14" fill="none" stroke="rgba(176,141,87,.4)"/>' +
    '<text x="410" y="48" text-anchor="middle" fill="#b08d57" font-family="Cormorant Garamond,Georgia,serif" font-size="15" letter-spacing="3">МАТРИЦА СУДЬБЫ</text>' +
    frame +
    nodes +
    purposes +
    '</svg></figure>'
  );
}

/** Психоматрица Пифагора — с подписями и линиями */
function matrixSvg(order) {
  var m = calc.pythagorasMatrix(order || {});
  var cell = 86;
  var gap = 12;
  var ox = 70;
  var oy = 100;
  var cells = '';
  m.cells.forEach(function (row, ri) {
    row.forEach(function (c, ci) {
      var x = ox + ci * (cell + gap);
      var y = oy + ri * (cell + gap);
      var fill = c.count === 0 ? '#f3eee6' : c.count >= 2 ? '#ead9b8' : '#ebe4f2';
      var stroke = c.count === 0 ? '#d9c4a3' : c.count >= 2 ? '#b08d57' : '#8c6eb4';
      cells +=
        '<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        cell +
        '" height="' +
        cell +
        '" rx="12" fill="' +
        fill +
        '" stroke="' +
        stroke +
        '" stroke-width="1.6"/>' +
        '<text x="' +
        (x + cell / 2) +
        '" y="' +
        (y + 28) +
        '" text-anchor="middle" fill="#8a7d72" font-family="Manrope,sans-serif" font-size="10">' +
        esc(c.label) +
        '</text>' +
        '<text x="' +
        (x + cell / 2) +
        '" y="' +
        (y + 58) +
        '" text-anchor="middle" fill="#2b2622" font-family="Cormorant Garamond,Georgia,serif" font-size="26">' +
        esc(c.marks) +
        '</text>';
    });
  });

  var linesY = oy + 3 * (cell + gap) + 18;
  var lineItems = [
    ['Самооценка', m.lines.selfEsteem],
    ['Деньги', m.lines.money],
    ['Талант', m.lines.talent],
    ['Цель', m.lines.goal],
    ['Семья', m.lines.family],
    ['Стабильность', m.lines.stability]
  ];
  var lineSvg = lineItems
    .map(function (it, i) {
      var x = 40 + (i % 3) * 180;
      var y = linesY + Math.floor(i / 3) * 28;
      return (
        '<text x="' +
        x +
        '" y="' +
        y +
        '" fill="#5c5148" font-family="Manrope,sans-serif" font-size="12">' +
        esc(it[0]) +
        ': <tspan fill="#b08d57" font-family="Cormorant Garamond,serif" font-size="16">' +
        it[1] +
        '</tspan></text>'
      );
    })
    .join('');

  return (
    '<figure class="diagram diagram--matrix">' +
    '<figcaption>Психоматрица · ' +
    esc(m.dateStr) +
    '</figcaption>' +
    '<svg viewBox="0 0 560 480" xmlns="http://www.w3.org/2000/svg" role="img">' +
    '<rect width="560" height="480" rx="18" fill="#faf7f2"/>' +
    '<rect x="10" y="10" width="540" height="460" rx="14" fill="none" stroke="rgba(176,141,87,.4)"/>' +
    '<text x="280" y="48" text-anchor="middle" fill="#b08d57" font-family="Cormorant Garamond,Georgia,serif" font-size="14" letter-spacing="2">ПСИХОМАТРИЦА ДАТЫ</text>' +
    cells +
    lineSvg +
    '</svg></figure>'
  );
}

function dualSelfSvg() {
  return (
    '<figure class="diagram">' +
    '<figcaption>Два слоя одной личности</figcaption>' +
    '<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="640" height="300" rx="18" fill="#faf7f2"/>' +
    '<circle cx="220" cy="150" r="78" fill="none" stroke="rgba(176,141,87,.55)" stroke-width="2"/>' +
    '<circle cx="420" cy="150" r="78" fill="none" stroke="#b08d57" stroke-width="2.2"/>' +
    '<circle cx="320" cy="150" r="36" fill="rgba(176,141,87,.2)" stroke="#b08d57"/>' +
    '<text x="220" y="146" text-anchor="middle" fill="#2b2622" font-family="Cormorant Garamond,serif" font-size="20">Снаружи</text>' +
    '<text x="220" y="170" text-anchor="middle" fill="#8a7d72" font-size="12" font-family="Manrope,sans-serif">форма · роль</text>' +
    '<text x="420" y="146" text-anchor="middle" fill="#2b2622" font-family="Cormorant Garamond,serif" font-size="20">Внутри</text>' +
    '<text x="420" y="170" text-anchor="middle" fill="#8a7d72" font-size="12" font-family="Manrope,sans-serif">мотив · конфликт</text>' +
    '<text x="320" y="155" text-anchor="middle" fill="#b08d57" font-family="Cormorant Garamond,serif" font-size="14" font-style="italic">стык</text>' +
    '</svg></figure>'
  );
}

var EN_TEXT = {
  'Сильные и зоны роста в сферах жизни': 'Strengths and growth areas across life',
  'КАРТА СФЕР · ПО ТВОИМ ДАННЫМ': 'LIFE-AREA MAP · FROM YOUR DATA',
  'Сильные стороны': 'Strengths',
  'Зоны роста': 'Growth areas',
  'День': 'Day',
  'Месяц': 'Month',
  'Год': 'Year',
  'Судьба': 'Destiny',
  'Комфорт': 'Comfort',
  'центр ': 'center ',
  'ПРЕДНАЗНАЧЕНИЕ': 'PURPOSE',
  'общее в этой жизни': 'overall in this life',
  'личное · социальное': 'personal · social',
  'планетарное': 'planetary',
  'Матрица судьбы': 'Destiny matrix',
  'МАТРИЦА СУДЬБЫ': 'DESTINY MATRIX',
  'Самооценка': 'Self-esteem',
  'Деньги': 'Money',
  'Талант': 'Talent',
  'Цель': 'Goal',
  'Семья': 'Family',
  'Стабильность': 'Stability',
  'Психоматрица': 'Psychomatrix',
  'ПСИХОМАТРИЦА ДАТЫ': 'DATE PSYCHOMATRIX',
  'Два слоя одной личности': 'Two layers of one personality',
  'Снаружи': 'Outside',
  'форма · роль': 'form · role',
  'Внутри': 'Inside',
  'мотив · конфликт': 'motive · conflict',
  'стык': 'the junction'
};

function localizeDiagram(html, order) {
  if (
    !order ||
    (order.language !== 'en' && (!order.payment_meta || order.payment_meta.language !== 'en'))
  ) {
    return html;
  }
  Object.keys(EN_TEXT)
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .forEach(function (from) {
      html = html.split(from).join(EN_TEXT[from]);
    });
  return html.replace(/aria-label="[^"]*[А-Яа-яЁё][^"]*"/g, 'aria-label="Personal reading diagram"');
}

function forIntro(order) {
  return localizeDiagram(lifeWheelSvg(order), order);
}

function forChapter(title, order) {
  var t = String(title || '').toLowerCase();
  if (/введен|с чего|introduction/.test(t)) return localizeDiagram(lifeWheelSvg(order), order);
  if (/ядр|личност|core personality/.test(t)) {
    return localizeDiagram(destinyMatrixSvg(order) + dualSelfSvg(), order);
  }
  if (/талант|гени|talent|genius/.test(t)) return '';
  if (/денеж|деньг|money/.test(t)) return '';
  if (/люб|отношен|love|relationship/.test(t)) return '';
  if (/блок|block/.test(t)) return localizeDiagram(matrixSvg(order), order);
  return '';
}

module.exports = {
  lifeWheelSvg: lifeWheelSvg,
  destinyMatrixSvg: destinyMatrixSvg,
  matrixSvg: matrixSvg,
  dualSelfSvg: dualSelfSvg,
  forIntro: forIntro,
  forChapter: forChapter
};
