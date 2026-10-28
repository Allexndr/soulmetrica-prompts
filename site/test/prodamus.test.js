'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const p = require('../lib/prodamus');

const DEMO_SECRET = '2y2aw4oknnke80bp1a8fniwuuq7tdkwmmuq7vwi4nzbr8z1182ftbn6p8mhw3bhz';

// ── normalizeForSignature ─────────────────────────────────────────────────────

test('normalizeForSignature: converts numbers to strings', () => {
  const out = p.normalizeForSignature({ price: 3990, count: 1 });
  assert.equal(out.price, '3990');
  assert.equal(out.count, '1');
});

test('normalizeForSignature: sorts keys alphabetically', () => {
  const out = p.normalizeForSignature({ z: 'last', a: 'first', m: 'mid' });
  assert.deepEqual(Object.keys(out), ['a', 'm', 'z']);
});

test('normalizeForSignature: recursively sorts nested objects', () => {
  const out = p.normalizeForSignature({ products: [{ z: 1, a: 2 }] });
  assert.deepEqual(Object.keys(out.products[0]), ['a', 'z']);
});

test('normalizeForSignature: null becomes empty string', () => {
  const out = p.normalizeForSignature({ foo: null });
  assert.equal(out.foo, '');
});

// ── signaturePayload ──────────────────────────────────────────────────────────

test('signaturePayload: escapes forward slashes', () => {
  const payload = p.signaturePayload({ url: 'https://example.com/path' });
  assert.ok(payload.includes('\\/'));
  assert.ok(!payload.includes('https://'));
});

test('signaturePayload: produces consistent JSON', () => {
  const a = p.signaturePayload({ b: '2', a: '1' });
  const b = p.signaturePayload({ a: '1', b: '2' });
  assert.equal(a, b);
});

// ── sign / verify ─────────────────────────────────────────────────────────────

test('sign: produces 64-char lowercase hex', () => {
  const sig = p.sign({ amount: '100' }, DEMO_SECRET);
  assert.match(sig, /^[a-f0-9]{64}$/);
});

test('sign: same data and key always gives same result', () => {
  const data = { order_id: 'x', sum: '100.00', products: [{ name: 'Test', price: '100.00', quantity: '1' }] };
  assert.equal(p.sign(data, DEMO_SECRET), p.sign(data, DEMO_SECRET));
});

test('sign: different data gives different signature', () => {
  const a = p.sign({ sum: '100.00' }, DEMO_SECRET);
  const b = p.sign({ sum: '200.00' }, DEMO_SECRET);
  assert.notEqual(a, b);
});

test('verify: accepts valid signature', () => {
  process.env.PRODAMUS_SECRET_KEY = DEMO_SECRET;
  const data = { order_num: 'veluna-1', sum: '3990.00', payment_status: 'success' };
  const sig = p.sign(data);
  assert.equal(p.verify(data, sig), true);
  delete process.env.PRODAMUS_SECRET_KEY;
});

test('verify: rejects tampered signature', () => {
  process.env.PRODAMUS_SECRET_KEY = DEMO_SECRET;
  const data = { order_num: 'veluna-1', sum: '3990.00', payment_status: 'success' };
  const goodSig = p.sign(data);
  const tampered = goodSig.slice(0, -2) + 'ff';
  assert.equal(p.verify(data, tampered), false);
  delete process.env.PRODAMUS_SECRET_KEY;
});

test('verify: rejects empty signature', () => {
  process.env.PRODAMUS_SECRET_KEY = DEMO_SECRET;
  const data = { order_num: 'veluna-1' };
  assert.equal(p.verify(data, ''), false);
  delete process.env.PRODAMUS_SECRET_KEY;
});

test('verify: returns false without secret key', () => {
  delete process.env.PRODAMUS_SECRET_KEY;
  const data = { sum: '100.00' };
  const sig = p.sign(data, DEMO_SECRET);
  assert.equal(p.verify(data, sig), false);
});

test('verify: rejects wrong-length hex (not 64 chars)', () => {
  process.env.PRODAMUS_SECRET_KEY = DEMO_SECRET;
  assert.equal(p.verify({ x: '1' }, 'abc'), false);
  delete process.env.PRODAMUS_SECRET_KEY;
});

// ── isPaid / amountMatches ────────────────────────────────────────────────────

test('isPaid: true for lowercase success', () => {
  assert.equal(p.isPaid({ payment_status: 'success' }), true);
});

test('isPaid: false for failed', () => {
  assert.equal(p.isPaid({ payment_status: 'failed' }), false);
});

test('isPaid: false for empty', () => {
  assert.equal(p.isPaid({}), false);
});

test('amountMatches: matches within floating-point tolerance', () => {
  assert.equal(p.amountMatches({ sum: '3990.00' }, 3990), true);
});

test('amountMatches: rejects different amounts', () => {
  assert.equal(p.amountMatches({ sum: '30.00' }, 3990), false);
});

test('amountMatches: handles order_sum field', () => {
  assert.equal(p.amountMatches({ order_sum: '4990.50' }, 4990.5), true);
});
