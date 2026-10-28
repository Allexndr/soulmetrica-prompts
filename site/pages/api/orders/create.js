'use strict';

/** Adblock-safe alias — uBlock/AdGuard often block URLs containing "payment". */
var handler = require('../create-payment');
module.exports = handler;
module.exports.default = handler;
