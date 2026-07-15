'use strict';

/**
 * Имя файла разбора: Name_DD_MM_YYYY.ext
 * Для Telegram / Content-Disposition нужен ASCII + безопасные символы.
 */

var CYR = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya'
};

function pad2(n) {
  return String(n || 0).padStart(2, '0');
}

function translit(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .split('')
    .map(function (ch) {
      if (CYR[ch]) return CYR[ch];
      if (/[a-z0-9]/.test(ch)) return ch;
      if (/\s|-|_/.test(ch)) return '_';
      return '';
    })
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function readingFileBase(order, fallbackTitle) {
  order = order || {};
  var namePart = translit(order.customer_name || '');
  if (!namePart) namePart = translit(fallbackTitle || '') || 'razbor';
  var day = order.birth_day;
  var month = order.birth_month;
  var year = order.birth_year;
  if (day && month && year) {
    return namePart + '_' + pad2(day) + '_' + pad2(month) + '_' + year;
  }
  return namePart.slice(0, 40);
}

function readingFileName(order, ext, fallbackTitle) {
  var base = readingFileBase(order, fallbackTitle).slice(0, 60);
  var e = String(ext || 'pdf').replace(/^\./, '');
  return base + '.' + e;
}

module.exports = {
  translit: translit,
  readingFileBase: readingFileBase,
  readingFileName: readingFileName
};
