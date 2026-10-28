'use strict';

/**
 * Allowed client/server funnel flags for Target / Meta Ads analytics.
 */

var ALLOWED = {
  'funnel.page_view': true,
  'funnel.page_leave': true,
  'funnel.quiz_open': true,
  'funnel.quiz_step': true,
  'funnel.quiz_close': true,
  'funnel.quiz_cta': true,
  'funnel.order_open': true,
  'funnel.phone_filled': true,
  'funnel.provider_select': true,
  'funnel.pay_submit': true,
  'funnel.payment_created': true,
  'funnel.payment_error': true,
  'funnel.invoice_waiting': true,
  'funnel.success_open': true,
  'tg.start': true,
  'tg.order_linked': true,
  'tg.order_unpaid': true,
  'tg.paid_open': true,
  'tg.reading_open': true,
  'tg.menu': true
};

var FUNNEL_STEPS = [
  { key: 'funnel.page_view', label: 'Зашёл на сайт' },
  { key: 'funnel.quiz_open', label: 'Открыл квиз/бот' },
  { key: 'funnel.order_open', label: 'Открыл форму заказа' },
  { key: 'funnel.phone_filled', label: 'Ввёл телефон' },
  { key: 'funnel.provider_select', label: 'Выбрал оплату' },
  { key: 'funnel.pay_submit', label: 'Нажал Оплатить' },
  { key: 'funnel.payment_created', label: 'Счёт создан' },
  { key: 'funnel.invoice_waiting', label: 'Ждёт Kaspi' },
  { key: 'order.paid', label: 'Оплатил' },
  { key: 'funnel.success_open', label: 'Страница Success' },
  { key: 'tg.start', label: 'Зашёл в Telegram' },
  { key: 'tg.paid_open', label: 'Открыл разбор в TG' }
];

function isAllowed(event) {
  return !!ALLOWED[String(event || '')];
}

function normalizeVisitorId(raw) {
  var id = String(raw || '').trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) return null;
  return id.slice(0, 64);
}

function stepLabel(event) {
  for (var i = 0; i < FUNNEL_STEPS.length; i++) {
    if (FUNNEL_STEPS[i].key === event) return FUNNEL_STEPS[i].label;
  }
  return event;
}

module.exports = {
  ALLOWED: ALLOWED,
  FUNNEL_STEPS: FUNNEL_STEPS,
  isAllowed: isAllowed,
  normalizeVisitorId: normalizeVisitorId,
  stepLabel: stepLabel
};
