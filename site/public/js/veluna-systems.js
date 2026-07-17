/* VELUNA · 9 систем — Figma fan cards + detail modal (1:1969 / 1:1993) */
(function () {
  'use strict';
  if (window.__vsysLoaded) return;
  window.__vsysLoaded = true;

  var SYS = [
    { ic: '🔢', name: 'Нумерология', txt: 'Твоя дата рождения — это код. По числам видно твой характер, сильные стороны и тот самый урок, который жизнь повторяет по кругу, пока ты его не пройдёшь.' },
    { ic: '🀄', name: 'Матрица судьбы', txt: 'Раскладываем твою дату в карту из чисел: где деньги, где любовь, где родовая программа. Видно, что досталось «по наследству» — и что с этим наконец можно сделать.' },
    { ic: '☯️', name: 'Ба-цзы', txt: 'Китайская карта по дате и времени рождения. Показывает твои сильные стихии и периоды, когда жизнь будто открывает двери — а когда лучше не дёргаться и переждать.' },
    { ic: '🌙', name: 'Астрология', txt: 'Солнце, Луна и Асцендент — три твои разные «я»: какая ты для мира, какая внутри и какой тебя видят при первой встрече. Часто это три очень разных человека 🙂' },
    { ic: '⚡', name: 'Дизайн человека', txt: 'Как ты устроена для решений и энергии: тебе действовать с разбега или дождаться приглашения? Когда живёшь против своей природы — отсюда и та самая усталость.' },
    { ic: '🎭', name: 'Эннеаграмма', txt: 'Девять типов личности. Твой тип — это про то, чего ты на самом деле боишься и чего больше всего хочешь. Когда видишь его, многое в себе перестаёшь осуждать.' },
    { ic: '🔁', name: 'Психология сценариев', txt: 'У каждой из нас есть «любимые» сценарии — в деньгах, в любви. Лица меняются, сюжет тот же. Мы находим твой и показываем, в какой момент он включается.' },
    { ic: '🧸', name: 'Ранние сценарии', txt: 'То, что ты решила про себя в детстве («меня любят, когда я удобная»), до сих пор тихо рулит взрослой жизнью. Достаём эти установки на свет — и они теряют власть.' },
    { ic: '🌊', name: 'Реакция на стресс', txt: 'Как ты ведёшь себя, когда припекло: бьёшь, бежишь, замираешь или угождаешь? Зная это, ты перестаёшь винить себя за «срывы» — и впервые можешь выбрать иначе.' }
  ];

  var css = [
    '.sys-detail{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(6,6,26,.72);backdrop-filter:blur(8px);}',
    '.sys-detail.on{display:flex;}',
    '.sys-detail__card{position:relative;width:min(500px,100%);background:#0f0f23;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px 24px;box-shadow:0 20px 30px rgba(139,92,246,.2),inset 0 0 20px rgba(139,92,246,.25);text-align:center;color:#fff;font-family:var(--font-body,"Nunito",sans-serif);animation:sysDetailIn .28s ease;}',
    '@keyframes sysDetailIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
    '.sys-detail__ic{font-size:56px;line-height:1;margin-bottom:16px;}',
    '.sys-detail__kick{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#9b8ec4;margin-bottom:8px;}',
    '.sys-detail__name{font-size:32px;font-weight:800;line-height:1.15;margin:0 0 16px;color:#fff;}',
    '.sys-detail__txt{font-size:14px;line-height:1.6;color:rgba(255,255,255,.75);margin:0 0 16px;}',
    '.sys-detail__pitch{font-size:12px;font-style:italic;line-height:1.4;color:rgba(255,255,255,.5);margin:0 0 16px;}',
    '.sys-detail__cta{display:flex;align-items:center;justify-content:center;width:100%;height:50px;border:none;border-radius:25px;background:#9d3cff;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer;margin-bottom:16px;}',
    '.sys-detail__cta:hover{filter:brightness(1.08);}',
    '.sys-detail__nav{display:flex;align-items:center;justify-content:space-between;height:40px;}',
    '.sys-detail__arrow{width:40px;height:40px;border:none;background:transparent;color:rgba(255,255,255,.55);font-size:28px;line-height:1;cursor:pointer;border-radius:50%;}',
    '.sys-detail__arrow:hover{color:#fff;background:rgba(255,255,255,.06);}',
    '.sys-detail__dots{display:flex;gap:8px;align-items:center;}',
    '.sys-detail__dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);cursor:pointer;display:block;}',
    '.sys-detail__dots i.on{background:#fff;box-shadow:0 0 0 3px rgba(157,60,255,.35);}',
    '.sys-detail__close{position:absolute;top:14px;right:14px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(255,255,255,.06);color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;}',
    '.sys-card,.sys-mcard{cursor:pointer;}',
    '.sys-card.is-active,.sys-mcard.is-active{outline:2px solid rgba(157,60,255,.55);outline-offset:4px;}',
    /* light theme overrides */
    '[data-theme="light"] .sys-detail{background:rgba(36,27,46,.4);}',
    '[data-theme="light"] .sys-detail__card{background:#fff;border-color:rgba(226,101,144,.18);box-shadow:0 24px 60px rgba(36,27,46,.16);color:#241b2e;}',
    '[data-theme="light"] .sys-detail__kick{color:#857a92;}',
    '[data-theme="light"] .sys-detail__name{color:#241b2e;}',
    '[data-theme="light"] .sys-detail__txt{color:rgba(36,27,46,.72);}',
    '[data-theme="light"] .sys-detail__pitch{color:rgba(36,27,46,.45);}',
    '[data-theme="light"] .sys-detail__cta{background:linear-gradient(168deg,#f06e9c 0%,#d45e83 48%,#b23e66 100%);}',
    '[data-theme="light"] .sys-detail__arrow{color:rgba(36,27,46,.4);}',
    '[data-theme="light"] .sys-detail__arrow:hover{color:#241b2e;background:rgba(232,76,139,.08);}',
    '[data-theme="light"] .sys-detail__dots i{background:rgba(36,27,46,.15);}',
    '[data-theme="light"] .sys-detail__dots i.on{background:#e84c8b;box-shadow:0 0 0 3px rgba(232,76,139,.25);}',
    '[data-theme="light"] .sys-detail__close{background:rgba(36,27,46,.05);color:rgba(36,27,46,.5);}',
    '[data-theme="light"] .sys-detail__ic{display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;margin:0 auto 16px;border-radius:50%;border:1.5px solid rgba(232,76,139,.45);background:#fff5f8;font-size:32px;}',
    '[data-theme="light"] .sys-card.is-active,[data-theme="light"] .sys-mcard.is-active{outline-color:rgba(232,76,139,.55);}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.className = 'sys-detail';
  overlay.innerHTML =
    '<div class="sys-detail__card" role="dialog" aria-modal="true" aria-labelledby="sysDetailName">' +
      '<button type="button" class="sys-detail__close" aria-label="Закрыть">×</button>' +
      '<div class="sys-detail__ic" id="sysDetailIc"></div>' +
      '<div class="sys-detail__kick" id="sysDetailKick"></div>' +
      '<h3 class="sys-detail__name" id="sysDetailName"></h3>' +
      '<p class="sys-detail__txt" id="sysDetailTxt"></p>' +
      '<p class="sys-detail__pitch">Это один из девяти взглядов. Все 9 сходятся в одной точке про тебя — это и есть полный разбор</p>' +
      '<button type="button" class="sys-detail__cta" id="sysDetailCta">Собрать все 9 → Полный разбор</button>' +
      '<div class="sys-detail__nav">' +
        '<button type="button" class="sys-detail__arrow" id="sysDetailPrev" aria-label="назад">‹</button>' +
        '<div class="sys-detail__dots" id="sysDetailDots"></div>' +
        '<button type="button" class="sys-detail__arrow" id="sysDetailNext" aria-label="вперёд">›</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  function localizedSys(i) {
    var base = SYS[i];
    if (!window.VelunaI18n || !window.VelunaI18n.t) return base;
    return {
      ic: base.ic,
      name: window.VelunaI18n.t('sys.' + i + '.name'),
      cat: window.VelunaI18n.t('sys.' + i + '.cat'),
      txt: window.VelunaI18n.t('sys.' + i + '.txt')
    };
  }

  function refreshCardLabels() {
    document.querySelectorAll('[data-sys]').forEach(function (el) {
      var i = parseInt(el.getAttribute('data-sys'), 10);
      if (isNaN(i) || !SYS[i]) return;
      var s = localizedSys(i);
      var h3 = el.querySelector('h3');
      var cat = el.querySelector('header span');
      var foot = el.querySelector('footer');
      if (h3) h3.textContent = s.name;
      if (cat) cat.textContent = s.cat;
      if (foot && window.VelunaI18n) {
        var img = foot.querySelector('img');
        foot.textContent = window.VelunaI18n.t('systems.open') + ' ';
        if (img) foot.appendChild(img);
      }
    });
  }

  var cur = 0;
  var N = SYS.length;

  function fill(i) {
    var s = localizedSys(i);
    document.getElementById('sysDetailIc').textContent = s.ic;
    document.getElementById('sysDetailKick').textContent =
      (window.VelunaI18n ? window.VelunaI18n.getLang() : 'ru') === 'en'
        ? 'SYSTEM ' + (i + 1) + ' OF 9'
        : (window.VelunaI18n && window.VelunaI18n.getLang() === 'kk'
            ? 'ЖҮЙЕ ' + (i + 1) + ' / 9'
            : 'СИСТЕМА ' + (i + 1) + ' ИЗ 9');
    document.getElementById('sysDetailName').textContent = s.name;
    document.getElementById('sysDetailTxt').textContent = s.txt;
    var dots = document.getElementById('sysDetailDots');
    dots.innerHTML = '';
    for (var d = 0; d < N; d++) {
      var sp = document.createElement('i');
      if (d === i) sp.className = 'on';
      (function (j) {
        sp.addEventListener('click', function (e) {
          e.stopPropagation();
          open(j);
        });
      })(d);
      dots.appendChild(sp);
    }
    document.querySelectorAll('.sys-card, .sys-mcard').forEach(function (el) {
      var elIdx = parseInt(el.getAttribute('data-sys'), 10);
      el.classList.toggle('is-active', elIdx === i);
    });
  }

  function open(i) {
    cur = (i + N) % N;
    fill(cur);
    overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('on');
    document.body.style.overflow = '';
    document.querySelectorAll('.sys-card.is-active, .sys-mcard.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
  }

  function wireCards(selector) {
    document.querySelectorAll(selector).forEach(function (card, i) {
      var idx = parseInt(card.getAttribute('data-sys'), 10);
      if (isNaN(idx)) idx = i;
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('data-sys', String(idx));
      // Modal only on click — hover open caused flicker (overlay steals pointer → close → reopen)
      card.addEventListener('click', function (e) {
        e.preventDefault();
        open(idx);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(idx);
        }
      });
    });
  }

  wireCards('.systems__stage .sys-card');
  wireCards('.systems__mobile .sys-mcard');

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.sys-detail__close').addEventListener('click', close);
  document.getElementById('sysDetailPrev').addEventListener('click', function () { open(cur - 1); });
  document.getElementById('sysDetailNext').addEventListener('click', function () { open(cur + 1); });
  document.getElementById('sysDetailCta').addEventListener('click', function () {
    close();
    if (typeof window.velunaOpenOrder === 'function') {
      window.velunaOpenOrder('Ты — целиком');
    } else {
      var products = document.getElementById('products');
      if (products) products.scrollIntoView({ behavior: 'smooth' });
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('on')) close();
  });

  refreshCardLabels();
  if (window.VelunaI18n && window.VelunaI18n.onChange) {
    window.VelunaI18n.onChange(function () {
      refreshCardLabels();
      if (overlay.classList.contains('on')) fill(cur);
    });
  }
})();
