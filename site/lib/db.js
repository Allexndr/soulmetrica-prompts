'use strict';

var { createClient } = require('@supabase/supabase-js');

var client;

function env(name) {
  var v = process.env[name];
  if (!v) throw new Error('Missing env: ' + name);
  return v;
}

function getDb() {
  if (client) return client;
  var url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing SUPABASE_URL');
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}

module.exports = { getDb, env };
