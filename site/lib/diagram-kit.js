'use strict';

/**
 * 9 SVG-диаграмм из визуального кита (тёмная тема Ablay premium).
 * TZ: radarPolygon — единственная с динамическими координатами.
 */

var SPHERE_META = [
  { key: 'growth', label: 'Личностный рост', icon: '✦', iconSize: 14 },
  { key: 'health', label: 'Здоровье', icon: '❤', iconSize: 13 },
  { key: 'finance', label: 'Финансы', icon: '◉', iconSize: 13 },
  { key: 'career', label: 'Карьера и дело', icon: '▲', iconSize: 13 },
  { key: 'relations', label: 'Отношения', icon: '∞', iconSize: 13 },
  { key: 'circle', label: 'Окружение', icon: '✧', iconSize: 13 },
  { key: 'creativity', label: 'Творчество', icon: '❈', iconSize: 13 },
  { key: 'emotions', label: 'Эмоции', icon: '☾', iconSize: 13 },
  { key: 'home', label: 'Дом и комфорт', icon: '⌂', iconSize: 13 },
  { key: 'spirit', label: 'Духовность', icon: '☯', iconSize: 13 }
];

var RADAR_LABEL_POS = [
  { lx: 250, ly: 20, ax: 'middle', ix: 250, iy: 44 },
  { lx: 400, ly: 70, ax: 'start', ix: 374, iy: 82 },
  { lx: 472, ly: 192, ax: 'start', ix: 452, iy: 188 },
  { lx: 472, ly: 316, ax: 'start', ix: 452, iy: 312 },
  { lx: 404, ly: 440, ax: 'start', ix: 380, iy: 424 },
  { lx: 250, ly: 496, ax: 'middle', ix: 250, iy: 464 },
  { lx: 96, ly: 440, ax: 'end', ix: 120, iy: 424 },
  { lx: 28, ly: 316, ax: 'end', ix: 48, iy: 312 },
  { lx: 28, ly: 192, ax: 'end', ix: 48, iy: 188 },
  { lx: 100, ly: 70, ax: 'end', ix: 126, iy: 82 }
];

function radarVertex(value, index, cx, cy, maxR) {
  cx = cx || 250;
  cy = cy || 250;
  maxR = maxR || 200;
  var r = (Math.max(0, Math.min(10, Number(value) || 0)) / 10) * maxR;
  var angle = ((-90 + index * 36) * Math.PI) / 180;
  return {
    x: Math.round((cx + r * Math.cos(angle)) * 10) / 10,
    y: Math.round((cy + r * Math.sin(angle)) * 10) / 10
  };
}

function radarPolygon(values, cx, cy, maxR) {
  var vals = Array.isArray(values) ? values : [];
  while (vals.length < 10) vals.push(5);
  return vals
    .slice(0, 10)
    .map(function (v, i) {
      var p = radarVertex(v, i, cx, cy, maxR);
      return p.x + ',' + p.y;
    })
    .join(' ');
}

function figureWrap(capTop, svg, caption) {
  return (
    '<div class="figure">' +
    '<div class="cap-top">' +
    capTop +
    '</div>' +
    svg +
    (caption ? '<div class="d-cap">' + caption + '</div>' : '') +
    '</div>'
  );
}

function diagramArc(caption) {
  var svg =
    '<svg viewBox="0 0 680 220" role="img" aria-label="Дуга разбора из 12 блоков в трёх фазах">' +
    '<rect x="40" y="30" width="200" height="150" fill="#9a7ff0" opacity=".07"/>' +
    '<rect x="240" y="30" width="200" height="150" fill="#9a7ff0" opacity=".14"/>' +
    '<rect x="440" y="30" width="200" height="150" fill="#9a7ff0" opacity=".07"/>' +
    '<text x="140" y="22" text-anchor="middle" class="lbl-s">Узнавание</text>' +
    '<text x="340" y="22" text-anchor="middle" class="lbl-s">Дискомфорт</text>' +
    '<text x="540" y="22" text-anchor="middle" class="lbl-s">Энергия действия</text>' +
    '<path class="stroke" d="M40,150 C200,150 210,70 340,70 C470,70 480,40 640,40" filter="url(#glow)"/>' +
    '<circle class="dot-o" cx="40" cy="150" r="5"/><circle class="dot-o" cx="94" cy="132" r="5"/>' +
    '<circle class="dot-o" cx="150" cy="112" r="5"/><circle class="dot-o" cx="215" cy="88" r="5"/>' +
    '<circle class="dot-o" cx="280" cy="75" r="5"/><circle class="dot-o" cx="340" cy="70" r="5"/>' +
    '<circle class="dot-o" cx="400" cy="66" r="5"/><circle class="dot-o" cx="460" cy="58" r="5"/>' +
    '<circle class="dot-o" cx="515" cy="50" r="5"/><circle class="dot-o" cx="565" cy="46" r="5"/>' +
    '<circle class="dot-o" cx="605" cy="43" r="5"/><circle class="dot" cx="640" cy="40" r="6"/>' +
    '<text x="40" y="200" text-anchor="middle" class="lbl-s">Характер</text>' +
    '<text x="340" y="200" text-anchor="middle" class="lbl-s">Блоки · циклы</text>' +
    '<text x="640" y="200" text-anchor="middle" class="lbl-s">Миссия</text>' +
    '</svg>';
  return figureWrap('Путь разбора · три фазы', svg, caption || 'Ты входишь через узнавание — и выходишь через выбор.');
}

function diagramRadar(spheres, caption) {
  var values = (spheres || []).map(function (s) {
    return Number(s.value) || 5;
  });
  while (values.length < 10) values.push(5);
  var poly = radarPolygon(values);
  var dots = values
    .map(function (v, i) {
      var p = radarVertex(v, i);
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.5"/>';
    })
    .join('');

  var labels = SPHERE_META.map(function (sp, i) {
    var pos = RADAR_LABEL_POS[i];
    var m = SPHERE_META[i];
    return (
      '<circle cx="' +
      pos.ix +
      '" cy="' +
      pos.iy +
      '" r="15" fill="#171c46" stroke="#e2ba75"/>' +
      '<text x="' +
      pos.ix +
      '" y="' +
      (pos.iy + 5) +
      '" text-anchor="middle" font-size="' +
      m.iconSize +
      '" fill="#f4d79a">' +
      m.icon +
      '</text>' +
      '<text x="' +
      pos.lx +
      '" y="' +
      pos.ly +
      '" text-anchor="' +
      pos.ax +
      '" class="lbl-s">' +
      sp.label +
      '</text>'
    );
  }).join('');

  var svg =
    '<svg viewBox="0 0 500 500" role="img" aria-label="Радар-диаграмма силы в десяти сферах жизни">' +
    '<g fill="none" stroke="#e2ba75" stroke-opacity=".16">' +
    '<circle cx="250" cy="250" r="40"/><circle cx="250" cy="250" r="80"/>' +
    '<circle cx="250" cy="250" r="120"/><circle cx="250" cy="250" r="160"/>' +
    '<circle cx="250" cy="250" r="200" stroke-opacity=".3"/>' +
    '</g>' +
    '<g stroke="#e2ba75" stroke-opacity=".14">' +
    '<line x1="250" y1="250" x2="250" y2="50"/><line x1="250" y1="250" x2="368" y2="88"/>' +
    '<line x1="250" y1="250" x2="440" y2="188"/><line x1="250" y1="250" x2="440" y2="312"/>' +
    '<line x1="250" y1="250" x2="368" y2="412"/><line x1="250" y1="250" x2="250" y2="450"/>' +
    '<line x1="250" y1="250" x2="132" y2="412"/><line x1="250" y1="250" x2="60" y2="312"/>' +
    '<line x1="250" y1="250" x2="60" y2="188"/><line x1="250" y1="250" x2="132" y2="88"/>' +
    '</g>' +
    '<g fill="#8f8ab0" font-family="Manrope" font-size="9" text-anchor="middle">' +
    '<text x="250" y="173">4</text><text x="250" y="133">6</text><text x="250" y="93">8</text><text x="250" y="55">10</text>' +
    '</g>' +
    '<polygon points="' +
    poly +
    '" fill="url(#radarfill)" stroke="#c4a9ff" stroke-width="1.6" filter="url(#glow)"/>' +
    '<g fill="#f4d79a" filter="url(#glow)">' +
    dots +
    '</g>' +
    '<g>' +
    labels +
    '</g>' +
    '</svg>';

  return figureWrap('Твой контур силы · 10 сфер', svg, caption);
}

function diagramTriad(caption) {
  var svg =
    '<svg viewBox="0 0 560 300" role="img" aria-label="Три пересекающихся круга">' +
    '<circle cx="215" cy="130" r="95" class="stroke-soft"/>' +
    '<circle cx="345" cy="130" r="95" class="stroke-soft"/>' +
    '<circle cx="280" cy="210" r="95" class="stroke-soft"/>' +
    '<circle cx="280" cy="157" r="6" class="dot"/>' +
    '<text x="150" y="105" text-anchor="middle" class="lbl">каким кажешься</text>' +
    '<text x="410" y="105" text-anchor="middle" class="lbl">кто изнутри</text>' +
    '<text x="280" y="272" text-anchor="middle" class="lbl">кем хочешь стать</text>' +
    '<text x="280" y="150" text-anchor="middle" class="lbl-s">ты</text>' +
    '</svg>';
  return figureWrap('Три слоя · снаружи · внутри · куда идёшь', svg, caption);
}

function diagramForces(bars, caption) {
  var w = bars || [392, 300, 175];
  var svg =
    '<svg viewBox="0 0 640 220" role="img" aria-label="Три горизонтальных полосы разной длины">' +
    '<text x="0" y="34" class="bar-lbl">Входишь и ведёшь</text>' +
    '<text x="0" y="52" class="bar-sub">главная — сила старта</text>' +
    '<rect x="230" y="20" width="410" height="16" rx="8" class="bar-track"/>' +
    '<rect x="230" y="20" width="' +
    w[0] +
    '" height="16" rx="8" class="bar-fill" filter="url(#glow)"/>' +
    '<text x="0" y="104" class="bar-lbl">Видишь систему целиком</text>' +
    '<text x="0" y="122" class="bar-sub">поддерживающая</text>' +
    '<rect x="230" y="90" width="410" height="16" rx="8" class="bar-track"/>' +
    '<rect x="230" y="90" width="' +
    w[1] +
    '" height="16" rx="8" class="bar-fill"/>' +
    '<text x="0" y="174" class="bar-lbl">Держишь людей теплом</text>' +
    '<text x="0" y="192" class="bar-sub">теневая — не считаешь силой</text>' +
    '<rect x="230" y="160" width="410" height="16" rx="8" class="bar-track"/>' +
    '<rect x="230" y="160" width="' +
    w[2] +
    '" height="16" rx="8" class="bar-fill soft"/>' +
    '</svg>';
  return figureWrap('Три силы · главная · опора · тень', svg, caption);
}

function diagramMoney(caption) {
  var svg =
    '<svg viewBox="0 0 640 260" role="img" aria-label="Восходящий поток, упирающийся в линию потолка, и окна года">' +
    '<path d="M120,240 C120,150 200,150 200,90 C200,60 260,60 300,60" class="stroke" stroke-width="1.6" filter="url(#glow)"/>' +
    '<path d="M120,240 C120,160 230,170 250,120 C270,80 300,78 360,72" class="stroke-soft"/>' +
    '<circle cx="120" cy="240" r="5" class="dot"/><text x="120" y="258" text-anchor="middle" class="lbl-s">приход</text>' +
    '<line x1="90" y1="60" x2="420" y2="60" stroke="#e2ba75" stroke-width="1.4" stroke-dasharray="5 5"/>' +
    '<text x="90" y="48" class="lbl">потолок — «стало скучно, значит почти дошёл»</text>' +
    '<line x1="520" y1="40" x2="520" y2="240" class="hair"/>' +
    '<text x="536" y="44" class="lbl-s">год</text>' +
    '<circle cx="520" cy="95" r="6" class="dot"/><text x="536" y="99" class="lbl">окно роста · весна</text>' +
    '<circle cx="520" cy="175" r="6" class="dot"/><text x="536" y="179" class="lbl">окно роста · осень</text>' +
    '<circle cx="520" cy="215" r="5" class="dot-o"/><text x="536" y="219" class="bar-sub">просадка · середина лета</text>' +
    '</svg>';
  return figureWrap('Денежный поток · потолок · окна года', svg, caption);
}

function diagramAxis(caption) {
  var svg =
    '<svg viewBox="0 0 640 130" role="img" aria-label="Горизонтальная ось: сила на одном конце, блок на другом">' +
    '<line x1="60" y1="70" x2="580" y2="70" class="stroke" stroke-width="1.6" filter="url(#glow)"/>' +
    '<circle cx="60" cy="70" r="8" class="dot"/><circle cx="580" cy="70" r="8" class="dot"/>' +
    '<circle cx="320" cy="70" r="4" class="dot-o"/>' +
    '<text x="60" y="46" text-anchor="middle" class="lbl">лёгкость входа</text>' +
    '<text x="60" y="98" text-anchor="middle" class="bar-sub">сила</text>' +
    '<text x="580" y="46" text-anchor="middle" class="lbl">лёгкость выхода</text>' +
    '<text x="580" y="98" text-anchor="middle" class="bar-sub">блок</text>' +
    '<text x="320" y="108" text-anchor="middle" class="lbl-s">один механизм</text>' +
    '</svg>';
  return figureWrap('Одна ось · сила и блок', svg, caption);
}

function diagramLife(cycles, caption) {
  var b1 = (cycles && cycles.b1) || 29;
  var b2 = (cycles && cycles.b2) || 38;
  var b3 = (cycles && cycles.b3) || 47;
  var ch = (cycles && cycles.challenge) || 2;
  var highlight = ch === 2 ? 1 : ch === 3 ? 2 : ch === 4 ? 3 : 0;
  var fills = [0, 1, 2, 3].map(function (i) {
    if (i === highlight) return 'fill="url(#goldgrad)" filter="url(#glow)"';
    return 'fill="#6b5aa8"';
  });
  var svg =
    '<svg viewBox="0 0 660 150" role="img" aria-label="Линия жизни из четырёх сегментов с возрастными границами">' +
    '<line x1="30" y1="80" x2="630" y2="80" class="hair"/>' +
    '<rect x="30" y="72" width="150" height="16" rx="8" ' +
    fills[0] +
    '/>' +
    '<rect x="180" y="72" width="150" height="16" rx="8" ' +
    fills[1] +
    '/>' +
    '<rect x="330" y="72" width="150" height="16" rx="8" ' +
    fills[2] +
    '/>' +
    '<rect x="480" y="72" width="150" height="16" rx="8" ' +
    fills[3] +
    '/>' +
    (highlight === 1
      ? '<rect x="180" y="66" width="150" height="28" rx="6" fill="none" stroke="#e2ba75" stroke-width="1.4"/>'
      : '') +
    (highlight === 1
      ? '<text x="255" y="58" text-anchor="middle" class="lbl-s">цикл-вызов</text>'
      : '') +
    '<text x="30" y="118" text-anchor="middle" class="lbl-s">0</text>' +
    '<text x="180" y="118" text-anchor="middle" class="lbl-s">~' +
    b1 +
    '</text>' +
    '<text x="330" y="118" text-anchor="middle" class="lbl-s">~' +
    b2 +
    '</text>' +
    '<text x="480" y="118" text-anchor="middle" class="lbl-s">~' +
    b3 +
    '</text>' +
    '<text x="105" y="42" text-anchor="middle" class="lbl">Юность</text>' +
    '<text x="255" y="42" text-anchor="middle" class="lbl">Зрелость I</text>' +
    '<text x="405" y="42" text-anchor="middle" class="lbl">Зрелость II</text>' +
    '<text x="555" y="42" text-anchor="middle" class="lbl">Поздний путь</text>' +
    '</svg>';
  return figureWrap('Линия жизни · четыре цикла', svg, caption);
}

function diagramAges(agePoints, peakAge, caption) {
  var pts = Array.isArray(agePoints) && agePoints.length ? agePoints : ['4–9', '12–16', '19–24', '28–30', '35–37', '42–44'];
  var peak = peakAge || '28–30';
  var xs = [70, 180, 300, 410, 510, 610];
  var dots = pts
    .slice(0, 6)
    .map(function (label, i) {
      var isPeak = label === peak;
      var r = isPeak ? 8 : 6;
      var cls = isPeak ? 'dot' : 'dot-o';
      return (
        '<circle cx="' +
        xs[i] +
        '" cy="60" r="' +
        r +
        '" class="' +
        cls +
        '"/>' +
        '<text x="' +
        xs[i] +
        '" y="88" text-anchor="middle" class="lbl-s">' +
        label +
        '</text>'
      );
    })
    .join('');
  var svg =
    '<svg viewBox="0 0 660 120" role="img" aria-label="Пунктирная линия времени с точками возрастных сдвигов">' +
    '<line x1="30" y1="60" x2="630" y2="60" class="hair" stroke-dasharray="3 5"/>' +
    dots +
    '<text x="410" y="40" text-anchor="middle" class="lbl-s">перелом</text>' +
    '</svg>';
  return figureWrap('Точки сдвига · ±2 года', svg, caption);
}

function diagramYear(caption) {
  var svg =
    '<svg viewBox="0 0 660 240" role="img" aria-label="Четыре квартала года и развилка на два пути">' +
    '<rect x="30" y="30" width="140" height="40" rx="8" fill="rgba(255,255,255,.05)" stroke="var(--line)"/>' +
    '<rect x="180" y="30" width="140" height="40" rx="8" fill="rgba(255,255,255,.05)" stroke="var(--line)"/>' +
    '<rect x="330" y="30" width="140" height="40" rx="8" fill="rgba(255,255,255,.05)" stroke="var(--line)"/>' +
    '<rect x="480" y="30" width="140" height="40" rx="8" fill="url(#goldgrad)" filter="url(#glow)"/>' +
    '<text x="100" y="55" text-anchor="middle" class="lbl">I · разгон</text>' +
    '<text x="250" y="55" text-anchor="middle" class="lbl">II · рост</text>' +
    '<text x="400" y="55" text-anchor="middle" class="lbl">III · выбор</text>' +
    '<text x="550" y="55" text-anchor="middle" class="lbl" fill="#22183a">IV · сбор</text>' +
    '<text x="550" y="22" text-anchor="middle" class="lbl-s">главное окно</text>' +
    '<line x1="330" y1="130" x2="440" y2="130" class="stroke" stroke-width="1.6" filter="url(#glow)"/>' +
    '<circle cx="440" cy="130" r="5" class="dot"/>' +
    '<path class="stroke" d="M440,130 C500,130 500,80 570,80"/>' +
    '<path class="stroke-soft" d="M440,130 C500,130 500,180 570,180"/>' +
    '<text x="330" y="122" class="lbl-s">точка выбора года</text>' +
    '<text x="584" y="84" class="lbl">довёл одно → рост</text>' +
    '<text x="584" y="184" class="lbl">начал три → повтор петли</text>' +
    '</svg>';
  return figureWrap('Год по кварталам · развилка', svg, caption);
}

function diagramMap(caption) {
  var svg =
    '<svg viewBox="0 0 560 520" role="img" aria-label="Карта из 12 слоёв вокруг ядра со связками">' +
    '<g class="stroke-soft">' +
    '<line x1="453" y1="130" x2="107" y2="390"/><line x1="107" y1="130" x2="453" y2="390"/>' +
    '<line x1="500" y1="260" x2="60" y2="260"/>' +
    '</g>' +
    '<g class="hair">' +
    '<line x1="280" y1="260" x2="280" y2="70"/><line x1="280" y1="260" x2="453" y2="130"/>' +
    '<line x1="280" y1="260" x2="500" y2="260"/><line x1="280" y1="260" x2="453" y2="390"/>' +
    '<line x1="280" y1="260" x2="280" y2="450"/><line x1="280" y1="260" x2="107" y2="390"/>' +
    '<line x1="280" y1="260" x2="60" y2="260"/><line x1="280" y1="260" x2="107" y2="130"/>' +
    '</g>' +
    '<circle cx="280" cy="260" r="54" fill="url(#core)" opacity=".9"/>' +
    '<circle cx="280" cy="260" r="52" fill="none" stroke="#e2ba75" stroke-width="1.4"/>' +
    '<text x="280" y="256" text-anchor="middle" class="lbl-serif" font-size="21" fill="#22183a">ядро</text>' +
    '<text x="280" y="278" text-anchor="middle" font-family="Manrope" font-size="9" letter-spacing="1.5" fill="#3a2c14">СВОБОДА ↔ ОПОРА</text>' +
    '<g>' +
    '<circle class="dot-o" cx="280" cy="70" r="7"/><text x="280" y="52" text-anchor="middle" class="lbl">Характер</text>' +
    '<circle class="dot-o" cx="453" cy="130" r="7"/><text x="470" y="120" class="lbl">Талант</text>' +
    '<circle class="dot" cx="500" cy="260" r="7"/><text x="512" y="264" class="lbl">Деньги</text>' +
    '<circle class="dot" cx="453" cy="390" r="7"/><text x="470" y="404" class="lbl">Любовь</text>' +
    '<circle class="dot-o" cx="280" cy="450" r="7"/><text x="280" y="472" text-anchor="middle" class="lbl">Реализация</text>' +
    '<circle class="dot" cx="107" cy="390" r="7"/><text x="92" y="404" text-anchor="end" class="lbl">Блоки</text>' +
    '<circle class="dot" cx="60" cy="260" r="7"/><text x="48" y="264" text-anchor="end" class="lbl">Тело</text>' +
    '<circle class="dot-o" cx="107" cy="130" r="7"/><text x="92" y="120" text-anchor="end" class="lbl">Циклы</text>' +
    '</g>' +
    '</svg>';
  return figureWrap('Карта слоёв · связки вокруг ядра', svg, caption);
}

var EN_DIAGRAM_TEXT = {
  'Личностный рост': 'Personal growth',
  'Здоровье': 'Health',
  'Финансы': 'Finances',
  'Карьера и дело': 'Career & work',
  'Отношения': 'Relationships',
  'Окружение': 'Social circle',
  'Творчество': 'Creativity',
  'Эмоции': 'Emotions',
  'Дом и комфорт': 'Home & comfort',
  'Духовность': 'Spirituality',
  'Узнавание': 'Recognition',
  'Дискомфорт': 'Discomfort',
  'Энергия действия': 'Energy for action',
  'Характер': 'Character',
  'Блоки · циклы': 'Blocks · cycles',
  'Миссия': 'Mission',
  'Путь разбора · три фазы': 'The reading path · three phases',
  'Ты входишь через узнавание — и выходишь через выбор.': 'You enter through recognition — and leave through choice.',
  'Твой контур силы · 10 сфер': 'Your strength contour · 10 areas',
  'каким кажешься': 'how you appear',
  'кто изнутри': 'who you are inside',
  'кем хочешь стать': 'who you want to become',
  'ты': 'you',
  'Три слоя · снаружи · внутри · куда идёшь': 'Three layers · outside · inside · where you are going',
  'Входишь и ведёшь': 'You enter and lead',
  'главная — сила старта': 'primary — power to start',
  'Видишь систему целиком': 'You see the whole system',
  'поддерживающая': 'supporting',
  'Держишь людей теплом': 'You hold people with warmth',
  'теневая — не считаешь силой': 'shadow — a strength you overlook',
  'Три силы · главная · опора · тень': 'Three strengths · primary · support · shadow',
  'приход': 'inflow',
  'потолок — «стало скучно, значит почти дошёл»': 'ceiling — “boredom means you are nearly there”',
  'год': 'year',
  'окно роста · весна': 'growth window · spring',
  'окно роста · осень': 'growth window · autumn',
  'просадка · середина лета': 'dip · midsummer',
  'Денежный поток · потолок · окна года': 'Money flow · ceiling · windows of the year',
  'лёгкость входа': 'ease of entry',
  'сила': 'strength',
  'лёгкость выхода': 'ease of exit',
  'блок': 'block',
  'один механизм': 'one mechanism',
  'Одна ось · сила и блок': 'One axis · strength and block',
  'цикл-вызов': 'challenge cycle',
  'Юность': 'Youth',
  'Зрелость I': 'Maturity I',
  'Зрелость II': 'Maturity II',
  'Поздний путь': 'Later path',
  'Линия жизни · четыре цикла': 'Life line · four cycles',
  'перелом': 'turning point',
  'Точки сдвига · ±2 года': 'Turning points · ±2 years',
  'I · разгон': 'I · momentum',
  'II · рост': 'II · growth',
  'III · выбор': 'III · choice',
  'IV · сбор': 'IV · harvest',
  'главное окно': 'main window',
  'точка выбора года': 'choice point of the year',
  'довёл одно → рост': 'finish one → growth',
  'начал три → повтор петли': 'start three → repeat the loop',
  'Год по кварталам · развилка': 'Year by quarters · the fork',
  'ядро': 'core',
  'СВОБОДА ↔ ОПОРА': 'FREEDOM ↔ SUPPORT',
  'Талант': 'Talent',
  'Деньги': 'Money',
  'Любовь': 'Love',
  'Реализация': 'Realization',
  'Блоки': 'Blocks',
  'Тело': 'Body',
  'Циклы': 'Cycles',
  'Карта слоёв · связки вокруг ядра': 'Layer map · links around the core'
};

function translateDiagramHtml(html) {
  Object.keys(EN_DIAGRAM_TEXT)
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .forEach(function (from) {
      html = html.split(from).join(EN_DIAGRAM_TEXT[from]);
    });
  return html
    .replace(/aria-label="[^"]*[А-Яа-яЁё][^"]*"/g, 'aria-label="Reading diagram"');
}

function renderDiagram(type, data, caption) {
  data = data || {};
  var html = '';
  switch (type) {
    case 'arc':
      html = diagramArc(caption);
      break;
    case 'radar':
      html = diagramRadar(data.spheres, caption);
      break;
    case 'triad':
      html = diagramTriad(caption);
      break;
    case 'forces':
      html = diagramForces(data.bars, caption);
      break;
    case 'money':
      html = diagramMoney(caption);
      break;
    case 'axis':
      html = diagramAxis(caption);
      break;
    case 'life':
      html = diagramLife(data.cycles, caption);
      break;
    case 'ages':
      html = diagramAges(data.agePoints, data.peakAge, caption);
      break;
    case 'year':
      html = diagramYear(caption);
      break;
    case 'map':
      html = diagramMap(caption);
      break;
    default:
      return '';
  }
  return data.language === 'en' ? translateDiagramHtml(html) : html;
}

module.exports = {
  SPHERE_META: SPHERE_META,
  radarPolygon: radarPolygon,
  radarVertex: radarVertex,
  renderDiagram: renderDiagram
};
