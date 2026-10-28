'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const adminLib = require('../lib/admin');
const kaspi = require('../lib/kaspi');

// Minimal public-settings stubs
function pub(overrides) {
  return Object.assign(
    {
      unicorn_enabled: true,
      kaspi_enabled: false,
      prodamus_enabled: false,
      aipay_enabled: false,
      payment_provider: 'unicorn'
    },
    overrides
  );
}

// Test normalizeProvider
test('normalizeProvider: kaspi', () => {
  assert.equal(adminLib.normalizeProvider('kaspi'), 'kaspi');
  assert.equal(adminLib.normalizeProvider('payproverka'), 'kaspi');
});

test('normalizeProvider: prodamus', () => {
  assert.equal(adminLib.normalizeProvider('prodamus'), 'prodamus');
  assert.equal(adminLib.normalizeProvider('proeducation'), 'prodamus');
});

test('normalizeProvider: aipay', () => {
  assert.equal(adminLib.normalizeProvider('aipay'), 'aipay');
  assert.equal(adminLib.normalizeProvider('paylab'), 'aipay');
});

test('normalizeProvider: unknown falls back to unicorn', () => {
  assert.equal(adminLib.normalizeProvider('random'), 'unicorn');
  assert.equal(adminLib.normalizeProvider(''), 'unicorn');
});

// Test publicCheckoutSettings provider resolution
test('publicCheckoutSettings: kaspi_enabled reflects env key presence', () => {
  // isConfigured() reads process.env; set a fake key to enable Kaspi
  process.env.PAYPROVERKA_API_KEY = 'fake-key';
  const settings = {
    force_test_sum: null,
    test_mode: false,
    payment_provider: 'kaspi',
    unicorn_enabled: true,
    aipay_enabled: false
  };
  const out = adminLib.publicCheckoutSettings(settings);
  assert.equal(out.kaspi_enabled, true);
  delete process.env.PAYPROVERKA_API_KEY;
});

test('publicCheckoutSettings: kaspi disabled when no API key', () => {
  delete process.env.PAYPROVERKA_API_KEY;
  const settings = {
    force_test_sum: null,
    test_mode: false,
    payment_provider: 'kaspi',
    unicorn_enabled: true,
    aipay_enabled: false
  };
  const out = adminLib.publicCheckoutSettings(settings);
  assert.equal(out.kaspi_enabled, false);
  // Falls back to unicorn since it is enabled
  assert.equal(out.payment_provider, 'unicorn');
});

test('publicCheckoutSettings: prodamus_enabled reflects env key', () => {
  process.env.PRODAMUS_SECRET_KEY = 'fake-prodamus-key';
  process.env.PRODAMUS_FORM_URL = 'https://soulmetrica.proeducation.kz/';
  const settings = {
    force_test_sum: null,
    test_mode: false,
    payment_provider: 'prodamus',
    unicorn_enabled: false,
    aipay_enabled: false
  };
  const out = adminLib.publicCheckoutSettings(settings);
  assert.equal(out.prodamus_enabled, true);
  assert.equal(out.payment_provider, 'prodamus');
  delete process.env.PRODAMUS_SECRET_KEY;
  delete process.env.PRODAMUS_FORM_URL;
});

test('Kaspi amountMatches accepts formatted tenge amount', () => {
  assert.equal(kaspi.amountMatches({ amount: '4 990 ₸' }, 4990), true);
});

test('Kaspi amountMatches still rejects a different formatted amount', () => {
  assert.equal(kaspi.amountMatches({ amount: '3 500 ₸' }, 4990), false);
});
