/**
 * SoulMetrica currency + geo helpers (browser).
 *
 * ₸ KZT — base catalog (amount_tenge)
 * ₽ RUB — display conversion from KZT
 * $ USD — separate catalog (amount_usd / data-usd); Unicorn still charges KZT
 */
(function (global) {
  'use strict';

  var STORAGE_CUR = 'veluna-currency';
  var STORAGE_COUNTRY = 'veluna-country';
  var STORAGE_MANUAL = 'veluna-currency-manual';
  /** Approx: 1 ₽ ≈ 5 ₸ — adjust via window.VELUNA_KZT_PER_RUB if needed */
  var KZT_PER_RUB = Number(global.VELUNA_KZT_PER_RUB) || 5;
  /** Approx KZT per $1 — adjust via window.VELUNA_USD_TO_KZT */
  var USD_TO_KZT = Number(global.VELUNA_USD_TO_KZT) || 500;

  var state = {
    currency: 'KZT',
    country: null,
    source: 'default',
    ready: false
  };

  var listeners = [];

  function normalizeCurrency(cur) {
    cur = String(cur || '').toUpperCase();
    if (cur === 'RUB' || cur === 'USD' || cur === 'KZT') return cur;
    return 'KZT';
  }

  function getCurrency() {
    return normalizeCurrency(state.currency);
  }

  function symbol(cur) {
    cur = normalizeCurrency(cur || getCurrency());
    if (cur === 'RUB') return '₽';
    if (cur === 'USD') return '$';
    return '₸';
  }

  function kztToRub(kzt) {
    var n = Math.round(Number(kzt) || 0);
    if (n <= 0) return 0;
    var rub = n / KZT_PER_RUB;
    if (n <= 100) return Math.max(1, Math.round(rub));
    return Math.max(1, Math.round(rub / 10) * 10);
  }

  function kztToUsdFallback(kzt) {
    var n = Math.round(Number(kzt) || 0);
    if (n <= 0) return 0;
    return Math.max(1, Math.round(n / USD_TO_KZT));
  }

  function formatUsd(n) {
    return '$' + String(Math.round(Number(n) || 0));
  }

  function displayAmount(kzt, usdHint) {
    var cur = getCurrency();
    var n = Math.round(Number(kzt) || 0);
    if (cur === 'RUB') return kztToRub(n);
    if (cur === 'USD') {
      if (usdHint != null && usdHint !== '' && !isNaN(+usdHint)) return Math.round(+usdHint);
      return kztToUsdFallback(n);
    }
    return n;
  }

  function formatMoney(kzt, usdHint) {
    var cur = getCurrency();
    if (cur === 'USD') {
      return formatUsd(displayAmount(kzt, usdHint));
    }
    var amount = displayAmount(kzt, usdHint);
    return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + symbol();
  }

  function setCurrency(cur, meta) {
    var next = normalizeCurrency(cur);
    var changed = next !== state.currency;
    state.currency = next;
    if (meta && meta.country) state.country = meta.country;
    if (meta && meta.source) state.source = meta.source;
    try {
      localStorage.setItem(STORAGE_CUR, next);
      if (state.country) localStorage.setItem(STORAGE_COUNTRY, state.country);
    } catch (e) {}
    document.documentElement.setAttribute('data-currency', next);
    if (changed || (meta && meta.force)) {
      listeners.forEach(function (fn) {
        try {
          fn(state);
        } catch (err) {}
      });
      try {
        document.dispatchEvent(new CustomEvent('veluna:currency', { detail: Object.assign({}, state) }));
      } catch (e2) {}
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (x) {
        return x !== fn;
      });
    };
  }

  function countryToCurrency(cc) {
    if (!cc) return null;
    cc = String(cc).toUpperCase();
    if (cc === 'RU') return 'RUB';
    if (cc === 'KZ') return 'KZT';
    // CIS neighbours keep KZT display by default; rest → USD
    if (
      cc === 'UZ' ||
      cc === 'KG' ||
      cc === 'TJ' ||
      cc === 'TM' ||
      cc === 'AZ' ||
      cc === 'AM' ||
      cc === 'BY'
    ) {
      return 'KZT';
    }
    return 'USD';
  }

  function applyFromCountry(cc, source) {
    var cur = countryToCurrency(cc);
    if (!cur) return false;
    setCurrency(cur, { country: cc, source: source || 'geo', force: true });
    return true;
  }

  function detectByTimezone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/Almaty|Aqtobe|Atyrau|Oral|Qostanay|Qyzylorda|Aqtau|Astana/i.test(tz)) {
        return applyFromCountry('KZ', 'timezone');
      }
      if (/Moscow|Kaliningrad|Samara|Yekaterinburg|Novosibirsk|Krasnoyarsk|Irkutsk|Yakutsk|Vladivostok|Magadan|Kamchatka|Europe\/Moscow|Asia\/Yekaterinburg/i.test(tz)) {
        return applyFromCountry('RU', 'timezone');
      }
    } catch (e) {}
    return false;
  }

  function pointInKazakhstan(lat, lng) {
    return lat >= 40.5 && lat <= 55.5 && lng >= 46.0 && lng <= 87.5;
  }

  function pointInRussiaRough(lat, lng) {
    return lat >= 41 && lat <= 82 && lng >= 19 && lng <= 190;
  }

  function requestBrowserGeo() {
    if (!navigator.geolocation) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) {
          done = true;
          resolve(null);
        }
      }, 8000);
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        function () {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 600000 }
      );
    }).then(function (coords) {
      if (!coords) return null;
      if (pointInKazakhstan(coords.lat, coords.lng)) {
        applyFromCountry('KZ', 'geolocation');
        return 'KZ';
      }
      if (pointInRussiaRough(coords.lat, coords.lng)) {
        applyFromCountry('RU', 'geolocation');
        return 'RU';
      }
      var url =
        'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
        encodeURIComponent(coords.lat) +
        '&longitude=' +
        encodeURIComponent(coords.lng) +
        '&localityLanguage=en';
      return fetch(url)
        .then(function (r) {
          return r.json();
        })
        .then(function (j) {
          var cc = (j && (j.countryCode || j.country_code)) || '';
          if (applyFromCountry(cc, 'geolocation')) return cc;
          return null;
        })
        .catch(function () {
          return null;
        });
    });
  }

  function init(opts) {
    opts = opts || {};
    var saved = null;
    try {
      saved = localStorage.getItem(STORAGE_CUR);
    } catch (e) {}

    if (saved === 'RUB' || saved === 'KZT' || saved === 'USD') {
      setCurrency(saved, { source: 'saved', force: true });
    } else {
      // EN UI → default USD before geo
      var en =
        (global.VelunaI18n && global.VelunaI18n.getLang && global.VelunaI18n.getLang() === 'en') ||
        document.documentElement.getAttribute('lang') === 'en';
      setCurrency(en ? 'USD' : 'KZT', { source: 'default', force: true });
    }

    var chain = fetch('/api/geo')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) return;
        var userPicked = false;
        try {
          userPicked = localStorage.getItem(STORAGE_MANUAL) === '1';
        } catch (e) {}
        if (userPicked) return;
        if (j.currency === 'USD' || j.currency === 'RUB' || j.currency === 'KZT') {
          setCurrency(j.currency, { country: j.country || null, source: 'ip', force: true });
        } else if (j.country) applyFromCountry(j.country, 'ip');
        else if (!saved) detectByTimezone();
      })
      .catch(function () {
        if (!saved) detectByTimezone();
      });

    return chain
      .then(function () {
        if (opts.askGeo === false) {
          state.ready = true;
          return state;
        }
        var userPicked = false;
        try {
          userPicked = localStorage.getItem(STORAGE_MANUAL) === '1';
        } catch (e) {}
        if (userPicked) {
          state.ready = true;
          return state;
        }
        return requestBrowserGeo().finally(function () {
          state.ready = true;
        });
      })
      .then(function () {
        return state;
      });
  }

  function setManual(cur) {
    try {
      localStorage.setItem(STORAGE_MANUAL, '1');
    } catch (e) {}
    setCurrency(cur, { source: 'manual', force: true });
  }

  /** Soft switch from language toggle: does not mark as manual. */
  function setFromLanguage(lang) {
    var userPicked = false;
    try {
      userPicked = localStorage.getItem(STORAGE_MANUAL) === '1';
    } catch (e) {}
    if (userPicked) return;
    if (lang === 'en') setCurrency('USD', { source: 'language', force: true });
    else if (getCurrency() === 'USD') setCurrency('KZT', { source: 'language', force: true });
  }

  function refreshMoneyNodes(root) {
    root = root || document;
    root.querySelectorAll('[data-kzt]').forEach(function (el) {
      var kzt = +el.getAttribute('data-kzt');
      if (!(kzt >= 0)) return;
      var usd = el.getAttribute('data-usd');
      var old = el.getAttribute('data-kzt-old');
      var oldUsd = el.getAttribute('data-usd-old');
      var html = formatMoney(kzt, usd);
      if (getCurrency() === 'USD' && oldUsd != null && oldUsd !== '') {
        html += ' <s>' + formatUsd(+oldUsd) + '</s>';
      } else if (old != null && old !== '') {
        html += ' <s>' + formatMoney(+old, oldUsd) + '</s>';
      }
      el.innerHTML = html;
    });
    root.querySelectorAll('[data-kzt-text]').forEach(function (el) {
      var kzt = +el.getAttribute('data-kzt-text');
      if (!(kzt >= 0)) return;
      el.textContent = formatMoney(kzt, el.getAttribute('data-usd'));
    });
  }

  global.VelunaMoney = {
    init: init,
    format: formatMoney,
    formatUsd: formatUsd,
    displayAmount: displayAmount,
    kztToRub: kztToRub,
    kztToUsdFallback: kztToUsdFallback,
    getCurrency: getCurrency,
    symbol: symbol,
    setCurrency: setCurrency,
    setManual: setManual,
    setFromLanguage: setFromLanguage,
    onChange: onChange,
    refresh: refreshMoneyNodes,
    usdToKztRate: function () {
      return USD_TO_KZT;
    },
    state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
