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
      var body = admin.patchPriceSchema.parse(await sec.readJson(req));
      var row = {
        product_key: body.product_key,
        updated_at: new Date().toISOString(),
        updated_by: actor2.id
      };
      if (body.name != null) row.name = body.name;
      if (body.amount_tenge != null) row.amount_tenge = body.amount_tenge;
      if (body.active != null) row.active = body.active;
      if (body.sort_order != null) row.sort_order = body.sort_order;

      var { data: existing } = await db
        .from('product_prices')
        .select('product_key')
        .eq('product_key', body.product_key)
        .maybeSingle();

      var result;
      if (existing) {
        var { data: upd, error: e1 } = await db
          .from('product_prices')
          .update(row)
          .eq('product_key', body.product_key)
          .select('*')
          .single();
        if (e1) throw new Error(e1.message);
        result = upd;
      } else {
        if (!body.name || body.amount_tenge == null) {
          sec.json(res, 400, { ok: false, error: 'Для нового продукта нужны name и amount_tenge' });
          return;
        }
        row.name = body.name;
        row.amount_tenge = body.amount_tenge;
        var { data: ins, error: e2 } = await db.from('product_prices').insert(row).select('*').single();
        if (e2) throw new Error(e2.message);
        result = ins;
      }

      await admin.audit(actor2.id, 'price.upsert', 'price', body.product_key, { amount: body.amount_tenge }, ip);
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
