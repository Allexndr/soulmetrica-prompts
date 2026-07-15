'use strict';

var { z } = require('zod');
var admin = require('../../../lib/admin');
var aipay = require('../../../lib/aipay');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

var schema = z.object({
  force_test_sum: z.number().int().min(30).max(500000).nullable().optional(),
  test_mode: z.boolean().optional(),
  payment_provider: z.enum(['unicorn', 'aipay', 'both']).optional(),
  unicorn_enabled: z.boolean().optional(),
  aipay_enabled: z.boolean().optional(),
  aipay_base_url: z.string().max(300).nullable().optional(),
  aipay_company_id: z.string().max(80).nullable().optional(),
  aipay_pos_id: z.string().max(80).nullable().optional()
});

function sanitizeForAdmin(settings) {
  var pub = aipay.publicConfig(settings);
  return {
    force_test_sum: settings.force_test_sum,
    test_mode: settings.test_mode,
    payment_provider: settings.payment_provider,
    unicorn_enabled: settings.unicorn_enabled,
    aipay_enabled: settings.aipay_enabled,
    aipay_base_url: settings.aipay_base_url || pub.base_url,
    aipay_company_id: settings.aipay_company_id || pub.company_id,
    aipay_pos_id: settings.aipay_pos_id || pub.pos_id,
    aipay_ready: pub.enabled || pub.configured
  };
}

async function handler(req, res) {
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
      var posList = [];
      try {
        if (aipay.resolveConfig(settings).apiKey) {
          posList = await aipay.listPos(settings);
        }
      } catch (e) {
        posList = [];
      }
      sec.json(res, 200, {
        ok: true,
        checkout: sanitizeForAdmin(settings),
        aipay_pos: posList
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      var body = schema.parse(await sec.readJson(req));
      var current = await admin.getCheckoutSettings();
      // API key only from Vercel env — never persist/accept via admin
      var next = {
        force_test_sum:
          body.force_test_sum === undefined ? current.force_test_sum : body.force_test_sum,
        test_mode: body.test_mode === undefined ? current.test_mode : body.test_mode,
        payment_provider:
          body.payment_provider === undefined
            ? current.payment_provider
            : body.payment_provider,
        unicorn_enabled:
          body.unicorn_enabled === undefined ? current.unicorn_enabled : body.unicorn_enabled,
        aipay_enabled:
          body.aipay_enabled === undefined ? current.aipay_enabled : body.aipay_enabled,
        aipay_base_url:
          body.aipay_base_url === undefined
            ? current.aipay_base_url
            : body.aipay_base_url == null
              ? ''
              : String(body.aipay_base_url).trim(),
        aipay_company_id:
          body.aipay_company_id === undefined
            ? current.aipay_company_id
            : body.aipay_company_id == null
              ? ''
              : String(body.aipay_company_id).trim(),
        aipay_pos_id:
          body.aipay_pos_id === undefined
            ? current.aipay_pos_id
            : body.aipay_pos_id == null
              ? ''
              : String(body.aipay_pos_id).trim()
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
      sec.json(res, 200, { ok: true, checkout: sanitizeForAdmin(next) });
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
}

module.exports = handler;
module.exports.default = handler;
