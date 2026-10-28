'use strict';

/**
 * Persist + console log of user/payment/reading actions.
 * Vercel: filter [activity]
 * Admin: /api/admin/activity · /api/admin/funnels
 */

var { getDb } = require('./db');

function safe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj == null ? {} : obj));
  } catch (e) {
    return { _unserializable: true };
  }
}

function maskPhone(phone) {
  var p = String(phone || '').replace(/\D/g, '');
  if (p.length < 6) return phone || null;
  return '+' + p.slice(0, 4) + '***' + p.slice(-2);
}

function normalizeRow(event, payload, level) {
  var p = payload && typeof payload === 'object' ? safe(payload) : { detail: String(payload) };
  var meta = Object.assign({}, p);
  delete meta.orderId;
  delete meta.order_id;
  delete meta.readingId;
  delete meta.reading_id;
  delete meta.userId;
  delete meta.user_id;
  delete meta.phone;
  delete meta.contact;
  delete meta.telegramChatId;
  delete meta.telegram_chat_id;
  delete meta.ip;
  delete meta.level;
  delete meta.password;
  delete meta.password_hash;
  delete meta.token;
  delete meta.share_token;
  delete meta.visitorId;
  delete meta.visitor_id;
  delete meta.source;

  var visitorId = p.visitorId || p.visitor_id || null;
  if (visitorId) meta.visitor_id = String(visitorId).slice(0, 64);
  var source = p.source ? String(p.source).slice(0, 32) : null;
  if (source) meta.source = source;

  return {
    event: String(event || 'unknown').slice(0, 120),
    level: level === 'error' || level === 'warn' ? level : 'info',
    order_id: p.orderId || p.order_id || null,
    reading_id: p.readingId || p.reading_id || null,
    user_id: p.userId || p.user_id || null,
    phone: p.phone ? String(p.phone).slice(0, 32) : null,
    contact: p.contact ? String(p.contact).slice(0, 80) : null,
    telegram_chat_id: p.telegramChatId || p.telegram_chat_id || null,
    ip: p.ip ? String(p.ip).slice(0, 64) : null,
    visitor_id: visitorId ? String(visitorId).slice(0, 64) : null,
    source: source,
    meta: meta
  };
}

function consoleLine(row) {
  var out = {
    ts: new Date().toISOString(),
    event: row.event,
    level: row.level,
    orderId: row.order_id,
    readingId: row.reading_id,
    visitorId: row.visitor_id || (row.meta && row.meta.visitor_id) || null,
    phone: row.phone ? maskPhone(row.phone) : null,
    contact: row.contact,
    telegramChatId: row.telegram_chat_id ? true : false,
    ip: row.ip,
    meta: row.meta
  };
  var line = '[activity] ' + JSON.stringify(out);
  if (row.level === 'error') console.error(line);
  else console.log(line);
}

async function persist(row) {
  try {
    var db = getDb();
    var { error } = await db.from('activity_log').insert(row);
    if (error) {
      // Migration 007 may not be applied yet — retry without new columns.
      if (/visitor_id|source/i.test(error.message || '')) {
        var legacy = Object.assign({}, row);
        delete legacy.visitor_id;
        delete legacy.source;
        var retry = await db.from('activity_log').insert(legacy);
        if (retry.error) console.error('[activity] persist_fail ' + retry.error.message);
        return;
      }
      console.error('[activity] persist_fail ' + error.message);
    }
  } catch (err) {
    console.error('[activity] persist_fail ' + (err && err.message ? err.message : err));
  }
}

function logActivity(event, payload, level) {
  var row = normalizeRow(event, payload, level);
  consoleLine(row);
  // fire-and-forget — never block checkout / webhooks
  persist(row);
  return row;
}

function logActivityError(event, err, payload) {
  var base = payload && typeof payload === 'object' ? Object.assign({}, payload) : {};
  base.error = err && err.message ? err.message : String(err);
  if (err && err.stack) base.stack = String(err.stack).slice(0, 800);
  return logActivity(event, base, 'error');
}

module.exports = {
  logActivity: logActivity,
  logActivityError: logActivityError,
  maskPhone: maskPhone
};
