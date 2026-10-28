'use strict';

var admin = require('../../../lib/admin');
var sec = require('../../../lib/security');

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
    sec.json(res, 200, { ok: true, user: admin.publicUser(user) });
  } catch (err) {
    console.error('[admin/me]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка' });
  }
}

module.exports = handler;
module.exports.default = handler;
