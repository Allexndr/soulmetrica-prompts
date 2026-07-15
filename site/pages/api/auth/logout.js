'use strict';

var auth = require('../../../lib/auth');
var sec = require('../../../lib/security');

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
  await auth.destroySession(req);
  auth.clearSessionCookie(res);
  sec.json(res, 200, { ok: true });
}

module.exports = handler;
module.exports.default = handler;
