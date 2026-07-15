'use strict';

var { z } = require('zod');
var { getDb } = require('./db');
var auth = require('./auth');
var sec = require('./security');

var NAME_TO_KEY = {
  'Ты — целиком': 'full',
  'Полный разбор': 'full',
  'Денежный код': 'money',
  'Сценарий любви': 'love',
  'Прогноз 2026': 'forecast',
  'Реализация': 'realization',
  'Скрытые блоки': 'blocks',
  'Совместимость пары': 'compatibility',
  'Число судьбы': 'destiny'
};

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
    .select('product_key, name, amount_tenge, active, sort_order, updated_at')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function getCheckoutSettings() {
  var db = getDb();
  var { data } = await db.from('app_settings').select('value').eq('key', 'checkout').maybeSingle();
  var value = (data && data.value) || {};
  return {
    force_test_sum:
      value.force_test_sum == null || value.force_test_sum === ''
        ? null
        : Math.round(Number(value.force_test_sum)),
    test_mode: !!value.test_mode
  };
}

async function resolveChargeAmount(productName, addons, clientSum) {
  var settings = await getCheckoutSettings();
  if (settings.force_test_sum != null && settings.force_test_sum >= 30) {
    return {
      amount: settings.force_test_sum,
      source: 'test_force',
      testMode: true
    };
  }

  var prices = await listPrices();
  var byKey = {};
  var byName = {};
  prices.forEach(function (p) {
    if (!p.active) return;
    byKey[p.product_key] = p.amount_tenge;
    byName[p.name] = p.amount_tenge;
  });

  var key = NAME_TO_KEY[productName] || null;
  var base = (key && byKey[key]) || byName[productName] || null;
  if (base == null) {
    base = Math.round(Number(clientSum) || 0);
  }

  var addonSum = 0;
  (addons || []).forEach(function (name) {
    var ak = NAME_TO_KEY[name];
    var a = (ak && byKey[ak]) || byName[name] || 0;
    addonSum += Number(a) || 0;
  });

  var amount = Math.max(30, Math.round(base + addonSum));
  return { amount: amount, source: 'catalog', testMode: false, base: base, addonSum: addonSum };
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
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional()
});

module.exports = {
  NAME_TO_KEY,
  publicUser,
  requireAdmin,
  audit,
  listPrices,
  getCheckoutSettings,
  resolveChargeAmount,
  patchUserSchema,
  patchOrderSchema,
  patchPriceSchema
};
