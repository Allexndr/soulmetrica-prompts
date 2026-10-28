'use strict';

var { z } = require('zod');
var { getDb } = require('./db');
var auth = require('./auth');
var sec = require('./security');
var kaspi = require('./kaspi');
var prodamus = require('./prodamus');

var NAME_TO_KEY = {
  'Ты — целиком': 'full',
  'Полный разбор': 'full',
  'Денежный код': 'money',
  'Сценарий любви': 'love',
  'Прогноз 2026': 'forecast',
  'Реализация': 'realization',
  'Скрытые блоки': 'blocks',
  'Детский разбор': 'child',
  'Совместимость пары': 'compatibility',
  'Число судьбы': 'destiny'
};

/** Production catalog amounts (₸). Used by admin «Сброс». */
var PRODUCTION_PRICES = {
  full: 9900,
  money: 3990,
  love: 4990,
  forecast: 3990,
  realization: 3990,
  blocks: 3990,
  compatibility: 6990,
  child: 3990,
  destiny: 1990
};

/** Production EN amounts (whole USD). Used by admin «Сброс». */
var PRODUCTION_PRICES_USD = {
  full: 29,
  money: 12,
  love: 15,
  forecast: 12,
  realization: 12,
  blocks: 12,
  compatibility: 19,
  child: 12,
  destiny: 7
};

var TEST_PRICE_AMOUNT = 30;

/** KZT charged per $1 when EN catalog is used. Override via USD_TO_KZT. */
function usdToKztRate() {
  var n = Math.round(Number(process.env.USD_TO_KZT) || 500);
  return n >= 100 && n <= 2000 ? n : 500;
}

function usdToChargeKzt(usd) {
  var dollars = Math.round(Number(usd) || 0);
  if (dollars < 1) return null;
  return Math.max(30, dollars * usdToKztRate());
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email || null,
    display_name: u.display_name || null,
    telegram_id: u.telegram_id || null,
    telegram_username: u.telegram_username || null,
    phone: u.phone || null,
    role: u.role || 'user',
    is_blocked: !!u.is_blocked,
    notes: u.notes || null,
    created_at: u.created_at || null
  };
}

async function requireAdmin(req, res) {
  var user = await auth.getSessionUser(req);
  if (!user) {
    sec.json(res, 401, { ok: false, error: 'Требуется вход' });
    return null;
  }
  if (user.role !== 'admin' || user.is_blocked) {
    sec.json(res, 403, { ok: false, error: 'Недостаточно прав' });
    return null;
  }
  return user;
}

async function audit(adminId, action, targetType, targetId, meta, ip) {
  var db = getDb();
  var safeMeta = meta && typeof meta === 'object' ? Object.assign({}, meta) : {};
  // never store secrets
  delete safeMeta.password;
  delete safeMeta.password_hash;
  delete safeMeta.token;
  await db.from('admin_audit_log').insert({
    admin_id: adminId || null,
    action: String(action || 'unknown').slice(0, 80),
    target_type: targetType ? String(targetType).slice(0, 40) : null,
    target_id: targetId ? String(targetId).slice(0, 120) : null,
    meta: safeMeta,
    ip: ip ? String(ip).slice(0, 64) : null
  });
}

async function listPrices() {
  var db = getDb();
  var { data, error } = await db
    .from('product_prices')
    .select('product_key, name, amount_tenge, amount_usd, active, sort_order, updated_at')
    .order('sort_order', { ascending: true });
  if (error) {
    // amount_usd may be missing before migration — fall back
    if (/amount_usd/i.test(error.message || '')) {
      var fallback = await db
        .from('product_prices')
        .select('product_key, name, amount_tenge, active, sort_order, updated_at')
        .order('sort_order', { ascending: true });
      if (fallback.error) throw new Error(fallback.error.message);
      return (fallback.data || []).map(function (p) {
        return Object.assign({}, p, { amount_usd: null });
      });
    }
    throw new Error(error.message);
  }
  return data || [];
}

async function patchCheckoutSettings(actorId, patch) {
  var db = getDb();
  var current = await getCheckoutSettings();
  var next = Object.assign({}, current, patch || {});
  var { error } = await db.from('app_settings').upsert(
    {
      key: 'checkout',
      value: {
        force_test_sum: next.force_test_sum,
        test_mode: next.test_mode,
        payment_provider: next.payment_provider,
        unicorn_enabled: next.unicorn_enabled,
        aipay_enabled: next.aipay_enabled,
        aipay_base_url: next.aipay_base_url || '',
        aipay_company_id: next.aipay_company_id || '',
        aipay_pos_id: next.aipay_pos_id || ''
      },
      updated_at: new Date().toISOString(),
      updated_by: actorId || null
    },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
  return getCheckoutSettings();
}

/**
 * preset: 'test' | 'production'
 * Clears force_test_sum so checkout uses catalog amounts.
 */
async function applyPricePreset(preset, actorId) {
  var db = getDb();
  var prices = await listPrices();
  if (!prices.length) throw new Error('Каталог цен пуст');

  var updated = [];
  for (var i = 0; i < prices.length; i++) {
    var p = prices[i];
    var amount =
      preset === 'test'
        ? TEST_PRICE_AMOUNT
        : PRODUCTION_PRICES[p.product_key] != null
          ? PRODUCTION_PRICES[p.product_key]
          : p.amount_tenge;
    var amountUsd =
      preset === 'test'
        ? 1
        : PRODUCTION_PRICES_USD[p.product_key] != null
          ? PRODUCTION_PRICES_USD[p.product_key]
          : p.amount_usd;
    var patch = {
      amount_tenge: amount,
      updated_at: new Date().toISOString(),
      updated_by: actorId || null
    };
    if (amountUsd != null) patch.amount_usd = amountUsd;
    var { data, error } = await db
      .from('product_prices')
      .update(patch)
      .eq('product_key', p.product_key)
      .select('product_key, name, amount_tenge, amount_usd, active, sort_order, updated_at')
      .single();
    if (error && /amount_usd/i.test(error.message || '')) {
      var again = await db
        .from('product_prices')
        .update({
          amount_tenge: amount,
          updated_at: new Date().toISOString(),
          updated_by: actorId || null
        })
        .eq('product_key', p.product_key)
        .select('product_key, name, amount_tenge, active, sort_order, updated_at')
        .single();
      if (again.error) throw new Error(again.error.message);
      data = Object.assign({}, again.data, { amount_usd: null });
      error = null;
    }
    if (error) throw new Error(error.message);
    updated.push(data);
  }

  var checkout = await patchCheckoutSettings(actorId, {
    force_test_sum: null,
    test_mode: preset === 'test'
  });

  return { prices: updated, checkout: checkout, preset: preset };
}

function normalizeProvider(raw) {
  var p = String(raw || '').toLowerCase().trim();
  if (p === 'kaspi' || p === 'payproverka') return 'kaspi';
  if (p === 'prodamus' || p === 'proeducation') return 'prodamus';
  if (p === 'aipay' || p === 'paylab') return 'aipay';
  if (p === 'unicorn') return 'unicorn';
  if (p === 'both') return 'both';
  return 'unicorn';
}

async function getCheckoutSettings() {
  var db = getDb();
  var { data } = await db.from('app_settings').select('value').eq('key', 'checkout').maybeSingle();
  var value = (data && data.value) || {};
  var provider = normalizeProvider(value.payment_provider || value.provider || 'unicorn');
  return {
    force_test_sum:
      value.force_test_sum == null || value.force_test_sum === ''
        ? null
        : Math.round(Number(value.force_test_sum)),
    test_mode: !!value.test_mode,
    payment_provider: provider,
    unicorn_enabled: value.unicorn_enabled == null ? true : !!value.unicorn_enabled,
    aipay_enabled: !!value.aipay_enabled,
    aipay_base_url: value.aipay_base_url ? String(value.aipay_base_url).trim() : '',
    aipay_company_id: value.aipay_company_id ? String(value.aipay_company_id).trim() : '',
    aipay_pos_id: value.aipay_pos_id ? String(value.aipay_pos_id).trim() : ''
  };
}

function publicCheckoutSettings(settings) {
  var s = settings || {};
  var unicornOn = s.unicorn_enabled !== false;
  var aipayOn = !!s.aipay_enabled;
  var kaspiOn = kaspi.isConfigured();
  var prodamusOn = prodamus.isConfigured();
  var provider = normalizeProvider(s.payment_provider || 'unicorn');
  if (provider === 'aipay' && !aipayOn) provider = unicornOn ? 'unicorn' : 'aipay';
  if (provider === 'kaspi' && !kaspiOn) provider = unicornOn ? 'unicorn' : 'kaspi';
  if (provider === 'prodamus' && !prodamusOn) provider = unicornOn ? 'unicorn' : 'prodamus';
  if (provider === 'unicorn' && !unicornOn) {
    provider = prodamusOn ? 'prodamus' : kaspiOn ? 'kaspi' : aipayOn ? 'aipay' : 'unicorn';
  }
  if (provider === 'both' && !(unicornOn && (prodamusOn || kaspiOn || aipayOn))) {
    provider = unicornOn
      ? 'unicorn'
      : prodamusOn
        ? 'prodamus'
        : kaspiOn
          ? 'kaspi'
          : aipayOn
            ? 'aipay'
            : 'unicorn';
  }
  return {
    test_mode: !!s.test_mode,
    force_test_sum: s.force_test_sum == null ? null : s.force_test_sum,
    payment_provider: provider,
    unicorn_enabled: unicornOn,
    aipay_enabled: aipayOn,
    kaspi_enabled: kaspiOn,
    prodamus_enabled: prodamusOn
  };
}

async function resolveChargeAmount(productName, addons, language, priceCurrency) {
  var settings = await getCheckoutSettings();
  if (settings.force_test_sum != null && settings.force_test_sum >= 30) {
    return {
      amount: settings.force_test_sum,
      source: 'test_force',
      testMode: true,
      currency: 'KZT'
    };
  }

  var prices = await listPrices();
  var byKey = {};
  var byName = {};
  var usdByKey = {};
  var usdByName = {};
  prices.forEach(function (p) {
    if (!p.active) return;
    byKey[p.product_key] = p.amount_tenge;
    byName[p.name] = p.amount_tenge;
    if (p.amount_usd != null && p.amount_usd >= 1) {
      usdByKey[p.product_key] = p.amount_usd;
      usdByName[p.name] = p.amount_usd;
    }
  });

  var useUsd = language === 'en' || String(priceCurrency || '').toUpperCase() === 'USD';
  var key = NAME_TO_KEY[productName] || null;
  if (!key || (!byKey[key] && !byName[productName])) {
    throw new Error('Продукт недоступен в каталоге');
  }
  var baseUsd = useUsd ? (key && usdByKey[key]) || usdByName[productName] || null : null;
  var base =
    baseUsd != null
      ? usdToChargeKzt(baseUsd)
      : (key && byKey[key]) || byName[productName] || null;
  if (base == null) {
    throw new Error('Не удалось определить цену продукта');
  }

  var addonSum = 0;
  (addons || []).forEach(function (name) {
    var addonName = String(name || '').trim();
    if (!addonName) return;
    var ak = NAME_TO_KEY[addonName];
    if (!ak || (!byKey[ak] && !byName[addonName])) {
      throw new Error('Неизвестный доп: ' + addonName);
    }
    if (useUsd) {
      var usd = (ak && usdByKey[ak]) || usdByName[addonName] || null;
      if (usd != null) {
        addonSum += usdToChargeKzt(usd) || 0;
        return;
      }
    }
    var a = (ak && byKey[ak]) || byName[addonName];
    addonSum += Number(a) || 0;
  });

  var amount = Math.max(30, Math.round(base + addonSum));
  return {
    amount: amount,
    source: baseUsd != null ? 'catalog_usd' : 'catalog',
    testMode: false,
    base: base,
    addonSum: addonSum,
    currency: 'KZT',
    displayUsd: baseUsd,
    priceCurrency: useUsd ? 'USD' : 'KZT'
  };
}

var patchUserSchema = z.object({
  display_name: z.string().max(120).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  telegram_username: z.string().max(64).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  is_blocked: z.boolean().optional(),
  role: z.enum(['user', 'admin']).optional()
});

var patchOrderSchema = z.object({
  status: z.enum(['pending', 'paid', 'cancelled', 'failed']).optional(),
  amount: z.number().int().min(30).max(5000000).optional(),
  product: z.string().max(120).optional(),
  phone: z.string().max(32).optional().nullable(),
  contact: z.string().max(120).optional().nullable(),
  customer_name: z.string().max(120).optional().nullable(),
  user_id: z.string().uuid().optional().nullable()
});

var patchPriceSchema = z.object({
  product_key: z.string().min(2).max(40),
  name: z.string().min(2).max(80).optional(),
  amount_tenge: z.number().int().min(30).max(5000000).optional(),
  amount_usd: z.number().int().min(1).max(100000).optional().nullable(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional()
});

module.exports = {
  NAME_TO_KEY,
  PRODUCTION_PRICES,
  PRODUCTION_PRICES_USD,
  TEST_PRICE_AMOUNT,
  usdToKztRate,
  usdToChargeKzt,
  publicUser,
  requireAdmin,
  audit,
  listPrices,
  applyPricePreset,
  getCheckoutSettings,
  publicCheckoutSettings,
  normalizeProvider,
  resolveChargeAmount,
  patchUserSchema,
  patchOrderSchema,
  patchPriceSchema
};
