'use strict';

var sec = require('../../lib/security');
var activity = require('../../lib/activity-log');
var funnel = require('../../lib/funnel');

var ALLOWED_EVENTS = funnel.ALLOWED;

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    var ip = sec.clientIp(req);
    var rl = await sec.rateLimit('funnel:' + ip, 120, 60);
    if (!rl.ok) {
      sec.json(res, 429, { ok: false, error: 'Too many events' });
      return;
    }

    var body = await sec.readJson(req);
    var event = String((body && body.event) || '').trim();
    if (!ALLOWED_EVENTS[event]) {
      sec.json(res, 400, { ok: false, error: 'Unknown funnel event' });
      return;
    }

    var visitorId = funnel.normalizeVisitorId(body.visitorId || body.visitor_id);
    var meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
    var landing = String(body.landing || meta.landing || '').slice(0, 120);
    var path = String(body.path || meta.path || '').slice(0, 200);
    var seconds = Number(body.seconds || meta.seconds);
    if (!Number.isFinite(seconds) || seconds < 0) seconds = null;
    if (seconds != null) seconds = Math.min(Math.round(seconds), 86400);

    activity.logActivity(event, {
      visitorId: visitorId,
      source: 'web',
      ip: ip,
      phone: body.phone || null,
      contact: body.contact || null,
      orderId: body.orderId || body.order_id || null,
      landing: landing || 'soulmetrica',
      path: path || null,
      product: body.product || meta.product || null,
      provider: body.provider || meta.provider || null,
      step: body.step || meta.step || null,
      seconds: seconds,
      utm: body.utm || meta.utm || null,
      language: body.language || meta.language || null,
      currency: body.currency || meta.currency || null,
      error: body.error || meta.error || null
    });

    sec.json(res, 200, { ok: true });
  } catch (err) {
    sec.json(res, 500, { ok: false, error: 'Funnel log failed' });
  }
}

module.exports = handler;
module.exports.default = handler;
