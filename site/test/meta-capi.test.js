'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const capi = require('../lib/meta-capi');

test('hashPhone normalizes KZ numbers before sha256', () => {
  const a = capi.hashPhone('+7 705 111 22 40');
  const b = capi.hashPhone('87051112240');
  const c = capi.hashPhone('7051112240');
  assert.equal(a, b);
  assert.equal(a, c);
  assert.match(a, /^[a-f0-9]{64}$/);
});

test('hashEmail lowercases before sha256', () => {
  assert.equal(capi.hashEmail('A@B.KZ'), capi.hashEmail('a@b.kz'));
  assert.equal(capi.hashEmail(''), null);
});

test('buildFbc keeps existing cookie and synthesizes from fbclid', () => {
  assert.equal(capi.buildFbc('fb.1.1.abc', 'ignored'), 'fb.1.1.abc');
  const made = capi.buildFbc('', 'AbC123');
  assert.match(made, /^fb\.1\.\d+\.AbC123$/);
});

test('Purchase payload uses order id as event_id', () => {
  const evt = capi.eventPayload('Purchase', {
    id: 'veluna-1',
    amount: 4990,
    product: 'Детский разбор',
    phone: '+77051112240',
    payment_meta: { fbp: 'fb.1.2.x', fbc: 'fb.1.2.y' }
  });
  assert.equal(evt.event_name, 'Purchase');
  assert.equal(evt.event_id, 'veluna-1');
  assert.equal(evt.action_source, 'website');
  assert.equal(evt.custom_data.value, 4990);
  assert.equal(evt.custom_data.currency, 'KZT');
  assert.equal(evt.custom_data.order_id, 'veluna-1');
  assert.equal(evt.user_data.fbp, 'fb.1.2.x');
  assert.equal(evt.user_data.ph, capi.hashPhone('+77051112240'));
});
