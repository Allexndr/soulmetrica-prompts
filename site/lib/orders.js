'use strict';

var { getDb } = require('./db');
var prompts = require('./prompts');
var { payLog, payError } = require('./pay-log');

async function upsertPendingOrder(payload) {
  var db = getDb();
  var row = {
    id: payload.id,
    user_id: payload.userId || null,
    product: payload.product,
    addons: payload.addons || [],
    amount: payload.amount,
    status: 'pending',
    customer_name: payload.customerName || null,
    phone: payload.phone || null,
    contact: payload.contact || null,
    birth_day: payload.birthDay ? +payload.birthDay : null,
    birth_month: payload.birthMonth ? +payload.birthMonth : null,
    birth_year: payload.birthYear ? +payload.birthYear : null,
    birth_time: payload.birthTime || null,
    birth_city: payload.birthCity || null,
    gender: payload.gender || 'unknown',
    language: payload.language === 'en' ? 'en' : 'ru',
    updated_at: new Date().toISOString()
  };
  if (payload.paymentProvider) row.payment_provider = String(payload.paymentProvider).slice(0, 40);
  if (payload.providerPaymentId) row.provider_payment_id = String(payload.providerPaymentId).slice(0, 120);
  if (payload.paymentMeta && typeof payload.paymentMeta === 'object') {
    row.payment_meta = payload.paymentMeta;
  }

  var { error } = await db.from('orders').upsert(row, { onConflict: 'id' });
  if (error && /payment_provider|provider_payment_id|payment_meta|language/i.test(error.message || '')) {
    // Columns may be missing until migrations are applied — retry without them.
    var missing = String(error.message || '');
    if (/payment_provider/i.test(missing)) delete row.payment_provider;
    if (/provider_payment_id/i.test(missing)) delete row.provider_payment_id;
    if (/payment_meta/i.test(missing)) delete row.payment_meta;
    if (/language/i.test(missing)) delete row.language;
    var retry = await db.from('orders').upsert(row, { onConflict: 'id' });
    error = retry.error;
  }
  if (error) {
    payError('orders.upsert_fail', new Error(error.message), { orderId: payload.id });
    throw new Error(error.message);
  }
  payLog('orders.upsert_pending', {
    orderId: payload.id,
    amount: payload.amount,
    product: payload.product,
    paymentProvider: payload.paymentProvider || null
  });
  return row;
}

async function attachProviderPayment(orderId, provider, providerPaymentId, meta) {
  var db = getDb();
  var patch = {
    updated_at: new Date().toISOString()
  };
  if (provider) patch.payment_provider = String(provider).slice(0, 40);
  if (providerPaymentId) patch.provider_payment_id = String(providerPaymentId).slice(0, 120);
  if (meta && typeof meta === 'object') {
    var current = await getOrder(orderId);
    patch.payment_meta = Object.assign({}, (current && current.payment_meta) || {}, meta);
  }
  var { data, error } = await db.from('orders').update(patch).eq('id', orderId).select('*').maybeSingle();
  if (error && /payment_provider|provider_payment_id|payment_meta/i.test(error.message || '')) {
    payLog('orders.attach_provider.skip_columns', { orderId: orderId, reason: error.message });
    return getOrder(orderId);
  }
  if (error) throw new Error(error.message);
  return data;
}

async function findOrderByProviderPaymentId(providerPaymentId) {
  var db = getDb();
  var id = String(providerPaymentId || '').trim();
  if (!id) return null;
  var { data, error } = await db
    .from('orders')
    .select('*')
    .eq('provider_payment_id', id)
    .maybeSingle();
  if (error && /provider_payment_id/i.test(error.message || '')) return null;
  if (error) throw new Error(error.message);
  return data;
}

async function getOrder(orderId) {
  var db = getDb();
  var { data, error } = await db.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function markOrderPaid(orderId, extra) {
  var db = getDb();
  var patch = {
    status: 'paid',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (extra && extra.telegramChatId) patch.telegram_chat_id = extra.telegramChatId;
  var { data, error } = await db.from('orders').update(patch).eq('id', orderId).select('*').maybeSingle();
  if (error) {
    payError('orders.mark_paid_fail', new Error(error.message), { orderId: orderId });
    throw new Error(error.message);
  }
  payLog('orders.marked_paid', {
    orderId: orderId,
    amount: data && data.amount,
    product: data && data.product,
    telegramChatId: extra && extra.telegramChatId ? true : false
  });
  return data;
}

async function linkTelegramToOrder(orderId, chatId, telegramUser) {
  var db = getDb();
  var order = await getOrder(orderId);
  if (!order) return null;

  var userId = order.user_id;
  if (!userId && telegramUser) {
    var tgId = telegramUser.id;
    var { data: existing } = await db
      .from('users')
      .select('id')
      .eq('telegram_id', tgId)
      .maybeSingle();
    if (existing) {
      userId = existing.id;
    } else {
      var { data: created, error: createErr } = await db
        .from('users')
        .insert({
          telegram_id: tgId,
          telegram_username: telegramUser.username || null,
          display_name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || null
        })
        .select('id')
        .single();
      if (createErr) throw new Error(createErr.message);
      userId = created.id;
    }
  }

  var patch = {
    telegram_chat_id: chatId,
    updated_at: new Date().toISOString()
  };
  if (userId) patch.user_id = userId;

  var { data, error } = await db.from('orders').update(patch).eq('id', orderId).select('*').maybeSingle();
  if (error) throw new Error(error.message);

  if (userId) {
    await db.from('readings').update({ user_id: userId }).eq('order_id', orderId);
  }
  return data;
}

async function linkOrderToUser(orderId, userId) {
  var db = getDb();
  var { error } = await db
    .from('orders')
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
  await db.from('readings').update({ user_id: userId }).eq('order_id', orderId);
}

async function enqueueReadings(order) {
  var db = getDb();
  // One document per order: primary chapters + addon modules glued in
  var plan = prompts.buildMergedPlan(order);
  var created = [];
  var p = { key: plan.mainKey, title: plan.mainTitle };
  var blocksTotal = plan.steps.length;

  var { data: existing } = await db
    .from('readings')
    .select('id, status')
    .eq('order_id', order.id)
    .eq('product_key', p.key)
    .maybeSingle();

  if (existing && existing.status !== 'failed') {
    created.push(existing);
    return created;
  }

  var title = p.title;
  if (plan.addonKeys && plan.addonKeys.length) {
    title = p.title + (prompts.orderLanguage(order) === 'en' ? ' · with modules' : ' · с модулями');
  }

  var row = {
    order_id: order.id,
    user_id: order.user_id || null,
    product_key: p.key,
    title: title,
    status: 'queued',
    blocks_total: blocksTotal,
    blocks_done: 0,
    blocks_content: [],
    updated_at: new Date().toISOString()
  };

  if (existing) {
    var { data: upd, error: updErr } = await db
      .from('readings')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (updErr) throw new Error(updErr.message);
    created.push(upd);
  } else {
    var { data: ins, error: insErr } = await db.from('readings').insert(row).select('*').single();
    if (insErr) throw new Error(insErr.message);
    created.push(ins);
  }
  return created;
}

async function listOrdersForUser(userId) {
  var db = getDb();
  var { data, error } = await db
    .from('orders')
    .select('id, product, amount, status, paid_at, created_at, telegram_chat_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function listReadingsForUser(userId) {
  var db = getDb();
  var { data, error } = await db
    .from('readings')
    .select('id, order_id, product_key, title, status, file_url, created_at, updated_at, telegram_delivered_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = {
  upsertPendingOrder,
  attachProviderPayment,
  findOrderByProviderPaymentId,
  getOrder,
  markOrderPaid,
  linkTelegramToOrder,
  linkOrderToUser,
  enqueueReadings,
  listOrdersForUser,
  listReadingsForUser
};
