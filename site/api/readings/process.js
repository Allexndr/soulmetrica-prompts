'use strict';

var { waitUntil } = require('@vercel/functions');
var sec = require('../../lib/security');
var readings = require('../../lib/readings');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }
  // cron (GET) или внутренний вызов (Bearer)
  var fromCron = req.method === 'GET';
  if (!fromCron && !sec.verifyInternalSecret(req)) {
    sec.json(res, 401, { ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    // 1–2 блока: Together 70B ~15–25с/блок, лимит функции 60с
    var result = await readings.processQueueBudget(32000, 2);
    if (result.more) {
      waitUntil(readings.triggerProcess());
    }
    sec.json(res, 200, { ok: true, result: result });
  } catch (err) {
    console.error('[readings/process]', err.message);
    waitUntil(readings.triggerProcess());
    sec.json(res, 500, { ok: false, error: 'Process error' });
  }
};
