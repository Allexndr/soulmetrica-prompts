'use strict';

var admin = require('../../../lib/admin');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var user = await admin.requireAdmin(req, res);
    if (!user) return;
    var db = getDb();

    var [{ count: usersCount }, { count: ordersCount }, { count: paidCount }, { data: recentOrders }, { data: readingsAgg }] =
      await Promise.all([
        db.from('users').select('*', { count: 'exact', head: true }),
        db.from('orders').select('*', { count: 'exact', head: true }),
        db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        db
          .from('orders')
          .select('id, product, amount, status, customer_name, phone, contact, created_at, paid_at')
          .order('created_at', { ascending: false })
          .limit(8),
        db.from('readings').select('status')
      ]);

    var readingStats = { ready: 0, generating: 0, queued: 0, failed: 0 };
    (readingsAgg || []).forEach(function (r) {
      if (readingStats[r.status] != null) readingStats[r.status] += 1;
    });

    var { data: paidRows } = await db
      .from('orders')
      .select('amount')
      .eq('status', 'paid')
      .limit(5000);
    var revenue = (paidRows || []).reduce(function (s, o) {
      return s + (Number(o.amount) || 0);
    }, 0);

    var settings = await admin.getCheckoutSettings();
    var aipay = require('../../../lib/aipay');

    sec.json(res, 200, {
      ok: true,
      stats: {
        users: usersCount || 0,
        orders: ordersCount || 0,
        paidOrders: paidCount || 0,
        revenue: revenue,
        readings: readingStats,
        checkout: {
          test_mode: settings.test_mode,
          force_test_sum: settings.force_test_sum,
          payment_provider: settings.payment_provider,
          unicorn_enabled: settings.unicorn_enabled,
          aipay_enabled: settings.aipay_enabled,
          aipay: aipay.publicConfig(settings)
        }
      },
      recentOrders: recentOrders || []
    });
  } catch (err) {
    console.error('[admin/dashboard]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка дашборда' });
  }
}

module.exports = handler;
module.exports.default = handler;
