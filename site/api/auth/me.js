'use strict';

var auth = require('../../lib/auth');
var sec = require('../../lib/security');
var orders = require('../../lib/orders');
var identity = require('../../lib/identity');
var htmlReading = require('../../lib/html-reading');

module.exports = async function handler(req, res) {
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
    var user = await auth.requireUser(req, res);
    if (!user) return;

    if (user.telegram_id) {
      await identity.claimTelegramOrders(user.id, user.telegram_id, user.telegram_id);
    }

    var userOrders = await orders.listOrdersForUser(user.id);
    var readings = await orders.listReadingsForUser(user.id);

    sec.json(res, 200, {
      ok: true,
      user: user,
      orders: userOrders,
      readings: readings.map(function (r) {
        return {
          id: r.id,
          orderId: r.order_id,
          title: r.title,
          status: r.status,
          fileUrl: r.file_url,
          createdAt: r.created_at,
          deliveredAt: r.telegram_delivered_at,
          shareToken: htmlReading.shareToken(r.id)
        };
      })
    });
  } catch (err) {
    console.error('[auth/me]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка профиля' });
  }
};
