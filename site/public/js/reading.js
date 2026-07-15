(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var readingId = params.get('id') || '';
  var shareToken = params.get('t') || '';
  var viewer = document.getElementById('viewer');
  var loading = document.getElementById('loading');
  var errorEl = document.getElementById('error');
  var chrome = document.getElementById('chrome');
  var fadeTimer = null;

  function docUrl() {
    var q = '/api/readings/doc?id=' + encodeURIComponent(readingId);
    if (shareToken) q += '&t=' + encodeURIComponent(shareToken);
    return q;
  }

  function downloadUrl(fmt) {
    return (
      '/api/readings/download?id=' +
      encodeURIComponent(readingId) +
      '&fmt=' +
      encodeURIComponent(fmt) +
      (shareToken ? '&t=' + encodeURIComponent(shareToken) : '')
    );
  }

  function showError(msg) {
    loading.hidden = true;
    viewer.hidden = true;
    errorEl.hidden = false;
    errorEl.innerHTML =
      msg +
      ' <a href="//profile">Войти в профиль</a> или открой ссылку из Telegram.';
  }

  function bumpChrome() {
    if (!chrome) return;
    chrome.classList.remove('is-faded');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      chrome.classList.add('is-faded');
    }, 2800);
  }

  function loadReading() {
    if (!readingId) {
      showError('Не указан разбор.');
      return;
    }

    fetch('/api/readings/get?id=' + encodeURIComponent(readingId) + (shareToken ? '&t=' + encodeURIComponent(shareToken) : ''), {
      credentials: 'include'
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (j && j.ok && j.reading) {
          document.getElementById('readingTitle').textContent = j.reading.title || 'Разбор';
          document.title = (j.reading.title || 'Разбор') + ' · SoulMetrica';
        }
      })
      .catch(function () {});

    // iframe.src — без srcdoc, чтобы HTML не «утекал» в интерфейс
    viewer.onload = function () {
      loading.hidden = true;
      viewer.hidden = false;
      bumpChrome();
    };
    viewer.onerror = function () {
      showError('Не удалось открыть разбор.');
    };
    viewer.src = docUrl();

    // если iframe молчит (auth fail) — проверим отдельно
    setTimeout(function () {
      if (!loading.hidden) {
        fetch(docUrl(), { credentials: 'include' }).then(function (r) {
          if (!r.ok) showError('Не удалось открыть разбор.');
        });
      }
    }, 6000);
  }

  document.getElementById('btnHtml').addEventListener('click', function () {
    window.location.href = downloadUrl('html');
  });

  document.getElementById('btnPdf').addEventListener('click', function () {
    var btn = document.getElementById('btnPdf');
    btn.disabled = true;
    btn.textContent = '…';
    window.location.href = downloadUrl('pdf');
    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = 'PDF';
    }, 8000);
  });

  ['mousemove', 'touchstart', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, bumpChrome, { passive: true });
  });

  loadReading();
  bumpChrome();
})();
