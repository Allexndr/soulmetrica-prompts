'use strict';

var crypto = require('crypto');

function shareSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    'veluna'
  );
}

function normalizePhone(raw) {
  var digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.charAt(0) === '8' && digits.length === 11) digits = '7' + digits.slice(1);
  if (digits.length === 10) digits = '7' + digits;
  if (digits.charAt(0) !== '7' || digits.length !== 11) {
    // keep as-is if international-looking but still usable
    if (digits.length < 10) return '';
  }
  return '+' + digits;
}

function phonesMatch(a, b) {
  var x = normalizePhone(a).replace(/\D/g, '');
  var y = normalizePhone(b).replace(/\D/g, '');
  if (!x || !y) return false;
  return x === y || x.slice(-10) === y.slice(-10);
}

function parseTelegramUsername(raw) {
  var s = String(raw || '').trim();
  if (!s) return null;
  if (/whatsapp|вотсап|вацап|wa\.me|viber|телефон/i.test(s) && !/@/.test(s)) {
    return null;
  }
  var m = s.match(/@([A-Za-z0-9_]{5,32})/);
  if (m) return m[1].toLowerCase();
  if (/^[A-Za-z0-9_]{5,32}$/.test(s)) return s.toLowerCase();
  return null;
}

function formatTelegramContact(username) {
  var u = parseTelegramUsername(username);
  return u ? '@' + u : '';
}

function makePhoneVerifyToken(phone) {
  var norm = normalizePhone(phone);
  if (!norm) return null;
  var digits = norm.replace(/\D/g, '');
  var exp = Date.now() + 30 * 60 * 1000;
  var body = digits + '.' + exp;
  var sig = crypto.createHmac('sha256', shareSecret()).update('phone:' + body).digest('base64url').slice(0, 10);
  return 'p' + body + '.' + sig;
}

function verifyPhoneVerifyToken(token) {
  var raw = String(token || '');
  var m = raw.match(/^p(\d+)\.(\d+)\.([A-Za-z0-9_-]{8,16})$/);
  if (!m) return null;
  var digits = m[1];
  var exp = +m[2];
  var sig = m[3];
  if (!exp || Date.now() > exp) return null;
  var body = digits + '.' + exp;
  var expected = crypto
    .createHmac('sha256', shareSecret())
    .update('phone:' + body)
    .digest('base64url')
    .slice(0, 10);
  try {
    var a = Buffer.from(sig);
    var b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch (e) {
    return null;
  }
  return normalizePhone(digits);
}

module.exports = {
  normalizePhone: normalizePhone,
  phonesMatch: phonesMatch,
  parseTelegramUsername: parseTelegramUsername,
  formatTelegramContact: formatTelegramContact,
  makePhoneVerifyToken: makePhoneVerifyToken,
  verifyPhoneVerifyToken: verifyPhoneVerifyToken
};
