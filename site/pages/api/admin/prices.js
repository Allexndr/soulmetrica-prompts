'use strict';

var admin = require('../../../lib/admin');
var sec = require('../../../lib/security');
var { getDb } = require('../../../lib/db');

async function handler(req, res) {
  sec.setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // public catalog for checkout UI
      var publicMode = String(new URL(req.url, sec.siteOrigin()).searchParams.get('public') || '') === '1';
      if (!publicMode) {
        var actor = await admin.requireAdmin(req, res);
        if (!actor) return;
      }
      var prices = await admin.listPrices();
      var settings = await admin.getCheckoutSettings();
      if (publicMode) {
        prices = prices.filter(function (p) {
          return p.active;
        });
      }
      sec.json(res, 200, {
        ok: true,
        prices: prices,
        checkout: publicMode ? admin.publicCheckoutSettings(settings) : settings
      });
      return;
    }

    var actor2 = await admin.requireAdmin(req, res);
    if (!actor2) return;
    var db = getDb();
    var ip = sec.clientIp(req);

    if (req.method === 'PUT' || req.method === 'PATCH') {
      var body = await sec.readJson(req);
      if (body && (body.action === 'preset_test' || body.action === 'preset_production')) {
        var preset = body.action === 'preset_test' ? 'test' : 'production';
        var applied = await admin.applyPricePreset(preset, actor2.id);
        await admin.audit(
          actor2.id,
          'price.preset.' + preset,
          'price',
          'catalog',
          { count: applied.prices.length },
          ip
        );
        sec.json(res, 200, {
          ok: true,
          preset: preset,
          prices: applied.prices,
          checkout: admin.publicCheckoutSettings(applied.checkout)
        });
        return;
      }

      var parsed = admin.patchPriceSchema.parse(body);
      var row = {
        product_key: parsed.product_key,
        updated_at: new Date().toISOString(),
        updated_by: actor2.id
      };
      if (parsed.name != null) row.name = parsed.name;
      if (parsed.amount_tenge != null) row.amount_tenge = parsed.amount_tenge;
      if (parsed.amount_usd !== undefined) row.amount_usd = parsed.amount_usd;
      if (parsed.active != null) row.active = parsed.active;
      if (parsed.sort_order != null) row.sort_order = parsed.sort_order;

      var { data: existing } = await db
        .from('product_prices')
        .select('product_key')
        .eq('product_key', parsed.product_key)
        .maybeSingle();

      var result;
      if (existing) {
        var { data: upd, error: e1 } = await db
          .from('product_prices')
          .update(row)
          .eq('product_key', parsed.product_key)
          .select('*')
          .single();
        if (e1) throw new Error(e1.message);
        result = upd;
      } else {
        if (!parsed.name || parsed.amount_tenge == null) {
          sec.json(res, 400, { ok: false, error: 'Для нового продукта нужны name и amount_tenge' });
          return;
        }
        row.name = parsed.name;
        row.amount_tenge = parsed.amount_tenge;
        var { data: ins, error: e2 } = await db.from('product_prices').insert(row).select('*').single();
        if (e2) throw new Error(e2.message);
        result = ins;
      }

      await admin.audit(
        actor2.id,
        'price.upsert',
        'price',
        parsed.product_key,
        { amount: parsed.amount_tenge, amount_usd: parsed.amount_usd },
        ip
      );
      sec.json(res, 200, { ok: true, price: result });
      return;
    }

    sec.json(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err && err.name === 'ZodError') {
      sec.json(res, 400, { ok: false, error: 'Некорректные данные (мин. 30 ₸)' });
      return;
    }
    console.error('[admin/prices]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка prices' });
  }
}

module.exports = handler;
module.exports.default = handler;
