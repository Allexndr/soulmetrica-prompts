'use strict';

/**
 * Meta Conversions API (server-side).
 * Purchase is sent only after a payment provider confirms the order.
 * Browser Pixel uses the same event_id (order id) for deduplication.
 */

var https = require('https');
var crypto = require('crypto');
var { URL } = require('url');
var { payLog, payError } = require('./pay-log');

var PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || '916898804754747';
var GRAPH_VERSION = 'v21.0';

function accessToken() {
  return String(process.env.META_CAPI_TOKEN || '').trim();
}

function isConfigured() {
  return !!accessToken() && !!PIXEL_ID;
}

function sha256(value) {
  var s = String(value || '').trim().toLowerCase();
  if (!s) return null;
  return crypto.createHash('sha256').update(s).digest('hex');
}

function hashPhone(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = '7' + digits;
  if (digits.length === 11 && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
  return sha256(digits);
}

function hashEmail(raw) {
  var email = String(raw || '').trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) return null;
  return sha256(email);
}

function parseCookie(header, name) {
  var raw = String(header || '');
  var parts = raw.split(';');
  for (var i = 0; i < parts.length; i++) {
    var item = parts[i].trim();
    if (item.indexOf(name + '=') === 0) {
      return decodeURIComponent(item.slice(name.length + 1)).slice(0, 200);
    }
  }
  return '';
}

function buildFbc(fbc, fbclid) {
  if (fbc) return String(fbc).slice(0, 200);
  var click = String(fbclid || '').trim();
  if (!click) return '';
  return 'fb.1.' + Date.now() + '.' + click.slice(0, 160);
}

function clickIdsFromRequest(req, bodyMeta) {
  var cookieHeader = (req && req.headers && req.headers.cookie) || '';
  var meta = bodyMeta && typeof bodyMeta === 'object' ? bodyMeta : {};
  var utm = meta.utm && typeof meta.utm === 'object' ? meta.utm : {};
  var fbp = String(meta.fbp || parseCookie(cookieHeader, '_fbp') || '').slice(0, 200);
  var fbclid = String(meta.fbclid || utm.fbclid || '').slice(0, 200);
  var fbc = buildFbc(meta.fbc || parseCookie(cookieHeader, '_fbc'), fbclid);
  var ua = String((req && req.headers && req.headers['user-agent']) || meta.user_agent || '').slice(0, 512);
  return {
    fbp: fbp || null,
    fbc: fbc || null,
    fbclid: fbclid || null,
    client_user_agent: ua || null
  };
}

function userDataFromOrder(order, extra) {
  extra = extra || {};
  var meta = (order && order.payment_meta) || {};
  var user = {
    ph: hashPhone(order && order.phone),
    em: hashEmail(extra.email || meta.email || (order && order.email)),
    fbp: extra.fbp || meta.fbp || null,
    fbc: extra.fbc || meta.fbc || null,
    client_ip_address: extra.client_ip || meta.client_ip || null,
    client_user_agent: extra.client_user_agent || meta.client_user_agent || null,
    external_id: extra.visitorId || meta.visitorId || (order && order.id) || null
  };
  Object.keys(user).forEach(function (key) {
    if (!user[key]) delete user[key];
  });
  return user;
}

function postEvents(events, testEventCode) {
  return new Promise(function (resolve, reject) {
    if (!isConfigured()) {
      resolve({ skipped: true, reason: 'not_configured' });
      return;
    }
    var payload = { data: events };
    var testCode = String(testEventCode || process.env.META_CAPI_TEST_CODE || '').trim();
    if (testCode) payload.test_event_code = testCode;

    var body = JSON.stringify(payload);
    var url = new URL(
      'https://graph.facebook.com/' + GRAPH_VERSION + '/' + encodeURIComponent(PIXEL_ID) + '/events'
    );
    url.searchParams.set('access_token', accessToken());

    var req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 12000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (chunk) {
          chunks.push(chunk);
        });
        res.on('end', function () {
          var raw = Buffer.concat(chunks).toString('utf8');
          var json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (e) {
            json = null;
          }
          resolve({
            status: res.statusCode || 0,
            json: json,
            raw: raw.slice(0, 800)
          });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error('Meta CAPI timeout'));
    });
    req.write(body);
    req.end();
  });
}

function eventPayload(eventName, order, extra) {
  extra = extra || {};
  var amount = Math.round(Number((order && order.amount) || extra.value || 0));
  var currency = String(extra.currency || 'KZT').toUpperCase();
  var eventId = String(extra.eventId || (order && order.id) || '').slice(0, 120);
  var sourceUrl =
    extra.eventSourceUrl ||
    (process.env.SITE_URL || 'https://soulmetrica.com').replace(/\/$/, '') +
      '/api/pay-success' +
      (order && order.id ? '?order=' + encodeURIComponent(order.id) : '');

  var custom = {
    currency: currency,
    value: amount,
    content_type: 'product',
    order_id: order && order.id ? String(order.id) : undefined,
    content_name: extra.contentName || (order && order.product) || 'SoulMetrica',
    content_ids: order && order.id ? [String(order.id)] : undefined
  };
  Object.keys(custom).forEach(function (key) {
    if (custom[key] == null) delete custom[key];
  });

  return {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || undefined,
    action_source: 'website',
    event_source_url: sourceUrl,
    user_data: userDataFromOrder(order, extra),
    custom_data: custom
  };
}

async function sendEvent(eventName, order, extra) {
  if (!isConfigured()) {
    payLog('meta_capi.skip', { event: eventName, reason: 'not_configured', orderId: order && order.id });
    return { skipped: true };
  }
  var evt = eventPayload(eventName, order, extra);
  try {
    var res = await postEvents([evt], extra && extra.testEventCode);
    var ok = res && res.status >= 200 && res.status < 300 && res.json && res.json.events_received;
    payLog(ok ? 'meta_capi.ok' : 'meta_capi.response', {
      event: eventName,
      orderId: order && order.id,
      eventId: evt.event_id,
      httpStatus: res && res.status,
      eventsReceived: res && res.json && res.json.events_received,
      messages: res && res.json && res.json.messages,
      fbtrace: res && res.json && res.json.fbtrace_id
    });
    if (!ok) {
      payError('meta_capi.fail', new Error((res && res.raw) || 'CAPI rejected'), {
        event: eventName,
        orderId: order && order.id
      });
    }
    return res;
  } catch (err) {
    payError('meta_capi.error', err, { event: eventName, orderId: order && order.id });
    return { error: err && err.message };
  }
}

async function sendPurchase(order, extra) {
  return sendEvent('Purchase', order, extra);
}

async function sendInitiateCheckout(order, extra) {
  return sendEvent('InitiateCheckout', order, extra);
}

module.exports = {
  PIXEL_ID: PIXEL_ID,
  isConfigured: isConfigured,
  sha256: sha256,
  hashPhone: hashPhone,
  hashEmail: hashEmail,
  buildFbc: buildFbc,
  parseCookie: parseCookie,
  clickIdsFromRequest: clickIdsFromRequest,
  eventPayload: eventPayload,
  sendEvent: sendEvent,
  sendPurchase: sendPurchase,
  sendInitiateCheckout: sendInitiateCheckout
};
