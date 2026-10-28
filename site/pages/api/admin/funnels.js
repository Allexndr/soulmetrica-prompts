'use strict';

var admin = require('../../../lib/admin');
var sec = require('../../../lib/security');
var funnel = require('../../../lib/funnel');
var metaPixel = require('../../../lib/meta-pixel');
var { getDb } = require('../../../lib/db');

function visitorOf(row) {
  return (
    (row && row.visitor_id) ||
    (row && row.meta && (row.meta.visitor_id || row.meta.visitorId)) ||
    (row && row.order_id) ||
    (row && row.phone) ||
    (row && row.contact) ||
    (row && row.telegram_chat_id && 'tg:' + row.telegram_chat_id) ||
    (row && row.ip && 'ip:' + row.ip) ||
    null
  );
}

function sinceIso(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function countByEvent(rows) {
  var map = {};
  rows.forEach(function (r) {
    map[r.event] = (map[r.event] || 0) + 1;
  });
  return map;
}

function uniqueVisitors(rows, eventFilter) {
  var set = {};
  rows.forEach(function (r) {
    if (eventFilter && r.event !== eventFilter) return;
    var id = visitorOf(r);
    if (id) set[id] = true;
  });
  return Object.keys(set).length;
}

function buildSessions(rows) {
  var by = {};
  rows.forEach(function (r) {
    var id = visitorOf(r);
    if (!id) return;
    if (!by[id]) {
      by[id] = {
        visitorId: id,
        phone: null,
        contact: null,
        telegram: null,
        orderId: null,
        product: null,
        provider: null,
        landing: 'soulmetrica',
        firstAt: r.created_at,
        lastAt: r.created_at,
        lastEvent: r.event,
        lastLabel: funnel.stepLabel(r.event),
        seconds: 0,
        paid: false,
        flags: [],
        events: []
      };
    }
    var s = by[id];
    s.events.push(r);
    s.lastAt = r.created_at;
    s.lastEvent = r.event;
    s.lastLabel = funnel.stepLabel(r.event);
    if (r.phone) s.phone = r.phone;
    if (r.contact) s.contact = r.contact;
    if (r.telegram_chat_id) s.telegram = String(r.telegram_chat_id);
    if (r.order_id) s.orderId = r.order_id;
    var meta = r.meta || {};
    if (meta.product) s.product = meta.product;
    if (meta.provider) s.provider = meta.provider;
    if (meta.landing) s.landing = meta.landing;
    if (meta.seconds != null) s.seconds = Math.max(s.seconds, Number(meta.seconds) || 0);
    if (r.event === 'order.paid' || r.event === 'funnel.success_open' || r.event === 'tg.paid_open') {
      s.paid = true;
    }
    if (s.flags.indexOf(r.event) < 0) s.flags.push(r.event);
  });

  return Object.keys(by)
    .map(function (k) {
      return by[k];
    })
    .sort(function (a, b) {
      return String(b.lastAt).localeCompare(String(a.lastAt));
    })
    .slice(0, 150)
    .map(function (s) {
      return {
        visitorId: s.visitorId,
        phone: s.phone,
        contact: s.contact,
        telegram: s.telegram,
        orderId: s.orderId,
        product: s.product,
        provider: s.provider,
        landing: s.landing,
        firstAt: s.firstAt,
        lastAt: s.lastAt,
        lastEvent: s.lastEvent,
        lastLabel: s.lastLabel,
        seconds: s.seconds,
        paid: s.paid,
        flags: s.flags,
        eventCount: s.events.length
      };
    });
}

function buildLandings(rows) {
  var map = {};
  rows.forEach(function (r) {
    var landing = (r.meta && r.meta.landing) || 'soulmetrica';
    if (!map[landing]) {
      map[landing] = { landing: landing, views: 0, opens: 0, submits: 0, created: 0, paid: 0 };
    }
    var m = map[landing];
    if (r.event === 'funnel.page_view') m.views += 1;
    if (r.event === 'funnel.order_open') m.opens += 1;
    if (r.event === 'funnel.pay_submit') m.submits += 1;
    if (r.event === 'funnel.payment_created' || r.event === 'order.created') m.created += 1;
    if (r.event === 'order.paid') m.paid += 1;
  });
  return Object.keys(map).map(function (k) {
    return map[k];
  });
}

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

    var url = new URL(req.url, sec.siteOrigin());
    var hours = Math.min(168, Math.max(1, parseInt(url.searchParams.get('hours') || '72', 10) || 72));
    var db = getDb();

    var { data, error } = await db
      .from('activity_log')
      .select(
        'id, created_at, event, level, order_id, phone, contact, telegram_chat_id, ip, visitor_id, source, meta'
      )
      .gte('created_at', sinceIso(hours))
      .or(
        'event.like.funnel.%,event.like.tg.%,event.eq.order.created,event.eq.order.paid,event.like.pay.create_payment%,event.like.pay.kaspi%,event.like.pay.success_redirect%'
      )
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      // visitor_id/source columns may be missing before migration 007
      var fallback = await db
        .from('activity_log')
        .select('id, created_at, event, level, order_id, phone, contact, telegram_chat_id, ip, meta')
        .gte('created_at', sinceIso(hours))
        .order('created_at', { ascending: false })
        .limit(2000);
      if (fallback.error) throw new Error(fallback.error.message);
      data = (fallback.data || []).filter(function (r) {
        return /^(funnel\.|tg\.|order\.(created|paid)|pay\.)/.test(r.event || '');
      });
    }

    var rows = data || [];
    var byEvent = countByEvent(rows);
    var steps = funnel.FUNNEL_STEPS.map(function (step) {
      return {
        key: step.key,
        label: step.label,
        events: byEvent[step.key] || 0,
        visitors: uniqueVisitors(rows, step.key)
      };
    });

    sec.json(res, 200, {
      ok: true,
      hours: hours,
      pixel: {
        id: metaPixel.PIXEL_ID,
        pageView: true,
        purchase: true,
        initiateCheckout: true,
        successUrl: process.env.PAYMENT_SUCCESS_URL || 'https://neuro-kids.kz/velunasps',
        capi: !!process.env.META_CAPI_TOKEN,
        note: process.env.META_CAPI_TOKEN
          ? 'Pixel + CAPI: Purchase уходит только после подтверждения банка (Kaspi/Prodamus/Unicorn), event_id = order id'
          : 'Browser Pixel активен. Для CAPI добавь META_CAPI_TOKEN в Vercel env'
      },
      totals: {
        events: rows.length,
        visitors: uniqueVisitors(rows),
        paid: byEvent['order.paid'] || 0,
        paymentErrors: byEvent['funnel.payment_error'] || 0,
        kaspiWaiting: byEvent['funnel.invoice_waiting'] || 0,
        tgStarts: byEvent['tg.start'] || 0
      },
      steps: steps,
      landings: buildLandings(rows),
      sessions: buildSessions(rows)
    });
  } catch (err) {
    console.error('[admin/funnels]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка воронок' });
  }
}

module.exports = handler;
module.exports.default = handler;
