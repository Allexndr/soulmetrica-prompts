'use strict';

var { z } = require('zod');
var admin = require('../../lib/admin');
var sec = require('../../lib/security');
var { getDb } = require('../../lib/db');

var schema = z.object({
  force_test_sum: z.number().int().min(30).max(500000).nullable().optional(),
  test_mode: z.boolean().optional()
});

module.exports = async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    var actor = await admin.requireAdmin(req, res);
    if (!actor) return;
    var db = getDb();
    var ip = sec.clientIp(req);

    if (req.method === 'GET') {
      var settings = await admin.getCheckoutSettings();
      sec.json(res, 200, { ok: true, checkout: settings });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      var body = schema.parse(await sec.readJson(req));
      var current = await admin.getCheckoutSettings();
      var next = {
        force_test_sum:
          body.force_test_sum === undefined ? current.force_test_sum : body.force_test_sum,
        test_mode: body.test_mode === undefined ? current.test_mode : body.test_mode
      };
      var { error } = await db.from('app_settings').upsert(
        {
          key: 'checkout',
          value: next,
          updated_at: new Date().toISOString(),
          updated_by: actor.id
        },
        { onConflict: 'key' }
      );
      if (error) throw new Error(error.message);
      await admin.audit(actor.id, 'settings.checkout', 'settings', 'checkout', next, ip);
      sec.json(res, 200, { ok: true, checkout: next });
      return;
    }

    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные настройки' });
      return;
    }
    console.error('[admin/settings]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка settings' });
  }
};
