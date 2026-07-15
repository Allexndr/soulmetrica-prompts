'use strict';

var admin = require('../../lib/admin');
var sec = require('../../lib/security');
var { getDb } = require('../../lib/db');

module.exports = async function handler(req, res) {
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
    var db = getDb();
    var { data, error } = await db
      .from('admin_audit_log')
      .select('id, admin_id, action, target_type, target_id, meta, ip, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    sec.json(res, 200, { ok: true, audit: data || [] });
  } catch (err) {
    console.error('[admin/audit]', err.message);
    sec.json(res, 500, { ok: false, error: 'Ошибка audit' });
  }
};
