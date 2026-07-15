'use strict';

var path = require('path');
var PDFDocument = require('pdfkit');
var format = require('./format-reading');
var htmlReading = require('./html-reading');

var COLORS = {
  paper: '#FFFFFF',
  warm: '#FBF8F3',
  ink: '#2B2622',
  soft: '#5C5148',
  faint: '#8A7D72',
  gold: '#B08D57',
  goldSoft: '#D9C4A3',
  line: '#E3D9CB'
};

function fontPath(name) {
  return path.join(__dirname, '..', 'assets', 'fonts', name);
}

function withFooterSafe(doc, fn) {
  var margins = doc.page.margins;
  var prevBottom = margins.bottom;
  var prevTop = margins.top;
  margins.bottom = 0;
  margins.top = 0;
  try {
    fn();
  } finally {
    margins.bottom = prevBottom;
    margins.top = prevTop;
  }
}

function paintBg(doc, color) {
  doc.save();
  doc.fillOpacity(1).strokeOpacity(1);
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(color || COLORS.paper);
  doc.restore();
  doc.fillOpacity(1).strokeOpacity(1);
}

function drawFooter(doc, pageNum, totalPages) {
  withFooterSafe(doc, function () {
    var y = doc.page.height - 26;
    doc.save();
    doc.fillOpacity(1).strokeOpacity(1);
    doc.strokeColor(COLORS.line).lineWidth(0.7);
    doc.moveTo(48, y - 10).lineTo(doc.page.width - 48, y - 10).stroke();
    doc.fillColor(COLORS.faint).font('Body').fontSize(8);
    doc.text('SoulMetrica', 48, y, { width: 160, lineBreak: false });
    doc.text(String(pageNum) + ' / ' + String(totalPages), doc.page.width - 48 - 72, y, {
      width: 72,
      align: 'right',
      lineBreak: false
    });
    doc.restore();
  });
}

function ensureSpace(doc, need) {
  if (doc.y + need > doc.page.height - 70) {
    doc.addPage();
    paintBg(doc, COLORS.paper);
    resetTextCursor(doc, 56);
  }
}

function isCoverChapter(chapter) {
  var t = String((chapter && chapter.title) || '').toLowerCase();
  return chapter && (chapter.num === 1 || /облож/.test(t));
}

/** Remove sample/demo name «Аблай» and polish leftovers. */
function scrubAblay(text) {
  var s = String(text || '');
  // \b does not work with Cyrillic in JS without unicode property escapes
  s = s.replace(/Абла[йяюе]/gi, '');
  s = s.replace(/Ablai?/gi, '');
  s = s.replace(/Для\s+,/g, '');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s+([,.!?;:])/g, '$1');
  s = s.replace(/^\s*,\s*/gm, '');
  s = s.replace(/(^|[.!?]\s*)([а-яё])/gu, function (_, a, b) {
    return a + b.toUpperCase();
  });
  return s.trim();
}

function polar(cx, cy, r, angleDeg) {
  var a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function resetTextCursor(doc, y) {
  doc.x = doc.page.margins.left;
  if (typeof y === 'number') doc.y = y;
}

function drawLifeWheel(doc, order) {
  var calc = require('./chart-calc');
  var data = calc.sphereScores(order || {});
  doc.addPage();
  paintBg(doc, COLORS.warm);
  doc.fillOpacity(1);
  resetTextCursor(doc, 48);

  var cx = doc.page.width / 2;
  var cy = 360;
  var rMax = 150;
  var n = data.strong.length;

  doc.fillColor(COLORS.gold).font('Display').fontSize(11);
  doc.text('КАРТА СФЕР · ПО ТВОИМ ДАННЫМ', 48, 48, {
    width: doc.page.width - 96,
    align: 'center',
    lineBreak: false
  });

  [0.2, 0.4, 0.6, 0.8, 1].forEach(function (t) {
    doc.circle(cx, cy, rMax * t).strokeColor(COLORS.goldSoft).lineWidth(0.8).stroke();
  });

  for (var i = 0; i < n; i++) {
    var ang = (360 / n) * i;
    var tip = polar(cx, cy, rMax, ang);
    doc
      .moveTo(cx, cy)
      .lineTo(tip.x, tip.y)
      .strokeColor(COLORS.goldSoft)
      .lineWidth(0.7)
      .stroke();
    doc.circle(tip.x, tip.y, 3).fill(COLORS.gold);
    var lab = polar(cx, cy, rMax + 28, ang);
    doc.fillColor(COLORS.soft).font('Body').fontSize(7);
    doc.text(data.spheres[i].label, lab.x - 40, lab.y - 4, {
      width: 80,
      align: 'center',
      lineBreak: false
    });
  }

  function drawPoly(values, stroke, fillRgb) {
    values.forEach(function (v, idx) {
      var p = polar(cx, cy, (Math.max(0, Math.min(10, v)) / 10) * rMax, (360 / n) * idx);
      if (idx === 0) doc.moveTo(p.x, p.y);
      else doc.lineTo(p.x, p.y);
    });
    doc.closePath();
    if (fillRgb) {
      doc.fillOpacity(0.18).fillColor(fillRgb).fill();
      doc.fillOpacity(1);
      values.forEach(function (v, idx) {
        var p = polar(cx, cy, (Math.max(0, Math.min(10, v)) / 10) * rMax, (360 / n) * idx);
        if (idx === 0) doc.moveTo(p.x, p.y);
        else doc.lineTo(p.x, p.y);
      });
      doc.closePath();
    }
    doc.strokeColor(stroke).lineWidth(1.7).stroke();
  }

  drawPoly(data.weak, '#8c6eb4', '#8c6eb4');
  drawPoly(data.strong, COLORS.gold, null);

  // Легенда внутри безопасной зоны — иначе PDFKit выносит на новую страницу
  withFooterSafe(doc, function () {
    var ly = 752;
    doc.circle(200, ly + 3, 4).fill(COLORS.gold);
    doc.fillColor(COLORS.soft).font('Body').fontSize(9);
    doc.text('Сильные стороны', 210, ly, { lineBreak: false });
    doc.circle(340, ly + 3, 4).fill('#8c6eb4');
    doc.text('Зоны роста', 350, ly, { lineBreak: false });
  });
  resetTextCursor(doc, 56);
}

function drawDestinyNode(doc, x, y, value, label, variant) {
  var r = variant === 'core' ? 22 : variant === 'mid' ? 15 : 18;
  var fill = variant === 'core' ? COLORS.gold : COLORS.warm;
  doc.circle(x, y, r).fillAndStroke(fill, COLORS.gold);
  doc.fillColor(variant === 'core' ? '#FFFFFF' : COLORS.ink).font('Display').fontSize(variant === 'core' ? 16 : 13);
  doc.text(String(value), x - r, y - 7, {
    width: r * 2,
    align: 'center',
    lineBreak: false
  });
  if (label) {
    doc.fillColor(COLORS.faint).font('Body').fontSize(7);
    doc.text(label, x - 28, y + r + 4, { width: 56, align: 'center', lineBreak: false });
  }
}

function drawDestinyMatrixPage(doc, order) {
  var calc = require('./chart-calc');
  var m = calc.destinyMatrix(order || {});
  var p = m.points;
  ensureSpace(doc, 340);
  resetTextCursor(doc, doc.y);

  var startY = doc.y;
  doc.fillColor(COLORS.gold).font('Display').fontSize(11);
  doc.text('МАТРИЦА СУДЬБЫ · ' + m.dateStr, 48, startY, {
    width: doc.page.width - 96,
    align: 'center',
    lineBreak: false
  });

  var cx = doc.page.width / 2 - 40;
  var cy = startY + 170;
  var R = 118;
  var A = { x: cx, y: cy - R };
  var B = { x: cx - R, y: cy };
  var C = { x: cx + R, y: cy };
  var D = { x: cx, y: cy + R };
  var E = { x: cx, y: cy };
  var F = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  var G = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  var H = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  var I = { x: (C.x + D.x) / 2, y: (C.y + D.y) / 2 };

  function edge(a, b) {
    doc.moveTo(a.x, a.y).lineTo(b.x, b.y).strokeColor(COLORS.goldSoft).lineWidth(1.2).stroke();
  }
  edge(A, B);
  edge(B, D);
  edge(D, C);
  edge(C, A);
  edge(A, D);
  edge(B, C);
  edge(F, H);
  edge(H, I);
  edge(I, G);
  edge(G, F);

  // внутренний квадрат комфорта
  doc
    .moveTo(F.x, F.y)
    .lineTo(H.x, H.y)
    .lineTo(I.x, I.y)
    .lineTo(G.x, G.y)
    .closePath()
    .fillOpacity(0.08)
    .fillColor(COLORS.gold)
    .fill()
    .fillOpacity(1);
  drawDestinyNode(doc, A.x, A.y, p.A, 'День', 'corner');
  drawDestinyNode(doc, B.x, B.y, p.B, 'Месяц', 'corner');
  drawDestinyNode(doc, C.x, C.y, p.C, 'Год', 'corner');
  drawDestinyNode(doc, D.x, D.y, p.D, 'Судьба', 'corner');
  drawDestinyNode(doc, F.x, F.y, p.F, '', 'mid');
  drawDestinyNode(doc, G.x, G.y, p.G, '', 'mid');
  drawDestinyNode(doc, H.x, H.y, p.H, '', 'mid');
  drawDestinyNode(doc, I.x, I.y, p.I, '', 'mid');
  drawDestinyNode(doc, E.x, E.y, p.E, 'Комфорт', 'core');

  // side panel purposes
  var px = doc.page.width - 150;
  var py = startY + 70;
  doc.fillColor(COLORS.gold).font('Display').fontSize(9);
  doc.text('ПРЕДНАЗНАЧЕНИЕ', px, py, { width: 100, lineBreak: false });
  doc.fillColor(COLORS.ink).font('Display').fontSize(22);
  doc.text(String(m.purposes.general), px, py + 22, { width: 100, lineBreak: false });
  doc.fillColor(COLORS.faint).font('Body').fontSize(7);
  doc.text('общее', px, py + 48, { width: 100, lineBreak: false });
  doc.fillColor(COLORS.ink).font('Display').fontSize(14);
  doc.text(m.purposes.personal + ' · ' + m.purposes.social, px, py + 72, {
    width: 100,
    lineBreak: false
  });
  doc.fillColor(COLORS.faint).font('Body').fontSize(7);
  doc.text('личное · соц.', px, py + 92, { width: 100, lineBreak: false });
  doc.fillColor(COLORS.ink).font('Display').fontSize(14);
  doc.text(String(m.purposes.planetary), px, py + 116, { width: 100, lineBreak: false });
  doc.fillColor(COLORS.faint).font('Body').fontSize(7);
  doc.text('планетарное', px, py + 136, { width: 100, lineBreak: false });

  resetTextCursor(doc, cy + R + 36);
  doc.fillColor(COLORS.soft).font('BodyI').fontSize(9);
  doc.text('Ромб собран по дате рождения (арканы 1–22). Центр — зона комфорта.', 48, doc.y, {
    width: doc.page.width - 96,
    align: 'center',
    lineBreak: false
  });
  resetTextCursor(doc, doc.y + 22);
}

function drawPsychomatrixPage(doc, order) {
  var calc = require('./chart-calc');
  var m = calc.pythagorasMatrix(order || {});
  ensureSpace(doc, 280);
  resetTextCursor(doc, doc.y);

  var startY = doc.y;
  doc.fillColor(COLORS.gold).font('Display').fontSize(11);
  doc.text('ПСИХОМАТРИЦА · ' + m.dateStr, 48, startY, {
    width: doc.page.width - 96,
    align: 'center',
    lineBreak: false
  });

  var cell = 58;
  var gap = 10;
  var totalW = 3 * cell + 2 * gap;
  var ox = (doc.page.width - totalW) / 2;
  var oy = startY + 28;

  m.cells.forEach(function (row, ri) {
    row.forEach(function (c, ci) {
      var x = ox + ci * (cell + gap);
      var y = oy + ri * (cell + gap);
      var fill = c.count === 0 ? '#F5F0E8' : c.count >= 2 ? '#E8D5A8' : '#EBE4F2';
      doc.roundedRect(x, y, cell, cell, 8).fillAndStroke(fill, COLORS.gold);
      doc.fillColor(COLORS.faint).font('Body').fontSize(6);
      doc.text(c.label, x, y + 8, { width: cell, align: 'center', lineBreak: false });
      doc.fillColor(COLORS.ink).font('Display').fontSize(c.count ? 16 : 14);
      doc.text(c.marks, x, y + cell / 2 + 2, { width: cell, align: 'center', lineBreak: false });
    });
  });

  var linesY = oy + 3 * (cell + gap) + 14;
  var items = [
    ['Самооценка ' + m.lines.selfEsteem, 'Деньги ' + m.lines.money, 'Талант ' + m.lines.talent],
    ['Цель ' + m.lines.goal, 'Семья ' + m.lines.family, 'Стабильность ' + m.lines.stability]
  ];
  items.forEach(function (row, ri) {
    row.forEach(function (label, ci) {
      doc.fillColor(COLORS.soft).font('Body').fontSize(8);
      doc.text(label, 55 + ci * 165, linesY + ri * 16, {
        width: 155,
        align: 'center',
        lineBreak: false
      });
    });
  });

  resetTextCursor(doc, linesY + 44);
  doc.fillColor(COLORS.soft).font('BodyI').fontSize(9);
  doc.text('Плотность клеток — опора. Пустые — зона внимания и развития.', 48, doc.y, {
    width: doc.page.width - 96,
    align: 'center',
    lineBreak: false
  });
  resetTextCursor(doc, doc.y + 20);
}

function drawDualSelf(doc) {
  ensureSpace(doc, 140);
  resetTextCursor(doc, doc.y);
  var y = doc.y + 10;
  var cx1 = 180;
  var cx2 = 415;
  var cy = y + 55;
  doc.circle(cx1, cy, 48).strokeColor(COLORS.goldSoft).lineWidth(1.5).stroke();
  doc.circle(cx2, cy, 48).strokeColor(COLORS.gold).lineWidth(1.8).stroke();
  doc.circle(297, cy, 22).fillAndStroke(COLORS.goldSoft, COLORS.gold);
  doc.fillColor(COLORS.ink).font('Display').fontSize(13);
  doc.text('Снаружи', cx1 - 40, cy - 8, { width: 80, align: 'center', lineBreak: false });
  doc.text('Внутри', cx2 - 40, cy - 8, { width: 80, align: 'center', lineBreak: false });
  doc.fillColor(COLORS.gold).font('DisplayI').fontSize(10);
  doc.text('стык', 277, cy - 5, { width: 40, align: 'center', lineBreak: false });
  doc.fillColor(COLORS.faint).font('Body').fontSize(8);
  doc.text('форма · роль', cx1 - 40, cy + 12, { width: 80, align: 'center', lineBreak: false });
  doc.text('мотив · конфликт', cx2 - 40, cy + 12, { width: 80, align: 'center', lineBreak: false });
  resetTextCursor(doc, y + 130);
}

function splitParts(text) {
  var chunks = String(text || '')
    .split(/\n{2,}/)
    .map(function (c) {
      return c.trim();
    })
    .filter(Boolean);
  var lead = '';
  var anchor = '';
  var bridge = '';
  var paragraphs = [];
  chunks.forEach(function (c, idx) {
    var isQuote = /^[«"]/.test(c) || (c.length < 200 && /^[«"].+[»"]$/.test(c.replace(/\n/g, ' ')));
    var isBridge =
      idx === chunks.length - 1 && c.length < 220 && /(дальше|туда|слой|карта)/i.test(c);
    if (isQuote && !anchor) {
      anchor = c.replace(/^["«]\s*/, '').replace(/\s*["»]$/, '');
      return;
    }
    if (isBridge) {
      bridge = c;
      return;
    }
    paragraphs.push(c);
  });
  if (paragraphs.length >= 2 && paragraphs[0].length < 150) lead = paragraphs.shift();
  return { lead: lead, paragraphs: paragraphs, anchor: anchor, bridge: bridge };
}

function writeBody(doc, text) {
  var parts = splitParts(scrubAblay(text));
  var fullW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  resetTextCursor(doc);

  if (parts.lead) {
    ensureSpace(doc, 48);
    resetTextCursor(doc);
    doc.fillOpacity(1).fillColor(COLORS.soft).font('DisplayI').fontSize(14);
    doc.text(parts.lead, doc.page.margins.left, doc.y, { width: fullW, lineGap: 4 });
    doc.moveDown(0.7);
  }
  parts.paragraphs.forEach(function (p) {
    ensureSpace(doc, 48);
    resetTextCursor(doc);
    doc.fillOpacity(1).fillColor(COLORS.ink).font('Body').fontSize(10.5);
    doc.text(p, doc.page.margins.left, doc.y, {
      width: fullW,
      lineGap: 3.5,
      paragraphGap: 8,
      align: 'left'
    });
    doc.moveDown(0.45);
  });
  if (parts.anchor) {
    ensureSpace(doc, 70);
    resetTextCursor(doc);
    doc.moveDown(0.3);
    doc.strokeColor(COLORS.goldSoft).lineWidth(1);
    doc.moveTo(80, doc.y).lineTo(doc.page.width - 80, doc.y).stroke();
    doc.moveDown(0.55);
    resetTextCursor(doc);
    doc.fillOpacity(1).fillColor(COLORS.gold).font('DisplayI').fontSize(13);
    doc.text(parts.anchor, 60, doc.y, { width: doc.page.width - 120, align: 'center', lineGap: 3 });
    doc.moveDown(0.45);
    doc.strokeColor(COLORS.goldSoft).lineWidth(1);
    doc.moveTo(80, doc.y).lineTo(doc.page.width - 80, doc.y).stroke();
    doc.moveDown(0.7);
  }
  if (parts.bridge) {
    ensureSpace(doc, 40);
    resetTextCursor(doc);
    doc.fillOpacity(1).fillColor(COLORS.faint).font('BodyI').fontSize(9.5);
    doc.text(scrubAblay(parts.bridge), doc.page.margins.left, doc.y, {
      width: fullW,
      lineGap: 3
    });
  }
  resetTextCursor(doc);
}

function buildReadingPdf(reading, order) {
  return new Promise(function (resolve, reject) {
    try {
      var chapters = format.getChapters(reading).filter(function (c) {
        return String(c.text || '').replace(/\s+/g, '').length >= 40;
      });

      var doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        autoFirstPage: true,
        margins: { top: 56, bottom: 64, left: 48, right: 48 },
        info: {
          Title: reading.title || 'Разбор SoulMetrica',
          Author: 'SoulMetrica',
          Subject: reading.order_id || ''
        }
      });

      var chunks = [];
      doc.on('data', function (c) {
        chunks.push(c);
      });
      doc.on('end', function () {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // DejaVu: полный кириллический набор. Manrope variable в PDFKit даёт □ на части букв.
      doc.registerFont('Body', fontPath('DejaVuSans.ttf'));
      doc.registerFont('BodyI', fontPath('DejaVuSans.ttf'));
      doc.registerFont('Bold', fontPath('DejaVuSans-Bold.ttf'));
      doc.registerFont('Display', fontPath('CormorantGaramond-Regular.ttf'));
      doc.registerFont('DisplayI', fontPath('CormorantGaramond-Italic.ttf'));
      doc.registerFont('DisplayM', fontPath('CormorantGaramond-Medium.ttf'));

      var rawName = ((order && order.customer_name) || '').trim();
      var name = /абла/i.test(rawName) ? '' : rawName;
      var dateStr = '';
      if (order && order.birth_day && order.birth_month && order.birth_year) {
        dateStr =
          String(order.birth_day).padStart(2, '0') +
          '.' +
          String(order.birth_month).padStart(2, '0') +
          '.' +
          order.birth_year;
      }

      var coverCh = chapters.find(isCoverChapter);
      var bodyChapters = chapters.filter(function (c) {
        return !isCoverChapter(c);
      });
      if (!bodyChapters.length) bodyChapters = chapters;

      var coverText = scrubAblay((coverCh && coverCh.text) || '');
      var epi = '';
      String(coverText)
        .split(/\n+/)
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean)
        .forEach(function (p) {
          if (/^[«"]/.test(p) && !epi) epi = p;
        });
      if (!epi) {
        var m = coverText.match(/[«"]([^«»"]{12,160})[»"]/);
        if (m) epi = '«' + m[1] + '»';
      }
      if (!epi) epi = '«Читай медленно. Там, где захочется спорить — обычно самое точное.»';

      // Cover — clean paper, no muddy overlays
      paintBg(doc, COLORS.warm);
      doc.fillOpacity(1).fillColor(COLORS.gold).font('Display').fontSize(11);
      doc.text('SOULMETRICA', 48, 130, {
        align: 'center',
        width: doc.page.width - 96,
        characterSpacing: 4
      });

      doc.moveDown(2.2);
      doc.fillOpacity(1).fillColor(COLORS.ink).font('Display').fontSize(28);
      doc.text(reading.title || 'Полный разбор личности и жизни', {
        align: 'center',
        width: doc.page.width - 96,
        lineGap: 4
      });

      if (name) {
        doc.moveDown(0.7);
        doc.fillOpacity(1).fillColor(COLORS.gold).font('DisplayI').fontSize(18);
        doc.text('Для ' + name, { align: 'center', width: doc.page.width - 96 });
      }

      doc.moveDown(1.8);
      doc.strokeColor(COLORS.goldSoft).lineWidth(1);
      doc.moveTo(doc.page.width / 2 - 60, doc.y).lineTo(doc.page.width / 2 + 60, doc.y).stroke();
      doc.moveDown(1);
      doc.fillOpacity(1).fillColor(COLORS.ink).font('DisplayI').fontSize(14);
      doc.text(epi, { align: 'center', width: doc.page.width - 140, lineGap: 4 });

      if (dateStr) {
        withFooterSafe(doc, function () {
          doc.fillOpacity(1).fillColor(COLORS.faint).font('Body').fontSize(9);
          doc.text(dateStr, 48, doc.page.height - 52, {
            width: doc.page.width - 96,
            align: 'center',
            lineBreak: false
          });
        });
      }

      // Page 2: life wheel (wow)
      drawLifeWheel(doc, order);

      bodyChapters.forEach(function (chapter, idx) {
        doc.addPage();
        paintBg(doc, COLORS.paper);
        doc.fillOpacity(1).strokeOpacity(1);
        resetTextCursor(doc, 56);

        doc.fillColor(COLORS.goldSoft).font('Display').fontSize(34);
        doc.text(htmlReading.roman(idx + 1), doc.page.margins.left, doc.y, {
          width: doc.page.width - 96,
          lineBreak: false
        });
        doc.moveDown(0.25);

        doc.fillColor(COLORS.ink).font('DisplayM').fontSize(22);
        doc.text(scrubAblay(chapter.title), doc.page.margins.left, doc.y, {
          width: doc.page.width - 96,
          lineGap: 2
        });
        doc.moveDown(0.5);
        resetTextCursor(doc);
        doc.strokeColor(COLORS.line).lineWidth(1);
        doc.moveTo(48, doc.y).lineTo(doc.page.width - 48, doc.y).stroke();
        doc.moveDown(0.9);
        resetTextCursor(doc);

        if (/ядр|личност/i.test(chapter.title || '')) {
          drawDestinyMatrixPage(doc, order);
          drawDualSelf(doc);
        } else if (/блок/i.test(chapter.title || '')) {
          drawPsychomatrixPage(doc, order);
        }

        writeBody(doc, chapter.text);
      });

      var range = doc.bufferedPageRange();
      for (var i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        drawFooter(doc, i + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildReadingPdf: buildReadingPdf, scrubAblay: scrubAblay };
