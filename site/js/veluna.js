(function () {
  'use strict';

  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var savedTheme = localStorage.getItem('veluna-theme');

  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.setAttribute('data-theme', savedTheme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('veluna-theme', next);
      if (typeof window.velunaRedrawWheel === 'function') window.velunaRedrawWheel();
    });
  }

  var burger = document.getElementById('navBurger');
  var links = document.getElementById('navLinks');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var DEADLINE_KEY = 'vqDeadline';
  var DEADLINE_MS = 15 * 60 * 1000;

  function getPromoDeadline() {
    var dl = 0;
    try { dl = +sessionStorage.getItem(DEADLINE_KEY) || 0; } catch (e) {}
    if (!dl || dl < Date.now()) {
      dl = Date.now() + DEADLINE_MS;
      try { sessionStorage.setItem(DEADLINE_KEY, String(dl)); } catch (e) {}
    }
    return dl;
  }

  function formatPromoLeft(left) {
    var m = Math.floor(left / 60000);
    var s = Math.floor((left % 60000) / 1000);
    return m + ':' + String(s).padStart(2, '0');
  }

  function tickPromoTimers() {
    var left = Math.max(0, getPromoDeadline() - Date.now());
    var text = formatPromoLeft(left);
    document.querySelectorAll('#promoTimer, #pricingTimer, #vgift-tmr, .promo-timer').forEach(function (el) {
      el.textContent = text;
    });
  }

  tickPromoTimers();
  setInterval(tickPromoTimers, 1000);

  window.velunaPromoDeadline = getPromoDeadline;

  function reduceKeepMaster(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce(function (s, d) { return s + +d; }, 0);
    }
    return n;
  }

  function reduceTo22(n) {
    while (n > 22) {
      n = String(n).split('').reduce(function (s, c) { return s + +c; }, 0);
    }
    return n;
  }

  function lifePathNumber(day, month, year) {
    var sum = (String(day) + String(month) + String(year))
      .split('').reduce(function (s, d) { return s + +d; }, 0);
    return reduceKeepMaster(sum);
  }

  var LIFE_TRAITS = {
    1: { arch: 'Первопроходец', str: 'Лидерство и смелость', lesson: 'Принимать помощь', rare: '~11%', blurb: 'ты сама останавливаешь деньги в шаге от цели' },
    2: { arch: 'Гармонизатор', str: 'Интуиция и дипломатия', lesson: 'Не растворяться в других', rare: '~13%', blurb: 'твой страх конфликта обходится дороже, чем кажется' },
    3: { arch: 'Творец', str: 'Харизма и экспрессия', lesson: 'Доводить до конца', rare: '~10%', blurb: 'ты рассеиваешь энергию на старте, когда ближе всего к прорыву' },
    4: { arch: 'Строитель', str: 'Надёжность и система', lesson: 'Отпустить контроль', rare: '~9%', blurb: 'жёсткая структура блокирует именно денежный поток' },
    5: { arch: 'Искатель', str: 'Свобода и адаптивность', lesson: 'Завершать начатое', rare: '~12%', blurb: 'непостоянство разрушает финансовую базу раньше, чем ты замечаешь' },
    6: { arch: 'Хранитель', str: 'Любовь и забота', lesson: 'Сначала себя', rare: '~14%', blurb: 'ты отдаёшь ресурсы раньше, чем позволяешь себе накопить' },
    7: { arch: 'Мудрец', str: 'Глубина и анализ', lesson: 'Доверять жизни', rare: '~8%', blurb: 'ты сама отрезаешь деньги в момент, когда они готовы прийти' },
    8: { arch: 'Властный', str: 'Амбиции и сила', lesson: 'Баланс власти и отдачи', rare: '~10%', blurb: 'страх потерять контроль блокирует твой денежный потолок' },
    9: { arch: 'Просветлённый', str: 'Мудрость и щедрость', lesson: 'Принять без вины', rare: '~13%', blurb: 'ты раздаёшь ресурс туда, где он не возвращается' },
    11: { arch: 'Интуит-мастер', str: 'Обострённая чувствительность', lesson: 'Заземлять дар', rare: '~3%', blurb: 'ты чувствуешь больше, чем позволяешь себе проявить' },
    22: { arch: 'Мастер-строитель', str: 'Масштаб и созидание', lesson: 'Доверять процессу', rare: '~2%', blurb: 'ты гасишь собственный масштаб из страха ответственности' },
    33: { arch: 'Учитель', str: 'Сострадание и сила', lesson: 'Беречь себя', rare: '~1%', blurb: 'ты отдаёшь так много, что забываешь о собственном ресурсе' }
  };

  var MX_ARCH = {
    1: { name: 'Лидер · Первопроходец', desc: 'Рождена прокладывать путь. Сила — в смелости и инициативе. Блок — страх остаться одной на этом пути.' },
    2: { name: 'Гармонизатор · Интуит', desc: 'Сила — чувствовать людей и пространство. Блок — отдаёшь больше, чем получаешь, и ждёшь, что заметят.' },
    3: { name: 'Творец · Коммуникатор', desc: 'Слова и образы — твой инструмент. Магнитишь людей, когда реализована. Блок — рассеиваешь энергию на старте.' },
    4: { name: 'Строитель · Практик', desc: 'Создаёшь устойчивые системы. Блок — жёсткий контроль мешает деньгам и близости.' },
    5: { name: 'Искатель · Авантюрист', desc: 'Свобода и разнообразие — твоя природа. Блок — трудно заканчивать начатое.' },
    6: { name: 'Хранитель · Опора', desc: 'Ты опора для других — и это сила. Блок — ставишь всех выше себя и сгораешь.' },
    7: { name: 'Мудрец · Аналитик', desc: 'Видишь глубже других, ищешь истину. Блок — недоверие к людям отрезает тебя от возможностей.' },
    8: { name: 'Властный · Трансформатор', desc: 'Природная сила и амбиции. Блок — страх потери контроля ограничивает потолок.' },
    9: { name: 'Просветлённый · Щедрый', desc: 'Мудрость и широта. Блок — берёшь меньше, чем можешь.' },
    11: { name: 'Интуитивный мастер', desc: 'Особое число — обострённая чувствительность и дар видеть неочевидное.' },
    22: { name: 'Мастер-строитель', desc: 'Способность создавать большое. Особый дар трансформации.' }
  };
  var MX_MONEY = { 1: 'Зарабатываешь сама, через инициативу и лидерство', 2: 'Деньги идут через партнёрства и сотрудничество', 3: 'Через творчество, публичность, контент', 4: 'Через стабильность, системность, надёжность', 5: 'Через изменения, разнообразие, движение', 6: 'Через заботу, обучение, создание уюта', 7: 'Через знания, экспертизу, глубину', 8: 'Через власть, влияние, управление', 9: 'Через щедрость, вклад, служение' };
  var MX_LOVE = { 1: 'Нужен сильный партнёр — со слабым скучно', 2: 'Ищешь союз и ощущение «мы», боишься одиночества', 3: 'Притягиваешь ярких и нестандартных', 4: 'Нужна стабильность и верность', 5: 'Притягивают свободные, сложно удерживать', 6: 'Ищешь заботу и ощущение дома', 7: 'Нужна глубина и честность', 8: 'Притягиваешь сильных — иногда токсичных', 9: 'Идеализируешь партнёра и потом разочаровываешься' };
  var MX_FAM = { 1: 'программа лидерства без поддержки', 2: 'программа жертвенности', 3: 'программа нереализованного творчества', 4: 'программа жёсткого контроля', 5: 'программа страха перемен', 6: 'программа созависимости', 7: 'программа одиночества и непонятости', 8: 'программа борьбы за власть', 9: 'программа служения без отдачи' };

  var lifeForm = document.getElementById('lifeForm');
  var lifeResult = document.getElementById('lifeFormResult');
  if (lifeForm) {
    lifeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var day = +lifeForm.day.value;
      var month = +lifeForm.month.value;
      var year = +lifeForm.year.value;
      var name = (lifeForm.name.value || '').trim();
      if (!day || !month || !year) {
        lifeResult.hidden = false;
        lifeResult.innerHTML = '<p class="calc-reveal__err">Пожалуйста, введи полную дату рождения.</p>';
        return;
      }
      var n = lifePathNumber(day, month, year);
      var t = LIFE_TRAITS[n] || LIFE_TRAITS[9];
      var hello = name ? name + ', твоё' : 'Твоё';
      saveLeadDraft({ name: name, day: day, month: month, year: year });
      lifeResult.hidden = false;
      lifeResult.innerHTML =
        '<div class="calc-reveal">' +
          '<div class="calc-reveal__head">' +
            '<span class="calc-reveal__num">' + n + '</span>' +
            '<div class="calc-reveal__head-text">' +
              '<span class="calc-reveal__eyebrow">' + hello + ' число жизни</span>' +
              '<strong class="calc-reveal__arch">Архетип «' + t.arch + '»</strong>' +
              '<span class="calc-reveal__rare">такое число у ' + t.rare + ' людей</span>' +
            '</div>' +
          '</div>' +
          '<div class="calc-reveal__grid">' +
            '<div class="calc-reveal__cell"><span>Сильная сторона</span><strong>' + t.str + '</strong></div>' +
            '<div class="calc-reveal__cell"><span>Твой урок</span><strong>' + t.lesson + '</strong></div>' +
          '</div>' +
          '<p class="calc-reveal__teaser">По числу ' + n + ' видно, что ' + t.blurb + '. Это не судьба — это конкретный сценарий с конкретной причиной. <span>Полная расшифровка по 9 системам — в разборе.</span></p>' +
        '<button type="button" class="calc-reveal__cta" id="miniQuizCta">Получить мини-разбор →</button>' +
        '</div>';
      var mq = document.getElementById('miniQuizCta');
      if (mq) mq.addEventListener('click', function () {
        saveLeadDraft({ name: name, day: day, month: month, year: year });
        if (typeof window.vqInlineStart === 'function') {
          window.vqInlineStart({ name: name, d: day, m: month, y: year, num: n, arch: t.arch });
        }
      });
      lifeResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  var matrixForm = document.getElementById('matrixForm');
  var matrixResults = document.getElementById('matrixResults');
  if (matrixForm) {
    matrixForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var day = +matrixForm.day.value;
      var month = +matrixForm.month.value;
      var year = +matrixForm.year.value;
      if (!day || !month || !year) return;
      saveLeadDraft({ day: day, month: month, year: year });
      var core = reduceTo22((String(day) + String(month) + String(year)).split('').reduce(function (a, c) { return a + +c; }, 0));
      var money = reduceTo22(day + month);
      var love = reduceTo22(month + (year % 100));
      var fam = reduceTo22(day + (year % 100));
      var a = MX_ARCH[core] || MX_ARCH[9];
      var mi = Math.min(money, 9), li = Math.min(love, 9), fi = Math.min(fam, 9);
      document.getElementById('matrixCore').textContent = core;
      document.getElementById('matrixMoney').textContent = money;
      document.getElementById('matrixLove').textContent = love;
      var txt = document.getElementById('matrixText');
      if (txt) {
        txt.innerHTML =
          '<strong>Ядро ' + core + ' — «' + a.name + '».</strong> ' + a.desc +
          '<br><br><strong>Деньги (' + money + '):</strong> ' + (MX_MONEY[mi] || '') +
          '<br><strong>Любовь (' + love + '):</strong> ' + (MX_LOVE[li] || '') +
          '<span class="calc-reveal__teaser">По числу ' + core + ' в зоне кармы видна ' + (MX_FAM[fi] || '') + '. Механизм и три шага под конфигурацию ' + core + '/' + money + '/' + love + ' — в полном разборе.</span>';
      }
      matrixResults.hidden = false;
      var mq = document.getElementById('matrixMiniQuizCta');
      if (mq) {
        mq.onclick = function () {
          saveLeadDraft({ day: day, month: month, year: year });
          if (typeof window.vqInlineStart === 'function') {
            window.vqInlineStart({ d: day, m: month, y: year, num: Math.min(core, 9) || 9, arch: a.name });
          }
        };
      }
      matrixResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  document.querySelectorAll('.journal-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var calc = document.getElementById('calc');
      if (calc) calc.scrollIntoView({ behavior: 'smooth' });
    });
  });

  function scrollToCalc() {
    var calc = document.getElementById('calc');
    if (calc) calc.scrollIntoView({ behavior: 'smooth' });
  }

  var orderModal = document.getElementById('orderModal');
  var orderForm = document.getElementById('orderForm');
  var orderProduct = document.getElementById('orderModalProduct');
  var orderNote = document.getElementById('orderModalNote');
  var orderBasePriceEl = document.getElementById('orderBasePrice');
  var orderOldPriceEl = document.getElementById('orderOldPrice');
  var orderTotalEl = document.getElementById('orderTotal');
  var orderCart = document.getElementById('orderCart');
  var currentProduct = '';
  var basePrice = 15000;
  var addons = {};

  var PRODUCT_PRICES = {
    'Ты — целиком': 15000,
    'Полный разбор': 15000,
    'Денежный код': 3990,
    'Сценарий любви': 3990,
    'Прогноз 2026': 3990,
    'Реализация': 4990,
    'Скрытые блоки': 4990,
    'Совместимость пары': 3990,
    'Число судьбы': 1990
  };

  function formatTenge(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  function resolveBasePrice(name) {
    if (PRODUCT_PRICES[name] != null) return PRODUCT_PRICES[name];
    if (/целиком|полный/i.test(name)) return 15000;
    if (/совместим/i.test(name)) return 3990;
    if (/реализац|блок/i.test(name)) return 4990;
    if (/денежн|любв|прогноз/i.test(name)) return 3990;
    return 15000;
  }

  function renderAddons() {
    if (!orderCart) return;
    orderCart.querySelectorAll('[data-sku="addon"]').forEach(function (el) { el.remove(); });
    Object.keys(addons).forEach(function (name) {
      var row = document.createElement('div');
      row.className = 'order-modal__item';
      row.setAttribute('data-sku', 'addon');
      row.setAttribute('data-addon', name);
      row.innerHTML =
        '<span>' + name + '</span>' +
        '<div class="order-modal__item-right">' +
          '<strong>' + formatTenge(addons[name]) + '</strong>' +
          '<button type="button" class="order-modal__x" data-remove-addon="' + name + '" aria-label="Убрать">×</button>' +
        '</div>';
      orderCart.appendChild(row);
    });
    document.querySelectorAll('.order-modal__add').forEach(function (btn) {
      var name = btn.getAttribute('data-add');
      var on = !!addons[name];
      btn.classList.toggle('is-added', on);
      var icon = btn.querySelector('i');
      if (icon) icon.textContent = on ? '✓' : '+';
    });
    updateOrderTotal();
  }

  function updateOrderTotal() {
    var addonSum = 0;
    Object.keys(addons).forEach(function (k) { addonSum += addons[k]; });
    var total = basePrice + addonSum;
    /* Скидка −67% только на основной продукт: было = base×3 + аддоны без скидки */
    var was = basePrice * 3 + addonSum;
    if (orderBasePriceEl) orderBasePriceEl.textContent = formatTenge(basePrice);
    if (orderTotalEl) orderTotalEl.textContent = formatTenge(total);
    if (orderOldPriceEl) {
      orderOldPriceEl.textContent = formatTenge(was);
      orderOldPriceEl.hidden = was <= total;
    }
  }

  function cartLabel(productName) {
    if (!productName || productName === 'Ты — целиком' || productName === 'Полный разбор') {
      return 'Полный разбор';
    }
    return productName;
  }

  var DRAFT_KEY = 'veluna-lead-draft';

  function loadLeadDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveLeadDraft(patch) {
    var cur = loadLeadDraft();
    var next = Object.assign({}, cur, patch || {});
    Object.keys(next).forEach(function (k) {
      if (next[k] === '' || next[k] == null) delete next[k];
    });
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  window.velunaSaveLeadDraft = saveLeadDraft;
  window.velunaLoadLeadDraft = loadLeadDraft;

  function applyLeadDraftToOrderForm(draft) {
    if (!orderForm || !draft) return;
    if (draft.name && orderForm.name) orderForm.name.value = draft.name;
    if (draft.phone && orderForm.phone) orderForm.phone.value = draft.phone;
    if (draft.contact && orderForm.contact) orderForm.contact.value = draft.contact;
    if (draft.city && orderForm.city) orderForm.city.value = draft.city;
    if (draft.day && draft.month && draft.year && typeof orderForm.__setOrderDate === 'function') {
      orderForm.__setOrderDate(+draft.day, +draft.month, +draft.year);
    }
    if (draft.time && typeof orderForm.__setOrderTime === 'function') {
      var tm = String(draft.time).split(':');
      if (tm.length >= 2) orderForm.__setOrderTime(+tm[0], +tm[1]);
    }
  }

  function openOrderModal(productName) {
    currentProduct = productName || 'Полный разбор';
    basePrice = resolveBasePrice(currentProduct);
    addons = {};
    if (orderProduct) orderProduct.textContent = cartLabel(currentProduct);
    if (orderNote) {
      orderNote.hidden = true;
      orderNote.textContent = '';
    }
    applyLeadDraftToOrderForm(loadLeadDraft());
    renderAddons();
    if (orderModal) orderModal.hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelectorAll('.pricing__card').forEach(function (card) {
      card.classList.toggle('is-selected', card.textContent.indexOf(currentProduct) !== -1);
    });
  }

  function closeOrderModal() {
    if (orderModal) orderModal.hidden = true;
    document.body.style.overflow = '';
    document.querySelectorAll('.pricing__card').forEach(function (card) {
      card.classList.remove('is-selected');
    });
  }

  window.velunaOpenOrder = function (productName) {
    document.body.style.overflow = '';
    openOrderModal(productName || 'Полный разбор');
  };

  document.querySelectorAll('[data-close-order]').forEach(function (el) {
    el.addEventListener('click', closeOrderModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && orderModal && !orderModal.hidden) closeOrderModal();
  });

  document.querySelectorAll('[data-order]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openOrderModal(btn.getAttribute('data-order'));
    });
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.products__btn');
    if (!btn) return;
    var card = btn.closest('.products__card');
    var product = card ? card.getAttribute('data-product') : 'Полный разбор';
    openOrderModal(product);
  });

  document.querySelectorAll('.order-modal__add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-add');
      var price = +btn.getAttribute('data-price') || 0;
      if (addons[name]) delete addons[name];
      else addons[name] = price;
      renderAddons();
    });
  });

  var upsellToggle = document.getElementById('orderUpsellToggle');
  var upsellAside = document.querySelector('.order-modal__upsell');
  if (upsellToggle && upsellAside) {
    upsellToggle.addEventListener('click', function () {
      var open = upsellAside.classList.toggle('is-open');
      upsellToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  if (orderCart) {
    orderCart.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-remove-addon]');
      if (rm) {
        delete addons[rm.getAttribute('data-remove-addon')];
        renderAddons();
        return;
      }
      if (e.target.closest('[data-remove-base]')) {
        closeOrderModal();
      }
    });
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function onlyDigits(value, maxLen) {
    return String(value || '').replace(/\D/g, '').slice(0, maxLen);
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function closeAllDtPops(except) {
    document.querySelectorAll('.dt-field').forEach(function (field) {
      if (except && field === except) return;
      var pop = field.querySelector('.dt-pop');
      var pick = field.querySelector('.dt-field__pick');
      if (pop) pop.hidden = true;
      if (pick) pick.setAttribute('aria-expanded', 'false');
    });
  }

  function initDateTimeFields(form) {
    var dateField = form.querySelector('[data-dt="date"]');
    var timeField = form.querySelector('[data-dt="time"]');
    if (!dateField && !timeField) return;

    var monthNames = [
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ];

    function bindSegments(field, order, onChange) {
      var segs = order.map(function (name) {
        return field.querySelector('[data-seg="' + name + '"]');
      }).filter(Boolean);

      segs.forEach(function (input, idx) {
        input.addEventListener('focus', function () {
          requestAnimationFrame(function () { input.select(); });
        });

        input.addEventListener('input', function () {
          var max = +input.getAttribute('maxlength') || 2;
          var digits = onlyDigits(input.value, max);
          input.value = digits;
          onChange();
          if (digits.length >= max && segs[idx + 1]) {
            segs[idx + 1].focus();
          }
        });

        input.addEventListener('keydown', function (e) {
          if (e.key === 'Backspace' && !input.value && segs[idx - 1]) {
            segs[idx - 1].focus();
          }
          if (e.key === 'ArrowLeft' && input.selectionStart === 0 && segs[idx - 1]) {
            e.preventDefault();
            segs[idx - 1].focus();
          }
          if (e.key === 'ArrowRight' && input.selectionStart === input.value.length && segs[idx + 1]) {
            e.preventDefault();
            segs[idx + 1].focus();
          }
        });

        input.addEventListener('paste', function (e) {
          var text = (e.clipboardData || window.clipboardData).getData('text') || '';
          var digits = onlyDigits(text, 8);
          if (!digits) return;
          e.preventDefault();
          var cursor = idx;
          var i = 0;
          while (cursor < segs.length && i < digits.length) {
            var max = +segs[cursor].getAttribute('maxlength') || 2;
            segs[cursor].value = digits.slice(i, i + max);
            i += max;
            cursor += 1;
          }
          onChange();
          var focusEl = segs[Math.min(cursor, segs.length - 1)];
          if (focusEl) focusEl.focus();
        });
      });

      return segs;
    }

    if (dateField) {
      var daySeg = dateField.querySelector('[data-seg="day"]');
      var monthSeg = dateField.querySelector('[data-seg="month"]');
      var yearSeg = dateField.querySelector('[data-seg="year"]');
      var dayHidden = form.elements.day;
      var monthHidden = form.elements.month;
      var yearHidden = form.elements.year;
      var datePop = dateField.querySelector('.dt-pop--date');
      var calGrid = dateField.querySelector('[data-cal-grid]');
      var calTitle = dateField.querySelector('[data-cal-title]');
      var datePick = dateField.querySelector('[data-dt-pick="date"]');
      var viewYear = +(yearHidden && yearHidden.value) || 1995;
      var viewMonth = +(monthHidden && monthHidden.value) || 6;

      function syncDateHidden() {
        var d = onlyDigits(daySeg.value, 2);
        var m = onlyDigits(monthSeg.value, 2);
        var y = onlyDigits(yearSeg.value, 4);
        var dayNum = d ? Math.min(31, Math.max(1, +d)) : '';
        var monthNum = m ? Math.min(12, Math.max(1, +m)) : '';
        var yearNum = y.length === 4 ? Math.min(2015, Math.max(1920, +y)) : '';

        if (d.length === 2 && dayNum) daySeg.value = pad2(dayNum);
        if (m.length === 2 && monthNum) monthSeg.value = pad2(monthNum);
        if (y.length === 4 && yearNum !== '') {
          yearSeg.value = String(yearNum);
        }

        if (dayNum && monthNum && yearNum !== '' && String(yearNum).length === 4) {
          var maxDay = daysInMonth(yearNum, monthNum);
          if (dayNum > maxDay) {
            dayNum = maxDay;
            daySeg.value = pad2(dayNum);
          }
        }

        if (dayHidden) dayHidden.value = dayNum || '';
        if (monthHidden) monthHidden.value = monthNum || '';
        if (yearHidden) yearHidden.value = yearNum === '' ? '' : String(yearNum);
      }

      function setDateValues(day, month, year) {
        daySeg.value = pad2(day);
        monthSeg.value = pad2(month);
        yearSeg.value = String(year);
        viewYear = year;
        viewMonth = month;
        syncDateHidden();
        renderCalendar();
      }

      function renderCalendar() {
        if (!calGrid || !calTitle) return;
        calTitle.textContent = monthNames[viewMonth - 1] + ' ' + viewYear;
        calGrid.innerHTML = '';
        var first = new Date(viewYear, viewMonth - 1, 1);
        var startPad = (first.getDay() + 6) % 7; // Monday-first
        var days = daysInMonth(viewYear, viewMonth);
        var prevDays = daysInMonth(viewYear, viewMonth === 1 ? 12 : viewMonth - 1);
        var selectedDay = +dayHidden.value;
        var selectedMonth = +monthHidden.value;
        var selectedYear = +yearHidden.value;
        var totalCells = 42;

        for (var i = 0; i < totalCells; i++) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dt-pop__day';
          var dayNum;
          var cellMonth = viewMonth;
          var cellYear = viewYear;
          var muted = false;

          if (i < startPad) {
            dayNum = prevDays - startPad + i + 1;
            muted = true;
            cellMonth = viewMonth === 1 ? 12 : viewMonth - 1;
            cellYear = viewMonth === 1 ? viewYear - 1 : viewYear;
          } else if (i >= startPad + days) {
            dayNum = i - startPad - days + 1;
            muted = true;
            cellMonth = viewMonth === 12 ? 1 : viewMonth + 1;
            cellYear = viewMonth === 12 ? viewYear + 1 : viewYear;
          } else {
            dayNum = i - startPad + 1;
          }

          btn.textContent = dayNum;
          if (muted) btn.classList.add('is-muted');
          if (cellYear < 1920 || cellYear > 2015) {
            btn.disabled = true;
          }
          if (dayNum === selectedDay && cellMonth === selectedMonth && cellYear === selectedYear && !muted) {
            btn.classList.add('is-selected');
          }
          btn.addEventListener('click', function (y, m, d) {
            return function () {
              if (y < 1920 || y > 2015) return;
              setDateValues(d, m, y);
              closeAllDtPops();
            };
          }(cellYear, cellMonth, dayNum));
          calGrid.appendChild(btn);
        }
      }

      bindSegments(dateField, ['day', 'month', 'year'], syncDateHidden);

      [daySeg, monthSeg, yearSeg].forEach(function (el) {
        el.addEventListener('blur', syncDateHidden);
      });

      dateField.querySelectorAll('[data-cal-nav]').forEach(function (nav) {
        nav.addEventListener('click', function () {
          var dir = +nav.getAttribute('data-cal-nav');
          viewMonth += dir;
          if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
          if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
          if (viewYear < 1920) { viewYear = 1920; viewMonth = 1; }
          if (viewYear > 2015) { viewYear = 2015; viewMonth = 12; }
          renderCalendar();
        });
      });

      if (datePick && datePop) {
        datePick.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = datePop.hidden;
          closeAllDtPops(open ? dateField : null);
          if (open) {
            syncDateHidden();
            viewYear = +yearHidden.value || viewYear;
            viewMonth = +monthHidden.value || viewMonth;
            renderCalendar();
            datePop.hidden = false;
            datePick.setAttribute('aria-expanded', 'true');
          }
        });
      }

      syncDateHidden();
      renderCalendar();
      form.__setOrderDate = setDateValues;
    }

    if (timeField) {
      var hourSeg = timeField.querySelector('[data-seg="hour"]');
      var minSeg = timeField.querySelector('[data-seg="min"]');
      var timeHidden = form.elements.time;
      var timePop = timeField.querySelector('.dt-pop--time');
      var timePick = timeField.querySelector('[data-dt-pick="time"]');
      var hourWheel = timeField.querySelector('[data-wheel="hour"]');
      var minWheel = timeField.querySelector('[data-wheel="min"]');
      var timeDone = timeField.querySelector('[data-time-done]');

      function syncTimeHidden() {
        var h = onlyDigits(hourSeg.value, 2);
        var m = onlyDigits(minSeg.value, 2);
        var hourNum = h === '' ? '' : Math.min(23, +h);
        var minNum = m === '' ? '' : Math.min(59, +m);
        if (h.length === 2) hourSeg.value = pad2(hourNum);
        if (m.length === 2) minSeg.value = pad2(minNum);
        if (timeHidden) {
          timeHidden.value = (h !== '' && m !== '') ? pad2(hourNum) + ':' + pad2(minNum) : '';
        }
      }

      function setTimeValues(hour, min) {
        hourSeg.value = pad2(hour);
        minSeg.value = pad2(min);
        syncTimeHidden();
        highlightWheels(hour, min);
      }

      function highlightWheels(hour, min) {
        if (hourWheel) {
          hourWheel.querySelectorAll('button').forEach(function (btn) {
            btn.classList.toggle('is-selected', +btn.dataset.val === hour);
          });
        }
        if (minWheel) {
          minWheel.querySelectorAll('button').forEach(function (btn) {
            btn.classList.toggle('is-selected', +btn.dataset.val === min);
          });
        }
      }

      function scrollWheelTo(wheel, value) {
        if (!wheel) return;
        var btn = wheel.querySelector('[data-val="' + value + '"]');
        if (btn) btn.scrollIntoView({ block: 'center' });
      }

      function buildWheels() {
        if (hourWheel && !hourWheel.children.length) {
          for (var h = 0; h < 24; h++) {
            var hb = document.createElement('button');
            hb.type = 'button';
            hb.dataset.val = String(h);
            hb.textContent = pad2(h);
            hb.setAttribute('role', 'option');
            hb.addEventListener('click', function (val) {
              return function () {
                hourSeg.value = pad2(val);
                if (!minSeg.value) minSeg.value = '00';
                syncTimeHidden();
                highlightWheels(val, +onlyDigits(minSeg.value, 2) || 0);
              };
            }(h));
            hourWheel.appendChild(hb);
          }
        }
        if (minWheel && !minWheel.children.length) {
          for (var mi = 0; mi < 60; mi++) {
            var mb = document.createElement('button');
            mb.type = 'button';
            mb.dataset.val = String(mi);
            mb.textContent = pad2(mi);
            mb.setAttribute('role', 'option');
            mb.addEventListener('click', function (val) {
              return function () {
                if (!hourSeg.value) hourSeg.value = '12';
                minSeg.value = pad2(val);
                syncTimeHidden();
                highlightWheels(+onlyDigits(hourSeg.value, 2) || 0, val);
              };
            }(mi));
            minWheel.appendChild(mb);
          }
        }
      }

      bindSegments(timeField, ['hour', 'min'], syncTimeHidden);
      [hourSeg, minSeg].forEach(function (el) {
        el.addEventListener('blur', syncTimeHidden);
      });

      if (timePick && timePop) {
        timePick.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = timePop.hidden;
          closeAllDtPops(open ? timeField : null);
          if (open) {
            buildWheels();
            var h = onlyDigits(hourSeg.value, 2);
            var m = onlyDigits(minSeg.value, 2);
            var hour = h === '' ? 12 : Math.min(23, +h);
            var min = m === '' ? 0 : Math.min(59, +m);
            highlightWheels(hour, min);
            timePop.hidden = false;
            timePick.setAttribute('aria-expanded', 'true');
            requestAnimationFrame(function () {
              scrollWheelTo(hourWheel, hour);
              scrollWheelTo(minWheel, min);
            });
          }
        });
      }

      if (timeDone) {
        timeDone.addEventListener('click', function () {
          var hBtn = hourWheel && hourWheel.querySelector('.is-selected');
          var mBtn = minWheel && minWheel.querySelector('.is-selected');
          if (hBtn && mBtn && (!hourSeg.value || !minSeg.value)) {
            setTimeValues(+hBtn.dataset.val, +mBtn.dataset.val);
          } else {
            syncTimeHidden();
          }
          closeAllDtPops();
        });
      }
      form.__setOrderTime = setTimeValues;
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('.dt-field')) return;
      closeAllDtPops();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAllDtPops();
    });
  }

  if (orderForm) {
    initDateTimeFields(orderForm);

    orderForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var total = basePrice;
      Object.keys(addons).forEach(function (k) { total += addons[k]; });
      var data = {
        product: currentProduct,
        addons: Object.keys(addons),
        total: total,
        name: orderForm.name.value.trim(),
        day: orderForm.day.value,
        month: orderForm.month.value,
        year: orderForm.year.value,
        time: orderForm.time.value.trim(),
        city: orderForm.city.value.trim(),
        phone: (orderForm.phone && orderForm.phone.value.trim()) || '',
        contact: orderForm.contact.value.trim(),
        at: new Date().toISOString()
      };
      saveLeadDraft({
        name: data.name,
        day: data.day,
        month: data.month,
        year: data.year,
        time: data.time,
        city: data.city,
        phone: data.phone,
        contact: data.contact
      });
      if (!data.phone) {
        if (orderNote) {
          orderNote.hidden = false;
          orderNote.textContent = 'Укажи номер телефона';
        }
        return;
      }
      var tgOk = /(?:^|[\s@])@?[A-Za-z0-9_]{5,32}\b/.test(data.contact || '') &&
        !/whatsapp|вотсап|вацап|viber/i.test(data.contact || '');
      if (!tgOk) {
        if (orderNote) {
          orderNote.hidden = false;
          orderNote.textContent = 'Укажи Telegram @ник (от 5 символов) — WhatsApp сюда не подходит';
        }
        return;
      }
      if (orderNote) orderNote.hidden = true;
      var orders = JSON.parse(localStorage.getItem('veluna-orders') || '[]');
      orders.push(data);
      localStorage.setItem('veluna-orders', JSON.stringify(orders));

      var payBtn = orderForm.querySelector('.order-modal__pay');
      var prevLabel = payBtn ? payBtn.textContent : '';
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Переходим к оплате…';
      }
      if (orderNote) {
        orderNote.hidden = false;
        orderNote.textContent = 'Создаём счёт Unicorn…';
      }

      try {
        console.log('[pay]', JSON.stringify({ event: 'client.create_payment.start', sum: data.total, product: data.product }));
      } catch (e) {}

      fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: data.product,
          addons: data.addons,
          sum: data.total,
          name: data.name,
          phone: data.phone,
          contact: data.contact,
          email: '',
          meta: {
            day: data.day,
            month: data.month,
            year: data.year,
            time: data.time,
            city: data.city
          }
        })
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { okHttp: r.ok, body: j };
          });
        })
        .then(function (res) {
          var payUrl = res.body && res.body.payUrl;
          var botUrl = res.body && res.body.botUrl;
          if (res.body && res.body.ok && payUrl) {
            try {
              if (res.body.orderId) localStorage.setItem('veluna-last-order', res.body.orderId);
              if (botUrl) localStorage.setItem('veluna-bot-url', botUrl);
              localStorage.setItem('veluna-pay-url', payUrl);
            } catch (err) {}
            try {
              console.log('[pay]', JSON.stringify({ event: 'client.redirect_pay', orderId: res.body.orderId || null }));
            } catch (e) {}
            if (orderNote) orderNote.textContent = 'Открываем оплату…';
            window.location.href = payUrl;
            return;
          }
          var msg = (res.body && res.body.error) || 'Не удалось создать оплату';
          try {
            console.warn('[pay]', JSON.stringify({ event: 'client.create_payment.fail', error: msg, httpOk: res.okHttp }));
          } catch (e) {}
          if (orderNote) {
            orderNote.hidden = false;
            orderNote.textContent = msg + '. Попробуй ещё раз или напиши @soulmetrica_bot.';
          }
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = prevLabel || 'Оплатить →';
          }
        })
        .catch(function (err) {
          try {
            console.warn('[pay]', JSON.stringify({ event: 'client.create_payment.network', error: err && err.message ? err.message : 'network' }));
          } catch (e) {}
          if (orderNote) {
            orderNote.hidden = false;
            orderNote.textContent = 'Сеть недоступна. Попробуй ещё раз или напиши @soulmetrica_bot.';
          }
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = prevLabel || 'Оплатить →';
          }
        });
    });
  }

  var WHEEL_PKGS = {
    destiny:  { key: 'destiny',  name: 'Число судьбы',   price: 1990,  icon: '🔢', desc: 'Первый слой — характер, сила и урок.' },
    forecast: { key: 'forecast', name: 'Прогноз 2026',   price: 3990,  icon: '🗓', desc: 'Что несёт этот год именно тебе — по кварталам.' },
    money:    { key: 'money',    name: 'Денежный код',   price: 3990,  icon: '💸', desc: 'Твой денежный канал, потолок и блоки — честно.' },
    love:     { key: 'love',     name: 'Сценарий любви', price: 3990,  icon: '💔', desc: 'Почему ты выбираешь одно и то же — и как выйти.' },
    realize:  { key: 'realize',  name: 'Реализация',     price: 4990,  icon: '🚀', desc: 'Твоя настоящая сила и путь — без чужих советов.' },
    blocks:   { key: 'blocks',   name: 'Скрытые блоки',  price: 4990,  icon: '🔓', desc: 'Что именно тормозит тебя — в деньгах, в любви.' },
    full:     { key: 'full',     name: 'Полный разбор',  price: 15000, icon: '✦',  desc: 'Вся карта целиком — все сферы, PDF в Telegram.' }
  };

  var spheres = [
    { id: 'growth',   emoji: '🌱', name: 'Рост',        pkg: 'realize', advice: 'Выдели 20 минут в день на то, что расширяет тебя — книга, навык, разговор с тем, кто уже там, куда ты идёшь.' },
    { id: 'health',   emoji: '💗', name: 'Здоровье',    pkg: 'blocks',  advice: 'Выбери одну опору: сон до полуночи, вода, 7 000 шагов. Тело — фундамент, на котором держатся все остальные сферы.' },
    { id: 'finance',  emoji: '💰', name: 'Финансы',     pkg: 'money',   advice: 'Чаще дело не в доходе, а в невидимом потолке. Выпиши свои убеждения про деньги — ответ обычно прячется там.' },
    { id: 'career',   emoji: '🏔', name: 'Карьера',     pkg: 'realize', advice: 'Честно спроси себя: это твой путь или чужие ожидания? Один прямой разговор способен развернуть весь год.' },
    { id: 'love',     emoji: '💑', name: 'Отношения',   pkg: 'love',    advice: 'Заметь повторяющийся сценарий. То, что возвращается по кругу — это и есть то, что просит твоего внимания.' },
    { id: 'social',   emoji: '👥', name: 'Окружение',   pkg: 'love',    advice: 'Сделай ревизию окружения: кто наполняет, а кто забирает. Глубина связей важнее их количества.' },
    { id: 'creative', emoji: '🎨', name: 'Творчество',  pkg: 'realize', advice: 'Дай себе право на «бесполезное» творчество — без результата и оценки. Именно оно возвращает энергию.' },
    { id: 'spirit',   emoji: '🧘', name: 'Духовность',  pkg: 'destiny', advice: 'Пять минут тишины в день без телефона. Не практика ради практики — просто возможность вернуться к себе.' }
  ];

  var values = spheres.map(function () { return 5; });
  // Canvas angles clockwise from top — match Figma Desktop-15 labels
  var chartOrder = [2, 3, 4, 5, 6, 7, 0, 1];
  var canvas = document.getElementById('radarChart');
  var slidersRoot = document.getElementById('wheelSliders');
  var resetBtn = document.getElementById('wheelReset');
  var wheelHint = document.getElementById('wheelHint');
  var wheelGo = document.getElementById('wheelGo');
  var wheelResult = document.getElementById('wheelResult');
  var wheelResultInner = document.getElementById('wheelResultInner');

  function wheelTheme() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    if (light) {
      return {
        ring: 'rgba(196, 96, 122, 0.18)',
        spoke: 'rgba(196, 96, 122, 0.2)',
        fill: 'rgba(224, 140, 160, 0.28)',
        stroke: '#c4607a',
        dot: '#c4607a',
        dotStroke: '#fff',
        accent: '#c4607a'
      };
    }
    return {
      ring: 'rgba(255, 255, 255, 0.12)',
      spoke: 'rgba(255, 255, 255, 0.14)',
      fill: 'rgba(255, 255, 255, 0.07)',
      stroke: 'rgba(255, 255, 255, 0.85)',
      dot: '#ffffff',
      dotStroke: 'rgba(255, 255, 255, 0.9)',
      accent: '#9d3cff'
    };
  }

  function colorForVal(v) {
    if (v <= 4) return 'wheel-result__val--low';
    if (v <= 6) return 'wheel-result__val--mid';
    return 'wheel-result__val--high';
  }

  function valsById() {
    var out = {};
    spheres.forEach(function (s, i) { out[s.id] = values[i]; });
    return out;
  }

  function wheelInsightHtml() {
    var v = valsById();
    var rules = [
      { c: function () { return v.finance >= 7 && v.career >= 7; }, t: '<strong>Деньги и карьера сильные</strong> — энергия идёт туда. Проверь: не за счёт ли здоровья или близости?' },
      { c: function () { return v.love >= 7 && v.social >= 7; }, t: '<strong>Отношения и окружение развиты</strong> — ты человек связей. Вопрос лишь: твои ли это связи?' },
      { c: function () { return v.spirit >= 7 && v.creative >= 7; }, t: '<strong>Духовность и творчество высокие</strong> — ты внутренне богатая. Часто такие недооценивают себя в деньгах.' },
      { c: function () { return v.health <= 4; }, t: '<strong>Здоровье ниже 4</strong> — тело говорит что-то важное, что ты пока не слышишь. Это первый приоритет.' },
      { c: function () { return v.finance <= 4; }, t: '<strong>Финансы в красной зоне</strong> — скорее всего дело не в умениях, а в конкретном блоке.' },
      { c: function () { return v.love <= 4; }, t: '<strong>Отношения низкие</strong> — либо пауза (это нормально), либо что-то повторяется по кругу.' }
    ];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].c()) return rules[i].t;
    }
    var avg = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    if (avg >= 7) return 'В целом <strong>сбалансированно и сильно</strong>. Смотри, где самое слабое звено — оно тянет остальное.';
    if (avg <= 4) return '<strong>Много сфер в красном</strong> одновременно — это нагрузка. Начни с той, что потянет остальные.';
    return 'Интересная картина. <strong>Подвигай ползунки</strong> — я покажу, что вижу.';
  }

  function updateWheelHint() {
    if (wheelHint) wheelHint.innerHTML = wheelInsightHtml();
  }

  function buildSliders() {
    if (!slidersRoot) return;
    slidersRoot.innerHTML = '';
    spheres.forEach(function (sphere, i) {
      var row = document.createElement('div');
      row.className = 'wheel__slider-row';
      row.innerHTML =
        '<span class="wheel__slider-emoji">' + sphere.emoji + '</span>' +
        '<span class="wheel__slider-name">' + sphere.name + '</span>' +
        '<input type="range" min="1" max="10" value="' + values[i] + '" data-index="' + i + '" aria-label="' + sphere.name + '">' +
        '<span class="wheel__slider-value" data-value="' + i + '">' + values[i] + '</span>';
      slidersRoot.appendChild(row);
    });
    slidersRoot.querySelectorAll('input[type="range"]').forEach(function (input) {
      input.addEventListener('input', function () {
        var idx = +input.dataset.index;
        values[idx] = +input.value;
        slidersRoot.querySelector('[data-value="' + idx + '"]').textContent = input.value;
        drawRadar();
        updateWheelHint();
      });
    });
  }

  function sizeRadarCanvas() {
    if (!canvas) return;
    var stage = canvas.parentElement;
    var size = stage ? Math.round(stage.getBoundingClientRect().width) : 0;
    if (size < 2) size = 180;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var px = Math.round(size * dpr);
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px;
      canvas.height = px;
    }
  }

  function drawRadar() {
    if (!canvas) return;
    sizeRadarCanvas();
    var ctx = canvas.getContext('2d');
    var theme = wheelTheme();
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;
    var maxR = Math.min(cx, cy) * 0.92;
    var count = spheres.length;
    var angleStep = (Math.PI * 2) / count;
    var ringW = Math.max(0.8, w / 280);
    var spokeW = Math.max(0.9, w / 260);

    ctx.clearRect(0, 0, w, h);

    // Grid + spokes — same center/angles as data polygon
    for (var lv = 2; lv <= 10; lv += 2) {
      var rr = maxR * (lv / 10);
      ctx.beginPath();
      for (var g = 0; g < count; g++) {
        var ga = g * angleStep - Math.PI / 2;
        var gx = cx + Math.cos(ga) * rr;
        var gy = cy + Math.sin(ga) * rr;
        if (g === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.closePath();
      ctx.strokeStyle = theme.ring;
      ctx.lineWidth = ringW;
      ctx.stroke();
    }

    for (var s = 0; s < count; s++) {
      var sa = s * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sa) * maxR, cy + Math.sin(sa) * maxR);
      ctx.strokeStyle = theme.spoke;
      ctx.lineWidth = spokeW;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    var points = [];
    for (var d = 0; d < count; d++) {
      var da = d * angleStep - Math.PI / 2;
      var dr = (values[chartOrder[d]] / 10) * maxR;
      var dx = cx + Math.cos(da) * dr;
      var dy = cy + Math.sin(da) * dr;
      points.push({ x: dx, y: dy });
      if (d === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.closePath();
    ctx.fillStyle = theme.fill;
    ctx.fill();
    ctx.strokeStyle = theme.stroke;
    ctx.lineWidth = Math.max(2, w / 160);
    ctx.lineJoin = 'round';
    ctx.stroke();

    var dotR = Math.max(3.5, w / 85);
    points.forEach(function (pt) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = theme.dot;
      ctx.fill();
      ctx.strokeStyle = theme.dotStroke;
      ctx.lineWidth = Math.max(1.2, w / 220);
      ctx.stroke();
    });
  }

  function showWheelResult() {
    if (!wheelResult || !wheelResultInner) return;
    var theme = wheelTheme();
    var scored = spheres.map(function (s, i) {
      return {
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        pkg: s.pkg,
        advice: s.advice,
        val: values[i]
      };
    });
    var avg = scored.reduce(function (a, b) { return a + b.val; }, 0) / scored.length;
    var sorted = scored.slice().sort(function (a, b) { return a.val - b.val; });
    var weakest = sorted[0];
    var second = sorted[1];
    var strongest = sorted[sorted.length - 1];
    var lowCount = scored.filter(function (x) { return x.val <= 4; }).length;

    var ovl;
    if (avg >= 8) ovl = 'Сильная, наполненная карта';
    else if (avg >= 6.5) ovl = 'В целом устойчиво';
    else if (avg >= 5) ovl = 'Есть куда расти';
    else if (avg >= 3.5) ovl = 'Много сфер просело';
    else ovl = 'Почти всё в красной зоне';

    var growth = sorted.filter(function (x) { return x.val <= 6; }).slice(0, 3);
    if (growth.length < 2) growth = sorted.slice(0, 2);

    var primaryKey = lowCount >= 4 ? 'full' : weakest.pkg;
    var sec = [];
    function pushSec(k) {
      if (k && k !== primaryKey && sec.indexOf(k) === -1 && WHEEL_PKGS[k]) sec.push(k);
    }
    pushSec(second.pkg);
    pushSec(weakest.pkg);
    pushSec('destiny');
    pushSec('forecast');
    sec = sec.slice(0, 2);

    var primary = WHEEL_PKGS[primaryKey];
    var reason = primaryKey === 'full'
      ? 'Сразу несколько сфер в красной зоне — по одной их не вытянуть. «Полный разбор» показывает всю карту целиком и подсказывает, за какую ниточку тянуть первой.'
      : 'Твоя самая просевшая сфера — «' + weakest.name + '». «' + primary.name + '» смотрит ровно в этот блок — с него и стоит начать.';

    var circ = 2 * Math.PI * 52;
    var off = circ * (1 - avg / 10);
    var trackStroke = document.documentElement.getAttribute('data-theme') === 'light'
      ? '#efe6d5'
      : 'rgba(255,255,255,0.12)';

    var growthHtml = growth.map(function (s) {
      return '<article class="wheel-result__growth-card">' +
        '<div class="wheel-result__growth-head">' +
          '<span>' + s.emoji + '</span>' +
          '<strong>' + s.name + '</strong>' +
          '<em class="' + colorForVal(s.val) + '">' + s.val + '<i>/10</i></em>' +
        '</div>' +
        '<p>' + s.advice + '</p>' +
      '</article>';
    }).join('');

    var secHtml = sec.map(function (k) {
      var q = WHEEL_PKGS[k];
      return '<button type="button" class="wheel-result__sec-card" data-wheel-buy="' + q.name + '">' +
        '<div class="icon">' + q.icon + '</div>' +
        '<strong>' + q.name + '</strong>' +
        '<p>' + q.desc + '</p>' +
        '<div class="row">' + formatTenge(q.price) + '<span>Взять →</span></div>' +
      '</button>';
    }).join('');

    wheelResultInner.innerHTML =
      '<p class="wheel-result__eyebrow">твоя карта на сегодня</p>' +
      '<h2 class="wheel-result__title">Вот что видно в <em>твоём балансе</em></h2>' +
      '<div class="wheel-result__summary">' +
        '<div class="wheel-result__score">' +
          '<svg viewBox="0 0 132 132" aria-hidden="true">' +
            '<circle cx="66" cy="66" r="52" fill="none" stroke="' + trackStroke + '" stroke-width="11"></circle>' +
            '<circle cx="66" cy="66" r="52" fill="none" stroke="' + theme.accent + '" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"></circle>' +
          '</svg>' +
          '<div class="wheel-result__score-num">' + avg.toFixed(1) + '<span>из 10</span></div>' +
        '</div>' +
        '<div>' +
          '<h3>' + ovl + '</h3>' +
          '<p>Сильнее всего — <strong>' + strongest.name + '</strong> (' + strongest.val + '/10). Самая просевшая — <strong>' + weakest.name + '</strong> (' + weakest.val + '/10). Разрыв между ними и есть твой настоящий дисбаланс.</p>' +
        '</div>' +
      '</div>' +
      '<h3 class="wheel-result__section-title">Точки роста <span>— куда смотреть в первую очередь</span></h3>' +
      '<div class="wheel-result__growth">' + growthHtml + '</div>' +
      '<h3 class="wheel-result__section-title">Что тебе подойдёт</h3>' +
      '<div class="wheel-result__primary">' +
        '<p class="wheel-result__primary-label">рекомендую начать с этого</p>' +
        '<div class="wheel-result__primary-row">' +
          '<span class="icon">' + primary.icon + '</span>' +
          '<div><h4>' + primary.name + '</h4><p class="desc">' + primary.desc + '</p></div>' +
          '<div class="price">' + formatTenge(primary.price) + '</div>' +
        '</div>' +
        '<p class="reason">' + reason + '</p>' +
        '<button type="button" class="wheel-result__buy" data-wheel-buy="' + primary.name + '">Взять «' + primary.name + '» →</button>' +
      '</div>' +
      (secHtml ? '<p class="wheel-result__also">А ещё под твою карту подходит:</p><div class="wheel-result__sec">' + secHtml + '</div>' : '') +
      '<button type="button" class="wheel-result__again" id="wheelAgain">← изменить оценки</button>';

    wheelResult.hidden = false;
    if (wheelGo) wheelGo.textContent = 'Обновить результат ✦';

    wheelResultInner.querySelectorAll('[data-wheel-buy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-wheel-buy');
        if (name === 'Число судьбы') {
          var calc = document.getElementById('calc');
          if (calc) {
            calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
        openOrderModal(name);
      });
    });

    var again = document.getElementById('wheelAgain');
    if (again) {
      again.addEventListener('click', function () {
        var panel = document.querySelector('.wheel__panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    requestAnimationFrame(function () {
      wheelResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      values = spheres.map(function () { return 5; });
      buildSliders();
      drawRadar();
      updateWheelHint();
    });
  }

  if (wheelGo) {
    wheelGo.addEventListener('click', showWheelResult);
  }

  buildSliders();
  drawRadar();
  updateWheelHint();
  window.velunaRedrawWheel = function () {
    drawRadar();
  };

  window.addEventListener('resize', function () {
    drawRadar();
  });
  requestAnimationFrame(drawRadar);

  var track = document.getElementById('productsTrack');
  var prevBtn = document.getElementById('productsPrev');
  var nextBtn = document.getElementById('productsNext');

  if (track) {
    var originals = Array.prototype.slice.call(track.children).filter(function (el) {
      return el.classList && el.classList.contains('products__card');
    });
    var n = originals.length;
    var gap = 20;
    var jumping = false;
    var loopEnabled = false;
    var mq = window.matchMedia('(max-width: 768px)');

    function markClone(node) {
      node.classList.add('is-clone');
      node.setAttribute('aria-hidden', 'true');
      node.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
      return node;
    }

    function removeClones() {
      track.querySelectorAll('.products__card.is-clone').forEach(function (el) {
        el.parentNode.removeChild(el);
      });
      loopEnabled = false;
    }

    function buildClones() {
      if (loopEnabled || !n) return;
      originals.forEach(function (card) {
        track.appendChild(markClone(card.cloneNode(true)));
      });
      for (var i = n - 1; i >= 0; i--) {
        track.insertBefore(markClone(originals[i].cloneNode(true)), track.firstChild);
      }
      loopEnabled = true;
    }

    function cardStep() {
      var card = track.querySelector('.products__card:not(.is-clone), .products__card');
      return card ? card.offsetWidth + gap : 252;
    }

    function setWidth() {
      var cards = track.querySelectorAll('.products__card');
      if (cards.length >= n * 2) {
        return cards[n].offsetLeft - cards[0].offsetLeft;
      }
      return cardStep() * n;
    }

    function jumpBy(delta) {
      jumping = true;
      var snap = track.style.scrollSnapType;
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      track.scrollLeft += delta;
      void track.scrollLeft;
      track.style.scrollBehavior = '';
      track.style.scrollSnapType = snap;
      requestAnimationFrame(function () { jumping = false; });
    }

    function normalizeLoop() {
      if (jumping || !n || !loopEnabled || mq.matches) return;
      var setW = setWidth();
      if (setW <= 0) return;
      if (track.scrollLeft < setW) {
        jumpBy(setW);
      } else if (track.scrollLeft >= setW * 2) {
        jumpBy(-setW);
      }
    }

    function scrollCarousel(dir) {
      if (mq.matches) return;
      track.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
      window.setTimeout(normalizeLoop, 420);
    }

    function centerFeatured() {
      if (mq.matches) {
        track.scrollLeft = 0;
        return;
      }
      var all = track.querySelectorAll('.products__card');
      var featured = null;
      var start = loopEnabled ? n : 0;
      var end = loopEnabled ? n * 2 : all.length;
      for (var j = start; j < end; j++) {
        if (all[j] && all[j].classList.contains('products__card--featured')) {
          featured = all[j];
          break;
        }
      }
      if (!featured) featured = all[start] || all[0];
      if (!featured) return;
      jumping = true;
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = featured.offsetLeft - (track.clientWidth - featured.offsetWidth) / 2;
      void track.scrollLeft;
      track.style.scrollBehavior = '';
      track.style.scrollSnapType = '';
      requestAnimationFrame(function () { jumping = false; });
    }

    function syncMode() {
      if (mq.matches) {
        removeClones();
        track.scrollLeft = 0;
      } else {
        buildClones();
        requestAnimationFrame(centerFeatured);
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { scrollCarousel(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { scrollCarousel(1); });

    var scrollTimer;
    track.addEventListener('scroll', function () {
      if (jumping || mq.matches) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(normalizeLoop, 80);
    }, { passive: true });

    syncMode();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', syncMode);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(syncMode);
    }
  }
})();
