'use strict';

var { getDb } = require('./db');

async function ensureTelegramUser(from) {
  if (!from || !from.id) return null;
  var db = getDb();
  var tgId = +from.id;
  var { data: existing } = await db.from('users').select('*').eq('telegram_id', tgId).maybeSingle();
  if (existing) {
    var patch = { updated_at: new Date().toISOString() };
    if (from.username && existing.telegram_username !== from.username) {
      patch.telegram_username = from.username;
    }
    var display = [from.first_name, from.last_name].filter(Boolean).join(' ');
    if (display && !existing.display_name) patch.display_name = display;
    if (Object.keys(patch).length > 1) {
      var { data: upd } = await db.from('users').update(patch).eq('id', existing.id).select('*').single();
      return upd || existing;
    }
    return existing;
  }

  var { data: created, error } = await db
    .from('users')
    .insert({
      telegram_id: tgId,
      telegram_username: from.username || null,
      display_name: [from.first_name, from.last_name].filter(Boolean).join(' ') || null
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return created;
}

async function claimTelegramOrders(userId, telegramId, chatId) {
  var db = getDb();
  var orderIds = [];

  if (chatId) {
    var { data: byChat } = await db.from('orders').select('id').eq('telegram_chat_id', chatId);
    (byChat || []).forEach(function (o) {
      orderIds.push(o.id);
    });
  }

  // also attach by matching existing linked rows
  var { data: byUser } = await db.from('orders').select('id').eq('user_id', userId);
  (byUser || []).forEach(function (o) {
    if (orderIds.indexOf(o.id) === -1) orderIds.push(o.id);
  });

  if (chatId) {
    await db
      .from('orders')
      .update({
        user_id: userId,
        telegram_chat_id: chatId,
        updated_at: new Date().toISOString()
      })
      .eq('telegram_chat_id', chatId);
  }

  if (orderIds.length) {
    await db
      .from('orders')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .in('id', orderIds);
    await db
      .from('readings')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .in('order_id', orderIds);
  }

  return orderIds;
}

async function listReadyReadingsForChat(chatId, userId) {
  var db = getDb();
  var orderIds = [];

  if (chatId) {
    var { data: byChat } = await db
      .from('orders')
      .select('id')
      .eq('telegram_chat_id', chatId)
      .order('created_at', { ascending: false });
    (byChat || []).forEach(function (o) {
      orderIds.push(o.id);
    });
  }

  if (userId) {
    var { data: byUser } = await db
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    (byUser || []).forEach(function (o) {
      if (orderIds.indexOf(o.id) === -1) orderIds.push(o.id);
    });
  }

  if (!orderIds.length) return [];

  var { data: mine } = await db
    .from('readings')
    .select('id, order_id, title, status, telegram_delivered_at, created_at')
    .in('order_id', orderIds)
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  return mine || [];
}

async function listPendingReadingsForChat(chatId, userId) {
  var db = getDb();
  var orderIds = [];
  if (chatId) {
    var { data: byChat } = await db.from('orders').select('id').eq('telegram_chat_id', chatId);
    (byChat || []).forEach(function (o) {
      orderIds.push(o.id);
    });
  }
  if (userId) {
    var { data: byUser } = await db.from('orders').select('id').eq('user_id', userId);
    (byUser || []).forEach(function (o) {
      if (orderIds.indexOf(o.id) === -1) orderIds.push(o.id);
    });
  }
  if (!orderIds.length) return [];
  var { data } = await db
    .from('readings')
    .select('id, order_id, title, status')
    .in('order_id', orderIds)
    .in('status', ['queued', 'generating']);
  return data || [];
}

async function claimOrdersByPhone(userId, phone, chatId) {
  var contact = require('./contact');
  var db = getDb();
  var norm = contact.normalizePhone(phone);
  if (!userId || !norm) return [];

  var { data: candidates } = await db
    .from('orders')
    .select('id, phone, contact, telegram_chat_id, user_id')
    .order('created_at', { ascending: false })
    .limit(80);

  var matched = (candidates || []).filter(function (o) {
    return contact.phonesMatch(o.phone, norm);
  });
  if (!matched.length) return [];

  var ids = matched.map(function (o) {
    return o.id;
  });
  var patch = {
    user_id: userId,
    updated_at: new Date().toISOString()
  };
  if (chatId) patch.telegram_chat_id = chatId;

  await db.from('orders').update(patch).in('id', ids);
  await db.from('readings').update({ user_id: userId, updated_at: new Date().toISOString() }).in('order_id', ids);
  return ids;
}

module.exports = {
  ensureTelegramUser,
  claimTelegramOrders,
  claimOrdersByPhone,
  listReadyReadingsForChat,
  listPendingReadingsForChat
};
