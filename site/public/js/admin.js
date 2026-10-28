(function () {
  'use strict';

  var loginStage = document.getElementById('loginStage');
  var appStage = document.getElementById('appStage');
  var loginMsg = document.getElementById('loginMsg');
  var appMsg = document.getElementById('appMsg');
  var state = { user: null, selectedOrderId: '', selectedUserId: '' };

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'include' }, opts || {})).then(function (r) {
      return r.json().then(function (j) {
        return { okHttp: r.ok, status: r.status, body: j };
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(n) {
    return String(Number(n) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸';
  }

  function badge(status) {
    var cls = 'badge';
    if (status === 'paid' || status === 'ready') cls += ' badge--ok';
    else if (status === 'pending' || status === 'queued' || status === 'generating') cls += ' badge--wait';
    else if (status === 'failed' || status === 'cancelled') cls += ' badge--bad';
    return '<span class="' + cls + '">' + esc(status) + '</span>';
  }

  function showMsg(el, text, isErr) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isErr && !!text);
  }

  function setView(name) {
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-view') === name);
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('is-on', v.id === 'view-' + name);
    });
    if (name === 'home') loadDashboard();
    if (name === 'orders') loadOrders();
    if (name === 'funnels') loadFunnels();
    if (name === 'prices') loadPrices();
    if (name === 'users') loadUsers();
    if (name === 'readings') loadReadings();
    if (name === 'settings') loadSettings();
    if (name === 'activity') loadActivity();
    if (name === 'audit') loadAudit();
  }

  function enterApp(user) {
    state.user = user;
    loginStage.classList.add('hidden');
    appStage.classList.remove('hidden');
    document.getElementById('adminName').textContent = (user.display_name || user.email || 'admin') + ' · admin';
    setView('home');
  }

  function loadMe() {
    return api('/api/admin/me').then(function (res) {
      if (res.body && res.body.ok && res.body.user) {
        enterApp(res.body.user);
        return true;
      }
      return false;
    }).catch(function () {
      return false;
    });
  }

  function loadDashboard() {
    api('/api/admin/dashboard').then(function (res) {
      if (!res.body.ok) return;
      var s = res.body.stats || {};
      document.getElementById('statRevenue').textContent = money(s.revenue);
      document.getElementById('statOrders').textContent = String(s.orders || 0);
      document.getElementById('statUsers').textContent = String(s.users || 0);
      document.getElementById('statReady').textContent = String((s.readings && s.readings.ready) || 0);
      var rows = res.body.recentOrders || [];
      document.getElementById('homeOrders').innerHTML = rows.length
        ? '<table><thead><tr><th>ID</th><th>Продукт</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>' +
          rows
            .map(function (o) {
              return (
                '<tr><td class="mono">' +
                esc(o.id) +
                '</td><td>' +
                esc(o.product) +
                '</td><td>' +
                esc(money(o.amount)) +
                '</td><td>' +
                badge(o.status) +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пока пусто</p>';
    });
  }

  function loadOrders() {
    var st = document.getElementById('orderStatusFilter').value;
    api('/api/admin/orders' + (st ? '?status=' + encodeURIComponent(st) : '')).then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.orders || [];
      document.getElementById('ordersList').innerHTML = list.length
        ? '<table><thead><tr><th>Заказ</th><th>Сумма</th><th></th></tr></thead><tbody>' +
          list
            .map(function (o) {
              return (
                '<tr><td><div>' +
                esc(o.product) +
                '</div><div class="mono">' +
                esc(o.id) +
                '</div><div>' +
                badge(o.status) +
                '</div></td><td>' +
                esc(money(o.amount)) +
                '</td><td><button type="button" class="btn" data-order="' +
                esc(o.id) +
                '">Открыть</button></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Нет заказов</p>';
    });
  }

  function openOrder(id) {
    state.selectedOrderId = id;
    api('/api/admin/orders?id=' + encodeURIComponent(id)).then(function (res) {
      if (!res.body.ok) {
        showMsg(appMsg, res.body.error || 'Ошибка', true);
        return;
      }
      var o = res.body.order;
      var reads = res.body.readings || [];
      document.getElementById('orderDetail').innerHTML =
        '<div class="field"><span>ID</span><div class="mono">' +
        esc(o.id) +
        '</div></div>' +
        '<label class="field"><span>Продукт</span><input id="odProduct" value="' +
        esc(o.product || '') +
        '"></label>' +
        '<label class="field"><span>Сумма ₸</span><input id="odAmount" type="number" min="30" value="' +
        esc(o.amount) +
        '"></label>' +
        '<label class="field"><span>Статус</span><select id="odStatus"><option>pending</option><option>paid</option><option>cancelled</option><option>failed</option></select></label>' +
        '<label class="field"><span>Имя</span><input id="odName" value="' +
        esc(o.customer_name || '') +
        '"></label>' +
        '<label class="field"><span>Телефон</span><input id="odPhone" value="' +
        esc(o.phone || '') +
        '"></label>' +
        '<label class="field"><span>Contact / TG</span><input id="odContact" value="' +
        esc(o.contact || '') +
        '"></label>' +
        '<div class="toolbar" style="margin:10px 0">' +
        '<button type="button" class="btn btn--solid" id="odSave">Сохранить</button>' +
        '<button type="button" class="btn btn--ok" id="odMarkPaid">Пометить paid + генерация</button>' +
        '<button type="button" class="btn" id="odRequeue">Перезапуск pipeline</button>' +
        '</div>' +
        '<h3 style="margin:12px 0 8px">Разборы</h3>' +
        (reads.length
          ? '<table><thead><tr><th>Title</th><th>Status</th></tr></thead><tbody>' +
            reads
              .map(function (r) {
                return '<tr><td>' + esc(r.title) + '<div class="mono">' + esc(r.id) + '</div></td><td>' + badge(r.status) + '</td></tr>';
              })
              .join('') +
            '</tbody></table>'
          : '<p class="msg">Нет чтений</p>');
      document.getElementById('odStatus').value = o.status;
      document.getElementById('odSave').onclick = function () {
        api('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            product: document.getElementById('odProduct').value,
            amount: +document.getElementById('odAmount').value,
            status: document.getElementById('odStatus').value,
            customer_name: document.getElementById('odName').value,
            phone: document.getElementById('odPhone').value,
            contact: document.getElementById('odContact').value
          })
        }).then(function (r) {
          showMsg(appMsg, r.body.ok ? 'Заказ сохранён' : r.body.error || 'Ошибка', !r.body.ok);
          if (r.body.ok) {
            loadOrders();
            openOrder(id);
          }
        });
      };
      document.getElementById('odMarkPaid').onclick = function () {
        api('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, action: 'mark_paid' })
        }).then(function (r) {
          showMsg(appMsg, r.body.ok ? 'Оплата зафиксирована, генерация запущена' : r.body.error || 'Ошибка', !r.body.ok);
          if (r.body.ok) {
            loadOrders();
            openOrder(id);
          }
        });
      };
      document.getElementById('odRequeue').onclick = function () {
        api('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, action: 'requeue' })
        }).then(function (r) {
          showMsg(appMsg, r.body.ok ? 'Pipeline перезапущен' : r.body.error || 'Ошибка', !r.body.ok);
        });
      };
    });
  }

  function loadPrices() {
    api('/api/admin/prices').then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.prices || [];
      document.getElementById('pricesList').innerHTML =
        '<table><thead><tr><th>Ключ</th><th>Название</th><th>Цена ₸</th><th>EN $</th><th>Active</th><th></th></tr></thead><tbody>' +
        list
          .map(function (p) {
            return (
              '<tr data-key="' +
              esc(p.product_key) +
              '"><td class="mono">' +
              esc(p.product_key) +
              '</td><td><input class="cell-input" data-f="name" value="' +
              esc(p.name) +
              '"></td><td><input class="cell-input" data-f="amount" type="number" min="30" value="' +
              esc(p.amount_tenge) +
              '"></td><td><input class="cell-input" data-f="amount_usd" type="number" min="1" placeholder="—" value="' +
              (p.amount_usd != null ? esc(p.amount_usd) : '') +
              '"></td><td><select data-f="active"><option value="true"' +
              (p.active ? ' selected' : '') +
              '>да</option><option value="false"' +
              (!p.active ? ' selected' : '') +
              '>нет</option></select></td><td><button type="button" class="btn btn--solid" data-save-price="' +
              esc(p.product_key) +
              '">Save</button></td></tr>'
            );
          })
          .join('') +
        '</tbody></table>';
    });
  }

  function applyPricePreset(action, okText) {
    var msg = document.getElementById('pricesMsg');
    showMsg(msg, 'Сохраняю…');
    api('/api/admin/prices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action })
    }).then(function (res) {
      showMsg(msg, res.body.ok ? okText : res.body.error || 'Ошибка', !res.body.ok);
      if (res.body.ok) {
        loadPrices();
        if (typeof loadSettings === 'function') loadSettings();
        if (typeof loadDashboard === 'function') loadDashboard();
      }
    });
  }

  function loadUsers() {
    var q = document.getElementById('userQuery').value.trim();
    api('/api/admin/users' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.users || [];
      document.getElementById('usersList').innerHTML = list.length
        ? '<table><thead><tr><th>Клиент</th><th></th></tr></thead><tbody>' +
          list
            .map(function (u) {
              return (
                '<tr><td><div>' +
                esc(u.display_name || '—') +
                ' ' +
                badge(u.role) +
                (u.is_blocked ? ' ' + badge('blocked') : '') +
                '</div><div class="mono">' +
                esc(u.email || '') +
                ' · @' +
                esc(u.telegram_username || '—') +
                ' · ' +
                esc(u.phone || '') +
                '</div></td><td><button class="btn" data-user="' +
                esc(u.id) +
                '">Открыть</button></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Никого не нашлось</p>';
    });
  }

  function openUser(id) {
    state.selectedUserId = id;
    api('/api/admin/users?id=' + encodeURIComponent(id)).then(function (res) {
      if (!res.body.ok) return;
      var u = res.body.user;
      var orders = res.body.orders || [];
      document.getElementById('userDetail').innerHTML =
        '<label class="field"><span>Имя</span><input id="udName" value="' +
        esc(u.display_name || '') +
        '"></label>' +
        '<label class="field"><span>Email</span><input id="udEmail" value="' +
        esc(u.email || '') +
        '"></label>' +
        '<label class="field"><span>Телефон</span><input id="udPhone" value="' +
        esc(u.phone || '') +
        '"></label>' +
        '<label class="field"><span>Telegram username</span><input id="udTg" value="' +
        esc(u.telegram_username || '') +
        '"></label>' +
        '<label class="field"><span>Role</span><select id="udRole"><option value="user">user</option><option value="admin">admin</option></select></label>' +
        '<label class="field"><span>Blocked</span><select id="udBlocked"><option value="false">нет</option><option value="true">да</option></select></label>' +
        '<label class="field"><span>Notes</span><textarea id="udNotes" rows="4">' +
        esc(u.notes || '') +
        '</textarea></label>' +
        '<button type="button" class="btn btn--solid" id="udSave">Сохранить профиль</button>' +
        '<h3 style="margin:14px 0 8px">Заказы</h3>' +
        (orders.length
          ? '<ul>' +
            orders
              .map(function (o) {
                return '<li class="mono">' + esc(o.id) + ' · ' + esc(o.product) + ' · ' + money(o.amount) + ' · ' + esc(o.status) + '</li>';
              })
              .join('') +
            '</ul>'
          : '<p class="msg">Нет заказов</p>');
      document.getElementById('udRole').value = u.role || 'user';
      document.getElementById('udBlocked').value = u.is_blocked ? 'true' : 'false';
      document.getElementById('udSave').onclick = function () {
        api('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            display_name: document.getElementById('udName').value,
            email: document.getElementById('udEmail').value || null,
            phone: document.getElementById('udPhone').value || null,
            telegram_username: document.getElementById('udTg').value || null,
            role: document.getElementById('udRole').value,
            is_blocked: document.getElementById('udBlocked').value === 'true',
            notes: document.getElementById('udNotes').value
          })
        }).then(function (r) {
          showMsg(appMsg, r.body.ok ? 'Профиль обновлён' : r.body.error || 'Ошибка', !r.body.ok);
          if (r.body.ok) {
            loadUsers();
            openUser(id);
          }
        });
      };
    });
  }

  function loadReadings() {
    var st = document.getElementById('readingStatusFilter').value;
    api('/api/admin/readings' + (st ? '?status=' + encodeURIComponent(st) : '')).then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.readings || [];
      document.getElementById('readingsList').innerHTML = list.length
        ? '<table><thead><tr><th>Разбор</th><th>Статус</th><th></th></tr></thead><tbody>' +
          list
            .map(function (r) {
              return (
                '<tr><td>' +
                esc(r.title) +
                '<div class="mono">' +
                esc(r.id) +
                '</div><div class="mono">' +
                esc(r.order_id) +
                '</div></td><td>' +
                badge(r.status) +
                '</td><td class="toolbar">' +
                '<button class="btn" data-rq="' +
                esc(r.id) +
                '">Requeue</button>' +
                '<button class="btn" data-dl="' +
                esc(r.id) +
                '">Deliver TG</button>' +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пусто</p>';
    });
  }

  function loadSettings() {
    api('/api/admin/settings').then(function (res) {
      if (!res.body.ok) return;
      var c = res.body.checkout || {};
      document.getElementById('setTestMode').value = c.test_mode ? 'true' : 'false';
      document.getElementById('setForceSum').value = c.force_test_sum == null ? '' : String(c.force_test_sum);
      document.getElementById('setPayProvider').value = c.payment_provider || 'unicorn';
      document.getElementById('setUnicornOn').value = c.unicorn_enabled === false ? 'false' : 'true';
      document.getElementById('setAipayOn').value = c.aipay_enabled ? 'true' : 'false';
      document.getElementById('setAipayBase').value = c.aipay_base_url || 'https://dev.paylab.kz/api/v2';
      document.getElementById('setAipayCompany').value = c.aipay_company_id || '';
      document.getElementById('setAipayPos').value = c.aipay_pos_id || '';
      var pos = res.body.aipay_pos || [];
      document.getElementById('aipayPosHint').textContent = pos.length
        ? 'POS из API: ' +
          pos
            .map(function (p) {
              return (p.display_name || 'POS') + ' · ' + p.id + ' · ' + (p.status || '?');
            })
            .join(' | ')
        : 'POS список пуст или ключ не работает';
      try {
        document.getElementById('aipayWebhookUrl').textContent =
          window.location.origin + '/api/aipay-webhook';
        document.getElementById('prodamusWebhookUrl').textContent =
          window.location.origin + '/api/prodamus-webhook';
      } catch (e) {}
      var kaspiEl = document.getElementById('kaspiStatus');
      var prodamusEl = document.getElementById('prodamusStatus');
      if (kaspiEl)
        kaspiEl.textContent = c.kaspi_enabled
          ? '✅ Подключён (PAYPROVERKA_API_KEY задан)'
          : '⛔ Не подключён — добавь PAYPROVERKA_API_KEY в Vercel env';
      if (prodamusEl)
        prodamusEl.textContent = c.prodamus_enabled
          ? '✅ Подключён (PRODAMUS_SECRET_KEY задан)'
          : '⛔ Не подключён — добавь PRODAMUS_SECRET_KEY + PRODAMUS_FORM_URL в Vercel env';
    });
  }

  function loadFunnels() {
    var hours = (document.getElementById('funnelHours') || {}).value || '72';
    api('/api/admin/funnels?hours=' + encodeURIComponent(hours)).then(function (res) {
      if (!res.body.ok) {
        document.getElementById('funnelSessions').innerHTML =
          '<p class="msg is-error">' + esc(res.body.error || 'Ошибка') + '</p>';
        return;
      }
      var t = res.body.totals || {};
      var pixel = res.body.pixel || {};
      document.getElementById('funnelCards').innerHTML =
        '<div class="card"><b>События</b><strong>' +
        esc(t.events || 0) +
        '</strong></div>' +
        '<div class="card"><b>Посетители</b><strong>' +
        esc(t.visitors || 0) +
        '</strong></div>' +
        '<div class="card"><b>Оплаты</b><strong>' +
        esc(t.paid || 0) +
        '</strong></div>' +
        '<div class="card"><b>Ошибки оплаты</b><strong>' +
        esc(t.paymentErrors || 0) +
        '</strong></div>' +
        '<div class="card"><b>Ждут Kaspi</b><strong>' +
        esc(t.kaspiWaiting || 0) +
        '</strong></div>' +
        '<div class="card"><b>TG /start</b><strong>' +
        esc(t.tgStarts || 0) +
        '</strong></div>';

      document.getElementById('funnelPixel').innerHTML =
        '<p><b>Pixel ID:</b> <code class="mono">' +
        esc(pixel.id || '—') +
        '</code></p>' +
        '<p>PageView: ' +
        (pixel.pageView ? '✅' : '⛔') +
        ' · InitiateCheckout: ' +
        (pixel.initiateCheckout ? '✅' : '⛔') +
        ' · Purchase: ' +
        (pixel.purchase ? '✅' : '⛔') +
        ' · CAPI: ' +
        (pixel.capi ? '✅' : '⛔') +
        '</p>' +
        '<p>Success URL: <code class="mono">' +
        esc(pixel.successUrl || '') +
        '</code></p>' +
        '<p class="msg">' +
        esc(pixel.note || '') +
        '</p>';

      var steps = res.body.steps || [];
      var maxVis = Math.max.apply(
        null,
        steps.map(function (s) {
          return s.visitors || 0;
        }).concat([1])
      );
      document.getElementById('funnelSteps').innerHTML = steps.length
        ? '<table><thead><tr><th>Шаг</th><th>Люди</th><th>События</th><th></th></tr></thead><tbody>' +
          steps
            .map(function (s) {
              var w = Math.max(4, Math.round(((s.visitors || 0) / maxVis) * 100));
              return (
                '<tr><td>' +
                esc(s.label) +
                '<div class="msg mono">' +
                esc(s.key) +
                '</div></td><td><b>' +
                esc(s.visitors || 0) +
                '</b></td><td>' +
                esc(s.events || 0) +
                '</td><td><div style="height:8px;border-radius:99px;background:rgba(212,94,131,.18);overflow:hidden"><div style="height:100%;width:' +
                w +
                '%;background:#d45e83"></div></div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пока нет данных воронки</p>';

      var lands = res.body.landings || [];
      document.getElementById('funnelLandings').innerHTML = lands.length
        ? '<table><thead><tr><th>Лендинг</th><th>Views</th><th>Форма</th><th>Оплата</th><th>Счета</th><th>Paid</th></tr></thead><tbody>' +
          lands
            .map(function (l) {
              return (
                '<tr><td class="mono">' +
                esc(l.landing) +
                '</td><td>' +
                esc(l.views) +
                '</td><td>' +
                esc(l.opens) +
                '</td><td>' +
                esc(l.submits) +
                '</td><td>' +
                esc(l.created) +
                '</td><td>' +
                esc(l.paid) +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Лендинги появятся после первых визитов</p>';

      var sessions = res.body.sessions || [];
      document.getElementById('funnelSessions').innerHTML = sessions.length
        ? '<table><thead><tr><th>Когда</th><th>Где остановился</th><th>Контакт</th><th>Продукт / оплата</th><th>Флаги</th></tr></thead><tbody>' +
          sessions
            .map(function (s) {
              return (
                '<tr><td>' +
                esc(s.lastAt) +
                '<div class="msg">' +
                esc(s.seconds ? s.seconds + ' сек на сайте' : '') +
                '</div></td><td><b>' +
                esc(s.lastLabel || s.lastEvent) +
                '</b>' +
                (s.paid ? ' ' + badge('paid') : '') +
                '<div class="msg mono">' +
                esc(s.landing || '') +
                '</div></td><td class="mono">' +
                esc(s.phone || '') +
                '<div>' +
                esc(s.contact || '') +
                '</div><div class="msg">' +
                esc(s.telegram ? 'TG ' + s.telegram : '') +
                '</div></td><td>' +
                esc(s.product || '—') +
                '<div class="msg mono">' +
                esc([s.provider, s.orderId].filter(Boolean).join(' · ')) +
                '</div></td><td class="mono">' +
                esc((s.flags || []).slice(-8).join(' → ')) +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пока пусто — открой сайт / пройди оплату, флаги появятся здесь</p>';
    });
  }

  function loadActivity() {
    api('/api/admin/activity').then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.activity || [];
      document.getElementById('activityList').innerHTML = list.length
        ? '<table><thead><tr><th>Когда</th><th>Event</th><th>Телефон</th><th>Order</th><th>Meta</th></tr></thead><tbody>' +
          list
            .map(function (a) {
              return (
                '<tr><td>' +
                esc(a.created_at) +
                '</td><td>' +
                esc(a.level === 'error' ? '⚠ ' : '') +
                esc(a.event) +
                '</td><td class="mono">' +
                esc(a.phone || a.contact || '') +
                '</td><td class="mono">' +
                esc(a.order_id || '') +
                '</td><td class="mono">' +
                esc(JSON.stringify(a.meta || {}).slice(0, 120)) +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пока пусто</p>';
    });
  }

  function loadAudit() {
    api('/api/admin/audit').then(function (res) {
      if (!res.body.ok) return;
      var list = res.body.audit || [];
      document.getElementById('auditList').innerHTML = list.length
        ? '<table><thead><tr><th>Когда</th><th>Action</th><th>Target</th><th>IP</th></tr></thead><tbody>' +
          list
            .map(function (a) {
              return (
                '<tr><td>' +
                esc(a.created_at) +
                '</td><td>' +
                esc(a.action) +
                '</td><td class="mono">' +
                esc((a.target_type || '') + ' ' + (a.target_id || '')) +
                '</td><td class="mono">' +
                esc(a.ip || '') +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table>'
        : '<p class="msg">Пока пусто</p>';
    });
  }

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    showMsg(loginMsg, 'Входим…');
    api('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
    }).then(function (res) {
      if (res.body.ok) enterApp(res.body.user);
      else showMsg(loginMsg, res.body.error || 'Ошибка', true);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST' }).then(function () {
      appStage.classList.add('hidden');
      loginStage.classList.remove('hidden');
      showMsg(loginMsg, '');
    });
  });

  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-view'));
    });
  });

  document.getElementById('reloadOrders').onclick = loadOrders;
  document.getElementById('orderStatusFilter').onchange = loadOrders;
  document.getElementById('reloadFunnels').onclick = loadFunnels;
  document.getElementById('funnelHours').onchange = loadFunnels;
  document.getElementById('reloadPrices').onclick = loadPrices;
  document.getElementById('pricesTestBtn').onclick = function () {
    if (!window.confirm('Поставить всем услугам тестовую цену 30 ₸?')) return;
    applyPricePreset('preset_test', 'Тестовые цены: все по 30 ₸');
  };
  document.getElementById('pricesResetBtn').onclick = function () {
    if (!window.confirm('Вернуть продакшн-цены каталога?')) return;
    applyPricePreset('preset_production', 'Цены сброшены к продакшн');
  };
  document.getElementById('reloadUsers').onclick = loadUsers;
  document.getElementById('reloadReadings').onclick = loadReadings;
  document.getElementById('reloadActivity').onclick = loadActivity;
  document.getElementById('reloadAudit').onclick = loadAudit;
  document.getElementById('readingStatusFilter').onchange = loadReadings;

  document.getElementById('saveSettings').onclick = function () {
    var forceRaw = document.getElementById('setForceSum').value.trim();
    var payload = {
      test_mode: document.getElementById('setTestMode').value === 'true',
      force_test_sum: forceRaw === '' ? null : Math.round(Number(forceRaw)),
      payment_provider: document.getElementById('setPayProvider').value,
      unicorn_enabled: document.getElementById('setUnicornOn').value === 'true',
      aipay_enabled: document.getElementById('setAipayOn').value === 'true',
      aipay_base_url: document.getElementById('setAipayBase').value.trim(),
      aipay_company_id: document.getElementById('setAipayCompany').value.trim(),
      aipay_pos_id: document.getElementById('setAipayPos').value.trim()
    };
    api('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      showMsg(document.getElementById('settingsMsg'), res.body.ok ? 'Сохранено' : res.body.error || 'Ошибка', !res.body.ok);
      if (res.body.ok) loadSettings();
    });
  };

  document.addEventListener('click', function (e) {
    var orderBtn = e.target.closest('[data-order]');
    if (orderBtn) openOrder(orderBtn.getAttribute('data-order'));
    var userBtn = e.target.closest('[data-user]');
    if (userBtn) openUser(userBtn.getAttribute('data-user'));
    var savePrice = e.target.closest('[data-save-price]');
    if (savePrice) {
      var key = savePrice.getAttribute('data-save-price');
      var tr = savePrice.closest('tr');
      var usdRaw = tr.querySelector('[data-f="amount_usd"]').value.trim();
      api('/api/admin/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_key: key,
          name: tr.querySelector('[data-f="name"]').value,
          amount_tenge: +tr.querySelector('[data-f="amount"]').value,
          amount_usd: usdRaw === '' ? null : +usdRaw,
          active: tr.querySelector('[data-f="active"]').value === 'true'
        })
      }).then(function (res) {
        showMsg(appMsg, res.body.ok ? 'Цена сохранена' : res.body.error || 'Ошибка', !res.body.ok);
        if (res.body.ok) loadPrices();
      });
    }
    var rq = e.target.closest('[data-rq]');
    if (rq) {
      api('/api/admin/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rq.getAttribute('data-rq'), action: 'requeue' })
      }).then(function (res) {
        showMsg(appMsg, res.body.ok ? 'В очередь' : res.body.error || 'Ошибка', !res.body.ok);
        if (res.body.ok) loadReadings();
      });
    }
    var dl = e.target.closest('[data-dl]');
    if (dl) {
      api('/api/admin/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dl.getAttribute('data-dl'), action: 'deliver' })
      }).then(function (res) {
        showMsg(appMsg, res.body.ok ? 'Доставка в Telegram' : res.body.error || 'Ошибка', !res.body.ok);
      });
    }
  });

  loadMe();
})();
