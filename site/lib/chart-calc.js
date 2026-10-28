'use strict';

/**
 * Диаграммы в разборе — логика (для команды):
 *
 * 1) КОЛЕСО СФЕР (radar) — стр.1–2 (после обложки / во введении)
 *    Зачем: сразу вау-эффект «карта жизни», без жаргона систем.
 *    Откуда: Life Path + день рождения + частоты цифр даты (матрица Пифагора)
 *    + личный год. 9 систем из движка сворачиваем в 10 жизненных сфер.
 *
 * 2) МАТРИЦА ЧИСЕЛ — после «Ядро личности»
 *    Зачем: визуальный каркас «сильные / пустые клетки» без терминов.
 *    Откуда: квадрат Пифагора 3×3 по дате рождения.
 *
 * 3) ДУАЛ «снаружи / внутри» — после талантов или ядра (по продукту)
 *    Зачем: визуализация главного конфликта.
 *    Откуда: LP + birthday parity (не гадание — устойчивый паттерн даты).
 *
 * Не вставляем Midjourney-фото: они нестабильны и не привязаны к расчёту.
 * Вау = точная персональная диаграмма + стиль эталона.
 */

var SPHERES = [
  { key: 'growth', label: 'Личностный рост', digit: 1 },
  { key: 'health', label: 'Здоровье', digit: 4 },
  { key: 'money', label: 'Финансы', digit: 8 },
  { key: 'career', label: 'Карьера и дело', digit: 1 },
  { key: 'love', label: 'Отношения', digit: 2 },
  { key: 'circle', label: 'Окружение', digit: 9 },
  { key: 'create', label: 'Творчество', digit: 3 },
  { key: 'emotion', label: 'Эмоции', digit: 5 },
  { key: 'home', label: 'Дом и комфорт', digit: 6 },
  { key: 'spirit', label: 'Духовность', digit: 7 }
];

function digitsOfDate(day, month, year) {
  var s = String(day).padStart(2, '0') + String(month).padStart(2, '0') + String(year);
  return s.replace(/\D/g, '').split('').map(Number).filter(function (n) {
    return n >= 1 && n <= 9;
  });
}

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

function lifePath(day, month, year) {
  return reduceNum(Number(day) + Number(month) + Number(year));
}

function digitCounts(day, month, year) {
  var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  digitsOfDate(day, month, year).forEach(function (d) {
    counts[d] += 1;
  });
  return counts;
}

function personalYear(day, month, yearNow) {
  return reduceNum(Number(day) + Number(month) + Number(yearNow));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function sphereScores(order) {
  var day = Number(order && order.birth_day) || 1;
  var month = Number(order && order.birth_month) || 1;
  var year = Number(order && order.birth_year) || 1990;
  var counts = digitCounts(day, month, year);
  var lp = lifePath(day, month, year);
  var lpCore = lp === 11 || lp === 22 || lp === 33 ? reduceNum(lp) : lp;
  var bday = Number(day);
  var py = personalYear(day, month, new Date().getFullYear());

  var strong = SPHERES.map(function (sp, idx) {
    var base = 4.2 + counts[sp.digit] * 1.55;
    if (lpCore === sp.digit) base += 1.8;
    if (py === sp.digit) base += 1.1;
    if (bday % 9 === sp.digit % 9) base += 0.6;
    // slight stable variance by sphere index + date hash
    var salt = ((day * 17 + month * 31 + year + idx * 13) % 7) * 0.18;
    return clamp(Math.round((base + salt) * 10) / 10, 2.5, 10);
  });

  // «слабые» = зоны роста (зеркало), смягчённое
  var weak = strong.map(function (v) {
    return clamp(Math.round((11.2 - v) * 10) / 10, 2, 9);
  });

  return {
    spheres: SPHERES,
    strong: strong,
    weak: weak,
    meta: {
      lifePath: lp,
      personalYear: py,
      birthday: bday,
      counts: counts
    }
  };
}

function pythagorasMatrix(order) {
  var day = Number(order && order.birth_day) || 1;
  var month = Number(order && order.birth_month) || 1;
  var year = Number(order && order.birth_year) || 1990;
  var counts = digitCounts(day, month, year);
  // classic layout:
  // 3 6 9
  // 2 5 8
  // 1 4 7
  var labels = [
    ['Интерес', 'Труд', 'Память'],
    ['Энергия', 'Логика', 'Долг'],
    ['Характер', 'Здоровье', 'Удача']
  ];
  var cells = [
    [3, 6, 9],
    [2, 5, 8],
    [1, 4, 7]
  ];
  var mapped = cells.map(function (row, ri) {
    return row.map(function (d, ci) {
      var count = counts[d] || 0;
      return {
        digit: d,
        count: count,
        label: labels[ri][ci],
        marks: count ? String(d).repeat(Math.min(count, 4)) : '—'
      };
    });
  });
  // линии: столбцы 1-4-7 характер/самооценка и т.д. по классике
  function lineLen(a, b, c) {
    return (counts[a] || 0) + (counts[b] || 0) + (counts[c] || 0);
  }
  return {
    cells: mapped,
    counts: counts,
    lines: {
      selfEsteem: lineLen(1, 2, 3), // характер-энергия-интерес
      money: lineLen(4, 5, 6),
      talent: lineLen(7, 8, 9),
      goal: lineLen(1, 4, 7), // целеустремлённость
      family: lineLen(2, 5, 8),
      stability: lineLen(3, 6, 9),
      temper: lineLen(3, 5, 7),
      spirit: lineLen(1, 5, 9)
    },
    dateStr:
      String(day).padStart(2, '0') +
      '.' +
      String(month).padStart(2, '0') +
      '.' +
      year
  };
}

/**
 * Матрица судьбы (арканы 1–22) — формула как в open-source DestinyMatrix
 * (Alesia-15 / типовой calc: A=день, B=месяц, C=год, далее суммы).
 */
function reduceArcana(number) {
  var num = Math.abs(Number(number) || 0);
  if (num > 22) {
    num = (num % 10) + Math.floor(num / 10);
  }
  return num || 0;
}

function calculateYearArcana(year) {
  var y = 0;
  year = Math.abs(Number(year) || 0);
  while (year > 0) {
    y += year % 10;
    year = Math.floor(year / 10);
  }
  return reduceArcana(y);
}

function destinyMatrix(order) {
  var day = Number(order && order.birth_day) || 1;
  var month = Number(order && order.birth_month) || 1;
  var year = Number(order && order.birth_year) || 1990;

  var A = reduceArcana(day);
  var B = month; // месяц уже 1–12
  if (B > 22) B = reduceArcana(B);
  var C = calculateYearArcana(year);
  var D = reduceArcana(A + B + C);
  var E = reduceArcana(A + B + C + D);
  var F = reduceArcana(A + B);
  var G = reduceArcana(B + C);
  var H = reduceArcana(D + A);
  var I = reduceArcana(C + D);
  var J = reduceArcana(D + E);
  var N = reduceArcana(C + E);
  var L = reduceArcana(J + N);
  var M = reduceArcana(L + N);
  var K = reduceArcana(J + L);
  var S = reduceArcana(A + E);
  var T = reduceArcana(B + E);
  var U = reduceArcana(F + G + H + I);
  var V = reduceArcana(E + U);

  var sky = reduceArcana(A + D);
  var earth = reduceArcana(B + C);
  var personal = reduceArcana(sky + earth);
  var male = reduceArcana(A + B);
  var female = reduceArcana(C + D);
  var social = reduceArcana(male + female);
  var general = reduceArcana(personal + social);
  var planetary = reduceArcana(personal + social + general);

  return {
    dateStr:
      String(day).padStart(2, '0') +
      '.' +
      String(month).padStart(2, '0') +
      '.' +
      year,
    // ромб: A верх, B лево, C право, D низ, E центр квадрата
    points: {
      A: A,
      B: B,
      C: C,
      D: D,
      E: E,
      F: F,
      G: G,
      H: H,
      I: I,
      J: J,
      K: K,
      L: L,
      M: M,
      N: N,
      S: S,
      T: T,
      U: U,
      V: V
    },
    purposes: {
      sky: sky,
      earth: earth,
      personal: personal,
      social: social,
      general: general,
      planetary: planetary
    },
    labels: {
      A: 'День',
      B: 'Месяц',
      C: 'Год',
      D: 'Судьба',
      E: 'Комфорт',
      U: 'Центр'
    }
  };
}

module.exports = {
  SPHERES: SPHERES,
  lifePath: lifePath,
  sphereScores: sphereScores,
  pythagorasMatrix: pythagorasMatrix,
  destinyMatrix: destinyMatrix,
  reduceArcana: reduceArcana,
  digitCounts: digitCounts
};
