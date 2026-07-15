'use strict';

var crypto = require('crypto');
var { hash, verify } = require('@node-rs/argon2');
var { getDb } = require('./db');
var sec = require('./security');

var SESSION_COOKIE = 'veluna_session';
var SESSION_DAYS = 30;

var ARGON_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2
};

async function hashPassword(password) {
  return hash(password, ARGON_OPTS);
}

async function verifyPassword(hashStr, password) {
  return verify(hashStr, password, ARGON_OPTS);
}

function parseCookies(req) {
  var raw = (req.headers.cookie || '').toString();
  var out = {};
  raw.split(';').forEach(function (part) {
    var i = part.indexOf('=');
    if (i === -1) return;
    var k = part.slice(0, i).trim();
    var v = part.slice(i + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, token) {
  var maxAge = SESSION_DAYS * 24 * 60 * 60;
  var secure = process.env.NODE_ENV === 'production' || (process.env.SITE_URL || '').indexOf('https://') === 0;
  var parts = [
    SESSION_COOKIE + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + maxAge
  ];
  if (secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', SESSION_COOKIE + '=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
}

async function createSession(userId) {
  var token = crypto.randomBytes(32).toString('base64url');
  var tokenHash = sec.hashToken(token);
  var expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  var db = getDb();
  await db.from('sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expires.toISOString()
  });
  return token;
}

async function getSessionUser(req) {
  var cookies = parseCookies(req);
  var token = cookies[SESSION_COOKIE];
  if (!token) return null;
  var db = getDb();
  var tokenHash = sec.hashToken(token);
  var { data: session } = await db
    .from('sessions')
    .select('id, user_id, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await db.from('sessions').delete().eq('id', session.id);
    return null;
  }
  var { data: user } = await db
    .from('users')
    .select('id, email, display_name, telegram_id, telegram_username, created_at')
    .eq('id', session.user_id)
    .maybeSingle();
  return user || null;
}

async function destroySession(req) {
  var cookies = parseCookies(req);
  var token = cookies[SESSION_COOKIE];
  if (!token) return;
  var db = getDb();
  await db.from('sessions').delete().eq('token_hash', sec.hashToken(token));
}

async function requireUser(req, res) {
  var user = await getSessionUser(req);
  if (!user) {
    sec.json(res, 401, { ok: false, error: 'Требуется вход' });
    return null;
  }
  return user;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  destroySession,
  requireUser,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE
};
