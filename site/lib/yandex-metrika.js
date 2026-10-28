'use strict';

/**
 * Yandex.Metrika helpers.
 * Counter ID can be overridden via NEXT_PUBLIC_YANDEX_METRIKA_ID.
 */

var COUNTER_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || '110866246';

function metrikaBootstrapScript() {
  return (
    '(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};' +
    'm[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}' +
    'k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})' +
    "(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=" +
    COUNTER_ID +
    "','ym');" +
    'ym(' +
    COUNTER_ID +
    ',\'init\',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});' +
    'window.dataLayer=window.dataLayer||[];'
  );
}

function noscriptImg() {
  return 'https://mc.yandex.ru/watch/' + COUNTER_ID;
}

/** Purchase goal — only after confirmed payment. */
function purchaseReachGoalScript(value, orderId) {
  var amount = Number(value);
  if (!isFinite(amount) || amount <= 0) return '';
  var oid = orderId ? String(orderId).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
  return (
    'if(typeof ym==="function"){ym(' +
    COUNTER_ID +
    ",'reachGoal','purchase',{order_price:" +
    amount +
    ",currency:'KZT'" +
    (oid ? ",order_id:'" + oid + "'" : '') +
    '});}'
  );
}

module.exports = {
  COUNTER_ID: COUNTER_ID,
  metrikaBootstrapScript: metrikaBootstrapScript,
  noscriptImg: noscriptImg,
  purchaseReachGoalScript: purchaseReachGoalScript
};
