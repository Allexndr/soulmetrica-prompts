'use strict';

/**
 * Meta (Facebook) Pixel helpers.
 * Pixel ID can be overridden via NEXT_PUBLIC_META_PIXEL_ID.
 * Browser Purchase uses the same eventID as Conversions API (order id).
 */

var PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID || '916898804754747';

function pixelBootstrapScript() {
  return (
    '!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?' +
    'n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;' +
    'n.push=n;n.loaded=!0;n.version=\'2.0\';n.queue=[];t=b.createElement(e);t.async=!0;' +
    't.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,\'script\',' +
    '\'https://connect.facebook.net/en_US/fbevents.js\');' +
    "fbq('init','" +
    PIXEL_ID +
    "');fbq('track','PageView');"
  );
}

function noscriptImg() {
  return (
    'https://www.facebook.com/tr?id=' +
    PIXEL_ID +
    '&ev=PageView&noscript=1'
  );
}

/**
 * Purchase must fire only after confirmed payment — never on every page load.
 * eventID must match CAPI event_id for deduplication.
 */
function purchaseTrackScript(value, currency, orderId) {
  var amount = Number(value);
  if (!isFinite(amount) || amount <= 0) return '';
  var cur = currency || 'KZT';
  var oid = orderId ? String(orderId).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
  return (
    "if(typeof fbq==='function'){fbq('track','Purchase',{value:" +
    amount +
    ",currency:'" +
    cur +
    "'" +
    (oid ? ",content_ids:['" + oid + "'],content_type:'product',order_id:'" + oid + "'" : '') +
    '}' +
    (oid ? ",{eventID:'" + oid + "'}" : '') +
    ');}'
  );
}

module.exports = {
  PIXEL_ID: PIXEL_ID,
  pixelBootstrapScript: pixelBootstrapScript,
  noscriptImg: noscriptImg,
  purchaseTrackScript: purchaseTrackScript
};
