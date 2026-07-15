'use strict';

var https = require('https');
var { URL } = require('url');
var { payLog, payError } = require('./pay-log');

function env(name, fallback) {
  var v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

function toAccount(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.charAt(0) === '8' && digits.length === 11) digits = '7' + digits.slice(1);
  if (digits.length === 10) digits = '7' + digits;
  if (digits.charAt(0) !== '7') digits = '7' + digits;
  return '+' + digits.slice(0, 11);
}

function resolveConfig(settings) {
  var s = settings || {};
  // API key: Vercel env only — never from admin/DB
  var apiKey = String(env('AIPAY_API_KEY', '') || '').trim();
  var baseUrl = String(
    s.aipay_base_url || env('AIPAY_BASE_URL', 'https://dev.paylab.kz/api/v2') || ''
  )
    .trim()
    .replace(/\/$/, '');
  var companyId = String(s.aipay_company_id || env('AIPAY_COMPANY_ID', '') || '').trim();
  var posId = String(s.aipay_pos_id || env('AIPAY_POS_ID', '') || '').trim();
  return {
    apiKey: apiKey,
    baseUrl: baseUrl,
    companyId: companyId,
    posId: posId,
    enabled: !!s.aipay_enabled && !!apiKey && !!posId
  };
}

function publicConfig(settings) {
  var cfg = resolveConfig(settings);
  return {
    enabled: cfg.enabled,
    configured: !!(cfg.apiKey && cfg.posId),
    base_url: cfg.baseUrl,
    company_id: cfg.companyId,
    pos_id: cfg.posId
  };
}

function request(cfg, method, path, body) {
  return new Promise(function (resolve, reject) {
    var started = Date.now();
    var url = new URL(cfg.baseUrl + path);
    var payload = body == null ? null : JSON.stringify(body);
    var headers = {
      'x-api-key': cfg.apiKey,
      Accept: 'application/json'
    };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (cfg.companyId) headers['x-company-id'] = cfg.companyId;

    var req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: headers,
        timeout: 25000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          var raw = Buffer.concat(chunks).toString('utf8');
          var json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch (e) {
            json = null;
          }
          payLog('aipay.response', {
            method: method,
            path: path,
            httpStatus: res.statusCode || 0,
            ms: Date.now() - started,
            bodyPreview: raw.slice(0, 800)
          });
          resolve({
            status: res.statusCode || 0,
            raw: raw,
            json: json,
            data: json && json.data != null ? json.data : json,
            error: json && json.error ? json.error : null
          });
        });
      }
    );
    req.on('error', function (err) {
      payError('aipay.request_error', err, { method: method, path: path });
      reject(err);
    });
    req.on('timeout', function () {
      var err = new Error('AIPay timeout');
      payError('aipay.timeout', err, { method: method, path: path, ms: Date.now() - started });
      req.destroy(err);
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function listPos(settings) {
  var cfg = resolveConfig(settings);
  if (!cfg.apiKey) throw new Error('AIPay API key не задан');
  var res = await request(cfg, 'GET', '/pos');
  if (res.status >= 400) {
    throw new Error(
      (res.error && res.error.message) || 'AIPay POS list HTTP ' + res.status
    );
  }
  return Array.isArray(res.data) ? res.data : [];
}

async function createInvoice(order, settings) {
  var cfg = resolveConfig(settings);
  if (!cfg.apiKey) throw new Error('AIPay API key не задан');
  if (!cfg.posId) throw new Error('AIPay POS ID не задан — укажи в админке или AIPAY_POS_ID');

  var account = toAccount(order.phone);
  if (!account) throw new Error('Некорректный телефон для AIPay');

  var amount = Math.max(30, Math.round(Number(order.sum) || 0));
  var message = String(order.message || ('SoulMetrica · ' + (order.id || ''))).slice(0, 200);

  payLog('aipay.create_invoice.start', {
    orderId: order && order.id,
    amount: amount,
    posId: cfg.posId,
    account: account.slice(0, 4) + '***'
  });

  var body = {
    amount: amount,
    account: account,
    pos_id: cfg.posId,
    message: message
  };

  var res = await request(cfg, 'POST', '/invoices', body);
  if (res.status >= 400 || !res.data || !res.data.id) {
    var code = res.error && res.error.code;
    var msg = (res.error && res.error.message) || res.raw.slice(0, 240);
    if (code === 'NO_POS_AVAILABLE') {
      throw new Error(
        'AIPay: нет активного POS. В кабинете Paylab открой «POS Терминалы» и авторизуй Kaspi (сейчас logout/inactive).'
      );
    }
    payError('aipay.create_invoice.fail', new Error(msg), {
      orderId: order && order.id,
      status: res.status,
      code: code
    });
    throw new Error('AIPay отказал: ' + msg);
  }

  payLog('aipay.create_invoice.ok', {
    orderId: order && order.id,
    invoiceId: res.data.id,
    status: res.data.status,
    amount: res.data.amount
  });

  return {
    invoiceId: res.data.id,
    status: res.data.status || 'created',
    statusCode: res.data.status_code,
    amount: res.data.amount,
    account: res.data.account || account,
    ref: res.data.ref || res.data.internal_id || null,
    raw: res.data
  };
}

async function getInvoice(invoiceId, settings) {
  var cfg = resolveConfig(settings);
  if (!cfg.apiKey) throw new Error('AIPay API key не задан');
  var id = String(invoiceId || '').trim();
  if (!id) throw new Error('invoiceId обязателен');
  var res = await request(cfg, 'GET', '/invoices/' + encodeURIComponent(id));
  if (res.status >= 400 || !res.data) {
    throw new Error((res.error && res.error.message) || 'AIPay invoice HTTP ' + res.status);
  }
  return res.data;
}

function isPaidStatus(invoice) {
  if (!invoice) return false;
  var status = String(invoice.status || '').toLowerCase();
  if (status === 'paid' || status === 'success' || status === 'completed') return true;
  if (invoice.paid_at) return true;
  var code = Number(invoice.status_code);
  // Paylab: observed created=1; treat higher paid-like codes cautiously via paid_at/status text
  if (code === 80 || code === 2 || code === 3) {
    if (status.indexOf('pay') >= 0 || status === 'done' || status === 'ok') return true;
  }
  return false;
}

function extractOrderIdFromMessage(message) {
  var m = String(message || '').match(/\b(veluna-[a-zA-Z0-9-]+)\b/);
  return m ? m[1] : null;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

module.exports = {
  env: env,
  toAccount: toAccount,
  resolveConfig: resolveConfig,
  publicConfig: publicConfig,
  listPos: listPos,
  createInvoice: createInvoice,
  getInvoice: getInvoice,
  isPaidStatus: isPaidStatus,
  extractOrderIdFromMessage: extractOrderIdFromMessage,
  setCors: setCors
};
