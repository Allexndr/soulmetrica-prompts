'use strict';

/**
 * Единый лог платежей Unicorn.
 * Искать в Vercel Logs: [pay]
 * Дублируется в activity_log (admin → Логи).
 */

function safe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return { _unserializable: true };
  }
}

function toActivity(event, payload, level) {
  try {
    var activity = require('./activity-log');
    if (level === 'error') {
      var err = payload && payload.error ? new Error(payload.error) : new Error(String(event));
      var rest = payload && typeof payload === 'object' ? Object.assign({}, payload) : {};
      delete rest.error;
      delete rest.stack;
      activity.logActivityError('pay.' + event, err, rest);
      return;
    }
    activity.logActivity('pay.' + event, payload);
  } catch (e) {
    /* ignore mirror failures */
  }
}

function payLog(event, payload) {
  var row = {
    ts: new Date().toISOString(),
    event: String(event || 'unknown'),
    ...(payload && typeof payload === 'object' ? safe(payload) : { detail: String(payload) })
  };
  // Одна строка — удобно фильтровать в Vercel
  console.log('[pay] ' + JSON.stringify(row));
  toActivity(event, payload, 'info');
  return row;
}

function payError(event, err, payload) {
  var row = {
    ts: new Date().toISOString(),
    event: String(event || 'error'),
    error: err && err.message ? err.message : String(err),
    stack: err && err.stack ? String(err.stack).slice(0, 800) : undefined,
    ...(payload && typeof payload === 'object' ? safe(payload) : {})
  };
  console.error('[pay] ' + JSON.stringify(row));
  toActivity(event, Object.assign({}, payload || {}, { error: row.error, stack: row.stack }), 'error');
  return row;
}

module.exports = {
  payLog: payLog,
  payError: payError
};
