(function () {
  'use strict';

  var boot = document.getElementById('boot');
  var bootText = document.getElementById('bootText');
  var authStage = document.getElementById('authStage');
  var hubStage = document.getElementById('hubStage');
  var authMsg = document.getElementById('authMsg');
  var dashMsg = document.getElementById('dashMsg');
  var botName = 'soulmetrica_bot';
  var state = { user: null, readings: [], orders: [], currentReadingId: '', view: 'home', previewFmt: 'html' };

  var SERVICES = [
    { name: 'Полный разбор', kzt: 9900, desc: '12 глав: характер, деньги, любовь, блоки, прогноз и горизонт' },
    { name: 'Денежный код', kzt: 3990, desc: 'Где именно денежный блок и как его снять' },
    { name: 'Сценарий любви', kzt: 4990, desc: 'Почему повторяется один и тот же круг' },
    { name: 'Скрытые блоки', kzt: 3990, desc: 'Корень сценария и сеть по сферам' },
    { name: 'Детский разбор', kzt: 3990, desc: 'Характер, таланты и мягкие зоны роста ребёнка по дате' },
    { name: 'Прогноз 2026', kzt: 3990, desc: 'Окна года и точки выбора' },
    { name: 'Реализация', kzt: 3990, desc: 'Сила, путь и где сливается энергия' },
    { name: 'Совместимость пары', kzt: 6990, desc: 'Две даты — притяжение и трещины' },
    { name: 'Число судьбы', kzt: 1990, desc: 'Первый слой: характер, сила и урок' }
  ];

  function money(kzt) {
    return window.VelunaMoney ? window.VelunaMoney.format(kzt) : String(kzt).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function pendingOrderId() {
    return params().get('order') || localStorage.getItem('veluna-last-order') || '';
  }

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'include' }, opts || {})).then(function (r) {
      return r.json().then(function (j) {
        return { okHttp: r.ok, status: r.status, body: j };
      });
    });
  }

  function showMsg(el, text, isErr) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isErr && !!text);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusLabel(s) {
    if (s === 'ready') return 'Готов';
    if (s === 'generating') return 'Готовим…';
    if (s === 'failed') return 'Ошибка';
    if (s === 'paid') return 'Оплачен';
    if (s === 'pending') return 'Ожидает оплаты';
    return 'В очереди';
  }

  function statusBadge(s) {
    var ok = s === 'ready' || s === 'paid';
    var wait = s === 'generating' || s === 'queued' || s === 'pending';
    return (
      '<span class="badge ' +
      (ok ? 'badge--ok' : wait ? 'badge--wait' : '') +
      '">' +
      escapeHtml(statusLabel(s)) +
      '</span>'
    );
  }

  function finishBoot(text) {
    if (text && bootText) bootText.textContent = text;
    requestAnimationFrame(function () {
      setTimeout(function () {
        if (boot) boot.classList.add('is-done');
      }, 220);
    });
  }

  function setBotLinks(name) {
    botName = name || botName;
    var link = document.getElementById('tgDeepLink');
    if (link) link.href = 'https://telegram.me/' + botName + '?start=login';
  }

  function setGuest() {
    document.body.classList.remove('is-hub');
    hubStage.classList.add('hidden');
    authStage.classList.remove('hidden');
    finishBoot('Нужен вход');
  }

  function initials(name) {
    var parts = String(name || 'Y').trim().split(/\s+/);
    return ((parts[0] && parts[0][0]) || 'Y').toUpperCase();
  }

  function setView(view) {
    state.view = view || 'home';
    document.querySelectorAll('.nav-item[data-view]').forEach(function (el) {
      el.classList.toggle('is-active', el.getAttribute('data-view') === state.view);
    });
    document.querySelectorAll('.view').forEach(function (el) {
      el.classList.toggle('is-on', el.id === 'view-' + state.view);
    });
    var titles = {
      home: ['Панель кабинета', 'Разборы, заказы и аккаунт в одном месте'],
      readings: ['Разборы', 'Превью и скачивание'],
      orders: ['Заказы', 'Оплаты и статусы'],
      services: ['Услуги', 'Что можно заказать'],
      account: ['Аккаунт', 'Данные профиля']
    };
    var t = titles[state.view] || titles.home;
    document.getElementById('pageTitle').textContent = t[0];
    document.getElementById('pageSub').textContent = t[1];
    if (state.view === 'readings') ensurePreview();
    closeSide();
  }

  function closeSide() {
    hubStage.classList.remove('is-side-open');
    document.body.classList.remove('hub-open');
  }

  function openSide() {
    hubStage.classList.add('is-side-open');
    document.body.classList.add('hub-open');
  }

  function renderSideReadings() {
    var box = document.getElementById('sideReadings');
    var rail = document.getElementById('readingsRail');
    var all = state.readings.slice(0, 20);
    if (box) box.innerHTML = '';
    if (!rail) return;
    if (!all.length) {
      rail.innerHTML = '<p style="padding:8px 4px;color:var(--hub-faint);font-size:.78rem">Нет разборов</p>';
      return;
    }
    rail.innerHTML = all
      .map(function (r) {
        return (
          '<button type="button" class="read-item' +
          (r.id === state.currentReadingId ? ' is-active' : '') +
          '" data-open-reading="' +
          escapeHtml(r.id) +
          '"><div class="read-item__title">' +
          escapeHtml(r.title) +
          '</div><div class="read-item__meta">' +
          escapeHtml(statusLabel(r.status)) +
          '</div></button>'
        );
      })
      .join('');
  }

  function readingById(id) {
    for (var i = 0; i < state.readings.length; i++) {
      if (state.readings[i].id === id) return state.readings[i];
    }
    return null;
  }

  function docUrlFor(id) {
    var r = readingById(id);
    var q = '/api/readings/doc?id=' + encodeURIComponent(id);
    if (r && r.shareToken) q += '&t=' + encodeURIComponent(r.shareToken);
    return q;
  }

  function downloadUrlFor(id, fmt, inline) {
    var r = readingById(id);
    var q =
      '/api/readings/download?id=' +
      encodeURIComponent(id) +
      '&fmt=' +
      encodeURIComponent(fmt);
    if (inline) q += '&inline=1';
    if (r && r.shareToken) q += '&t=' + encodeURIComponent(r.shareToken);
    return q;
  }

  function previewUrlFor(id) {
    if (state.previewFmt === 'pdf') return downloadUrlFor(id, 'pdf', true);
    return docUrlFor(id);
  }

  function setPreviewFmt(fmt) {
    state.previewFmt = fmt === 'pdf' ? 'pdf' : 'html';
    var htmlBtn = document.getElementById('btnDlHtml');
    var pdfBtn = document.getElementById('btnDlPdf');
    if (htmlBtn) htmlBtn.classList.toggle('btn--gold', state.previewFmt === 'html');
    if (htmlBtn) htmlBtn.classList.toggle('btn--ghost', state.previewFmt !== 'html');
    if (pdfBtn) pdfBtn.classList.toggle('btn--gold', state.previewFmt === 'pdf');
    if (pdfBtn) pdfBtn.classList.toggle('btn--ghost', state.previewFmt !== 'pdf');
    var frame = document.getElementById('previewFrame');
    if (frame) frame.removeAttribute('data-src');
    ensurePreview();
  }

  function renderHome() {
    document.getElementById('statReadings').textContent = String(state.readings.length);
    document.getElementById('statOrders').textContent = String(state.orders.length);
    document.getElementById('statStatus').textContent = state.user.telegram_id ? 'TG' : 'Email';
    document.getElementById('statStatusHint').textContent = state.user.telegram_id
      ? 'Telegram подключён'
      : 'вход по email';

    var box = document.getElementById('homeLatest');
    var list = state.readings.slice(0, 6);
    if (!list.length) {
      box.innerHTML =
        '<div class="empty"><strong>Разборов ещё нет</strong>Оформи услугу — и она появится здесь вместе с Telegram-доставкой.</div>';
      return;
    }
    box.innerHTML = list
      .map(function (r, idx) {
        return (
          '<button type="button" class="read-item" data-open-reading="' +
          escapeHtml(r.id) +
          '" style="display:flex;justify-content:space-between;align-items:center;gap:12px;' +
          (idx ? 'border-top:1px solid var(--hub-line);' : 'border-top:0;') +
          'border-radius:0;padding:14px 0">' +
          '<div style="text-align:left;min-width:0"><div class="read-item__title">' +
          escapeHtml(r.title) +
          '</div><div class="read-item__meta">' +
          escapeHtml(statusLabel(r.status)) +
          '</div></div>' +
          statusBadge(r.status) +
          '</button>'
        );
      })
      .join('');
  }

  function renderOrders() {
    var box = document.getElementById('ordersList');
    if (!state.orders.length) {
      box.innerHTML = '<div class="empty"><strong>Заказов пока нет</strong>После оплаты они появятся здесь.</div>';
      return;
    }
    box.innerHTML = state.orders
      .map(function (o) {
        return (
          '<div class="order-row"><div><h3>' +
          escapeHtml(o.product || 'Заказ') +
          '</h3><p>' +
          escapeHtml(o.id) +
          (o.amount != null ? ' · ' + Number(o.amount).toLocaleString('ru-RU') + ' ₸' : '') +
          '</p></div>' +
          statusBadge(o.status) +
          '</div>'
        );
      })
      .join('');
  }

  function renderServices() {
    document.getElementById('servicesList').innerHTML = SERVICES.map(function (s) {
      return (
        '<div class="svc-row"><div><h3>' +
        escapeHtml(s.name) +
        '</h3><p>' +
        escapeHtml(s.desc) +
        '</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="color:var(--hub-accent)">' +
        escapeHtml(money(s.kzt)) +
        '</b><a class="btn btn--ghost" href="/#products">Выбрать</a></div></div>'
      );
    }).join('');
  }

  function renderAccount() {
    var u = state.user;
    document.getElementById('accountInfo').innerHTML =
      '<div><b>Имя</b><span>' +
      escapeHtml(u.display_name || '—') +
      '</span></div>' +
      '<div><b>Email</b><span>' +
      escapeHtml(u.email || 'не указан') +
      '</span></div>' +
      '<div><b>Telegram</b><span>' +
      (u.telegram_id
        ? 'подключён' + (u.telegram_username ? ' · @' + escapeHtml(u.telegram_username) : '')
        : 'не подключён') +
      '</span></div>' +
      '<div><b>ID</b><span style="font-size:.8rem;color:var(--faint)">' +
      escapeHtml(u.id) +
      '</span></div>';
  }

  function fillReadingSelect() {
    var sel = document.getElementById('readingSelect');
    var ready = state.readings.filter(function (r) {
      return r.status === 'ready';
    });
    if (!ready.length) {
      sel.innerHTML = '<option value="">Нет готовых разборов</option>';
      return;
    }
    sel.innerHTML = ready
      .map(function (r) {
        return (
          '<option value="' +
          escapeHtml(r.id) +
          '"' +
          (r.id === state.currentReadingId ? ' selected' : '') +
          '>' +
          escapeHtml(r.title) +
          '</option>'
        );
      })
      .join('');
  }

  function ensurePreview() {
    var ready = state.readings.filter(function (r) {
      return r.status === 'ready';
    });
    var empty = document.getElementById('previewEmpty');
    var shell = document.getElementById('previewShell');
    var frame = document.getElementById('previewFrame');
    var loading = document.getElementById('previewLoading');
    fillReadingSelect();
    renderSideReadings();
    if (!ready.length) {
      empty.classList.remove('hidden');
      if (shell) shell.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    if (shell) shell.classList.remove('hidden');
    if (!state.currentReadingId) state.currentReadingId = ready[0].id;
    var url = previewUrlFor(state.currentReadingId);
    if (loading) {
      loading.classList.remove('is-off');
      loading.innerHTML =
        state.previewFmt === 'pdf'
          ? '<div><div class="preview-loading__spin"></div><div>Собираем PDF-превью…</div></div>'
          : '<div><div class="preview-loading__spin"></div><div>Загружаем разбор…</div></div>';
    }
    if (frame.getAttribute('data-src') !== url) {
      frame.setAttribute('data-src', url);
      frame.onload = function () {
        if (loading) loading.classList.add('is-off');
      };
      frame.onerror = function () {
        if (loading) {
          loading.classList.remove('is-off');
          loading.innerHTML =
            '<div><strong style="color:var(--hub-ink)">Не удалось открыть превью</strong><div style="margin-top:8px">Попробуй «На весь экран» или другой формат.</div></div>';
        }
      };
      frame.src = url;
    } else if (loading) {
      loading.classList.add('is-off');
    }
    fillReadingSelect();
    renderSideReadings();
  }

  function openReading(id) {
    state.currentReadingId = id;
    var frame = document.getElementById('previewFrame');
    if (frame) frame.removeAttribute('data-src');
    setView('readings');
    ensurePreview();
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('view', 'readings');
      u.searchParams.set('reading', id);
      window.history.replaceState({}, '', u.pathname + '?' + u.searchParams.toString());
    } catch (e) {}
  }

  function setAuthed(user, readings, orders) {
    state.user = user;
    state.readings = readings || [];
    state.orders = orders || [];
    authStage.classList.add('hidden');
    hubStage.classList.remove('hidden');
    document.body.classList.add('is-hub');

    var name = user.display_name || user.email || 'друг';
    document.getElementById('userName').textContent = name;
    document.getElementById('userAv').textContent = initials(name);
    document.getElementById('userMeta').textContent = user.telegram_username
      ? '@' + user.telegram_username
      : user.email || 'SoulMetrica';

    renderSideReadings();
    renderHome();
    renderOrders();
    renderServices();
    renderAccount();
    fillReadingSelect();

    var orderId = pendingOrderId();
    var linkBtn = document.getElementById('linkOrderBtn');
    if (orderId) {
      linkBtn.classList.remove('hidden');
      linkBtn.onclick = function () {
        api('/api/orders/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: orderId })
        }).then(function (res) {
          if (res.body.ok) {
            showMsg(dashMsg, 'Заказ привязан', false);
            loadMe();
          } else showMsg(dashMsg, res.body.error || 'Ошибка', true);
        });
      };
    } else {
      linkBtn.classList.add('hidden');
    }

    var view = params().get('view');
    var rid = params().get('reading');
    if (rid) openReading(rid);
    else setView(view || 'home');

    finishBoot('Готово');
  }

  function loadMe() {
    if (bootText) bootText.textContent = 'Собираем кабинет…';
    return api('/api/auth/me').then(function (res) {
      if (res.body.ok && res.body.user) {
        setAuthed(res.body.user, res.body.readings, res.body.orders);
        return true;
      }
      setGuest();
      return false;
    }).catch(function () {
      setGuest();
      return false;
    });
  }

  function resolveBot() {
    return fetch('/api/telegram-bot')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.bot) setBotLinks(j.bot);
      })
      .catch(function () {
        setBotLinks(botName);
      });
  }

  // events
  document.querySelectorAll('.nav-item[data-view]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-view'));
    });
  });

  document.querySelectorAll('[data-go]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-go'));
    });
  });

  document.getElementById('sideToggle').addEventListener('click', closeSide);
  document.getElementById('mobileMenuBtn').addEventListener('click', openSide);
  document.getElementById('sideScrim').addEventListener('click', closeSide);

  document.getElementById('themeToggle').addEventListener('click', function () {
    var root = document.documentElement;
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('veluna-theme', next);
    } catch (e) {}
  });

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-open-reading]');
    if (open) {
      e.preventDefault();
      openReading(open.getAttribute('data-open-reading'));
    }
  });

  document.getElementById('readingSelect').addEventListener('change', function (e) {
    if (e.target.value) openReading(e.target.value);
  });

  document.getElementById('btnOpenFull').addEventListener('click', function () {
    if (!state.currentReadingId) return;
    window.location.href = '/reading?id=' + encodeURIComponent(state.currentReadingId);
  });
  document.getElementById('btnDlHtml').addEventListener('click', function () {
    if (!state.currentReadingId) return;
    setPreviewFmt('html');
  });
  document.getElementById('btnDlPdf').addEventListener('click', function () {
    if (!state.currentReadingId) return;
    setPreviewFmt('pdf');
  });

  document.querySelectorAll('.tabs button').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tabs button').forEach(function (t) {
        t.classList.toggle('is-active', t === tab);
      });
      var which = tab.getAttribute('data-tab');
      var phoneForm = document.getElementById('phoneForm');
      var loginForm = document.getElementById('loginForm');
      var registerForm = document.getElementById('registerForm');
      if (phoneForm) phoneForm.classList.toggle('hidden', which !== 'phone');
      loginForm.classList.toggle('hidden', which !== 'login');
      registerForm.classList.toggle('hidden', which !== 'register');
      var titles = { phone: 'Вход', login: 'Вход', register: 'Регистрация' };
      document.getElementById('authTitle').textContent = titles[which] || 'Вход';
      showMsg(authMsg, '');
    });
  });

  var phoneFormEl = document.getElementById('phoneForm');
  if (phoneFormEl) {
    phoneFormEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var phone = String(fd.get('phone') || '').trim();
      showMsg(authMsg, 'Готовим ссылку в Telegram…');
      api('/api/auth/phone-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone })
      }).then(function (res) {
        if (res.body && res.body.ok && res.body.botUrl) {
          showMsg(
            authMsg,
            (res.body.ordersFound
              ? 'Нашли заказ(ы) на этот номер. '
              : 'Номер приняли. ') + 'Открываю Telegram…'
          );
          setTimeout(function () {
            window.location.href = res.body.botUrl;
          }, 600);
        } else {
          showMsg(authMsg, (res.body && res.body.error) || 'Не удалось начать вход', true);
        }
      }).catch(function () {
        showMsg(authMsg, 'Сеть недоступна', true);
      });
    });
  }

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    boot.classList.remove('is-done');
    if (bootText) bootText.textContent = 'Входим…';
    api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
    }).then(function (res) {
      if (res.body.ok) loadMe();
      else {
        finishBoot();
        showMsg(authMsg, res.body.error || 'Ошибка входа', true);
      }
    });
  });

  document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    boot.classList.remove('is-done');
    if (bootText) bootText.textContent = 'Создаём аккаунт…';
    api('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
        name: fd.get('name')
      })
    }).then(function (res) {
      if (res.body.ok) loadMe();
      else {
        finishBoot();
        showMsg(authMsg, res.body.error || 'Ошибка регистрации', true);
      }
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () {
      state = { user: null, readings: [], orders: [], currentReadingId: '', view: 'home', previewFmt: 'html' };
      setGuest();
      showMsg(authMsg, '');
    });
  });

  if (params().get('err') === 'tg') {
    showMsg(authMsg, 'Ссылка из Telegram устарела. Нажми «Войти через Telegram» ещё раз.', true);
  }
  if (params().get('need') === 'tg') {
    showMsg(
      authMsg,
      'Чтобы получить разбор, подтверди Telegram: кнопка выше или вход по телефону → бот пришлёт ссылку.',
      false
    );
  }

  resolveBot().then(function () {
    return loadMe();
  });

  if (window.VelunaMoney) {
    window.VelunaMoney.init({ askGeo: true }).then(function () {
      try {
        renderServices();
      } catch (e) {}
    });
    window.VelunaMoney.onChange(function () {
      try {
        renderServices();
      } catch (e) {}
    });
  }
})();
