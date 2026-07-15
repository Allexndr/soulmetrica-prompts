/**
 * SoulMetrica currency + geo helpers (browser).
 * Base catalog prices are always in KZT; RUB is a display conversion.
 * Checkout / Unicorn always charge KZT.
 */
(function (global) {
  'use strict';

  var STORAGE_CUR = 'veluna-currency';
  var STORAGE_COUNTRY = 'veluna-country';
  /** Approx: 1 ₽ ≈ 5 ₸ — adjust via window.VELUNA_KZT_PER_RUB if needed */
  var KZT_PER_RUB = Number(global.VELUNA_KZT_PER_RUB) || 5;

  var state = {
    currency: 'KZT',
    country: null,
    source: 'default',
    ready: false
  };

  var listeners = [];

  function getCurrency() {
    return state.currency === 'RUB' ? 'RUB' : 'KZT';
  }

  function symbol(cur) {
    return (cur || getCurrency()) === 'RUB' ? '₽' : '₸';
  }

  function kztToRub(kzt) {
    var n = Math.round(Number(kzt) || 0);
    if (n <= 0) return 0;
    var rub = n / KZT_PER_RUB;
    if (n <= 100) return Math.max(1, Math.round(rub));
    return Math.max(1, Math.round(rub / 10) * 10);
  }

  function displayAmount(kzt) {
    var n = Math.round(Number(kzt) || 0);
    if (getCurrency() === 'RUB') return kztToRub(n);
    return n;
  }

  function formatMoney(kzt) {
    var amount = displayAmount(kzt);
    return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + symbol();
  }

  function setCurrency(cur, meta) {
    var next = cur === 'RUB' ? 'RUB' : 'KZT';
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
    return null;
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
    // Rough continental RU (excludes far precision); KZ box checked first
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
      // fallback reverse geocode
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

    if (saved === 'RUB' || saved === 'KZT') {
      setCurrency(saved, { source: 'saved', force: true });
    } else {
      setCurrency('KZT', { source: 'default', force: true });
    }

    var chain = fetch('/api/geo')
      .then(function (r) {
        return r.json();
      })
      .then(function (j) {
        if (!j || !j.ok) return;
        // Don't override explicit user choice unless first visit
        var userPicked = false;
        try {
          userPicked = localStorage.getItem('veluna-currency-manual') === '1';
        } catch (e) {}
        if (userPicked) return;
        if (j.country) applyFromCountry(j.country, 'ip');
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
          userPicked = localStorage.getItem('veluna-currency-manual') === '1';
        } catch (e) {}
        if (userPicked) {
          state.ready = true;
          return state;
        }
        // Browser geolocation can refine IP guess (permission prompt)
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
      localStorage.setItem('veluna-currency-manual', '1');
    } catch (e) {}
    setCurrency(cur, { source: 'manual', force: true });
  }

  function refreshMoneyNodes(root) {
    root = root || document;
    root.querySelectorAll('[data-kzt]').forEach(function (el) {
      var kzt = +el.getAttribute('data-kzt');
      if (!(kzt >= 0)) return;
      var old = el.getAttribute('data-kzt-old');
      var html = formatMoney(kzt);
      if (old != null && old !== '') {
        html += ' <s>' + formatMoney(+old) + '</s>';
      }
      el.innerHTML = html;
    });
    root.querySelectorAll('[data-kzt-text]').forEach(function (el) {
      var kzt = +el.getAttribute('data-kzt-text');
      if (!(kzt >= 0)) return;
      el.textContent = formatMoney(kzt);
    });
  }

  global.VelunaMoney = {
    init: init,
    format: formatMoney,
    displayAmount: displayAmount,
    kztToRub: kztToRub,
    getCurrency: getCurrency,
    symbol: symbol,
    setCurrency: setCurrency,
    setManual: setManual,
    onChange: onChange,
    refresh: refreshMoneyNodes,
    state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
