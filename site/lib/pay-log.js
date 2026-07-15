'use strict';

/**
 * Единый лог платежей Unicorn.
 * Искать в Vercel Logs: [pay]
 */

function safe(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return { _unserializable: true };
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
  return row;
}

module.exports = {
  payLog: payLog,
  payError: payError
};
