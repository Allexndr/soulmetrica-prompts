'use strict';

function stripEmojis(s) {
  return String(s || '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/\uFE0F/g, '')
    .trim();
}

function cleanText(raw) {
  var text = String(raw || '');

  // broken glyphs / control junk that becomes □□□ in PDF
  text = text.replace(/\u0000/g, '');
  text = text.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  text = text.replace(/[\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060\uFEFF]/g, '');
  text = text.replace(/\uFFFD/g, '');
  text = text.replace(/[\uE000-\uF8FF]/g, '');
  text = text.replace(/[\uD800-\uDFFF]/g, ''); // lone surrogates
  text = text.replace(/[^\S\n]+/g, ' '); // weird spaces → normal (keep \n)
  text = text.replace(/[\u00A0\u202F\u2007\u2008\u2009\u200A]/g, ' ');
  text = text.replace(/[\u2010-\u2015]/g, '-'); // unicode dashes → ASCII
  text = text.replace(/[«»„“”«»]/g, function (ch) {
    if (ch === '«' || ch === '„') return '«';
    if (ch === '»' || ch === '“' || ch === '”') return '»';
    return ch;
  });
  text = text.replace(/[•●◦▪▸►]/g, '-');

  // LLM sometimes inserts CJK/Korean/etc → □□□ in fonts without those glyphs
  text = text.replace(/真正ная/g, ' истинная');
  text = text.replace(/真正н/g, ' истинн');
  text = text.replace(/真正/g, ' истин');
  text = text.replace(/自己/g, ' себя');
  text = text.replace(/力量/g, ' сила');
  text = text.replace(/关系/g, ' отношения');
  text = text.replace(/([\u0400-\u04FF\w])[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+/g, '$1 ');
  text = text.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]+/g, ' ');
  text = text.replace(/[ \t]{2,}/g, ' ');

  // placeholders & trash
  text = text.replace(/\{[^}]+\}/g, '');
  text = text.replace(/_or_rather_[^\s]+/gi, '');
  text = text.replace(/QueryString/gi, 'путь');
  text = text.replace(/Mvc\s+/g, '');
  text = text.replace(/\bthou\b/gi, 'ты');
  text = text.replace(/\bsounds\s+как/gi, 'звучит как');
  text = text.replace(/\bdeep\s+down\b/gi, 'в глубине');
  text = text.replace(/\bsedimentироваться/gi, 'осесть');
  text = text.replace(/\bquieter\b/gi, 'более тихой');
  text = text.replace(/\brelatively\b/gi, 'относительно');
  text = text.replace(/\bentirely\b/gi, 'полностью');
  text = text.replace(/\bability\b/gi, 'способность');
  text = text.replace(/\btalent\b/gi, 'талант');
  text = text.replace(/\balive\b/gi, 'живым');
  text = text.replace(/\blisten\b/gi, 'слушать');
  text = text.replace(/\bpessoas\b/gi, 'людьми');
  text = text.replace(/\bçeşitli\b/gi, 'разные');
  text = text.replace(/\bgibi\b/gi, '');
  text = text.replace(/\bBegins\b/g, 'начинаешь');
  text = text.replace(/\bBLOCK[oо]м\b/gi, 'блоком');
  text = text.replace(/\bentry\s+в\b/gi, 'вход в');
  text = text.replace(/character\b/gi, 'характер');
  text = text.replace(/\bexplorar?\b/gi, 'исследовать');
  text = text.replace(/\bgerçek\b/gi, 'настоящий');
  text = text.replace(/\bavav\b/gi, 'Авав');
  text = text.replace(/\bАвав\b/g, 'Авав');

  // markdown junk
  text = text.replace(/^#{1,6}\s*/gm, '');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');
  text = text.replace(/`+/g, '');
  text = text.replace(/^\s*[-*]\s+/gm, '- ');
  text = text.replace(/^\s*>\s?/gm, '');

  // duplicated headers like "3. ЯДРО" twice in a row
  text = text.replace(/^(\d+\.\s*[^\n]+)\n+\1$/gim, '$1');
  text = text.replace(/^(\d+\.\s*[^\n]+)\n+(\1\n)/gim, '$1\n');

  // meta labels
  text = text.replace(/^\s*_?Якорная фраза:_?\s*/gim, '');
  text = text.replace(/^\s*Якорная фраза:\s*/gim, '');

  // collapse whitespace
  text = text.replace(/\r/g, '');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}

function chapterTitle(block) {
  var t = String((block && block.title) || 'Глава');
  t = t.replace(/^[^\wа-яА-ЯёЁ]+/u, '');
  t = stripEmojis(t);
  t = t.replace(/\s+/g, ' ').trim();
  return t || 'Глава';
}

function getChapters(reading) {
  var blocks = Array.isArray(reading.blocks_content) ? reading.blocks_content : [];
  if (blocks.length) {
    return blocks
      .filter(function (b) {
        return b.num !== 0 && !/^__/.test(String(b.title || ''));
      })
      .map(function (b, idx) {
        return {
          num: b.num || idx + 1,
          title: chapterTitle(b),
          text: cleanText(b.text || '')
        };
      })
      .filter(function (c) {
        return c.text;
      });
  }

  var raw = cleanText(reading.content_text || '');
  if (!raw) return [];
  return [{ num: 1, title: reading.title || 'Разбор', text: raw }];
}

function formatChapterPlain(chapter, total) {
  var head = chapter.num + ' / ' + total + ' · ' + chapter.title;
  return head + '\n\n' + chapter.text;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatChapterHtml(chapter, total) {
  return (
    '<b>' +
    escapeHtml(String(chapter.num)) +
    ' / ' +
    escapeHtml(String(total)) +
    ' · ' +
    escapeHtml(chapter.title) +
    '</b>\n\n' +
    escapeHtml(chapter.text)
  );
}

function chunkForTelegram(text, size) {
  var limit = size || 3500;
  var parts = [];
  var s = String(text || '');
  while (s.length > limit) {
    var slice = s.slice(0, limit);
    var cut = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
    if (cut < limit * 0.5) cut = limit;
    parts.push(s.slice(0, cut).trim());
    s = s.slice(cut).trim();
  }
  if (s) parts.push(s);
  return parts;
}

function cleanFullReading(reading) {
  var chapters = getChapters(reading);
  return chapters
    .map(function (c) {
      return c.num + '. ' + c.title + '\n\n' + c.text;
    })
    .join('\n\n——————\n\n');
}

module.exports = {
  cleanText,
  getChapters,
  formatChapterPlain,
  formatChapterHtml,
  chunkForTelegram,
  cleanFullReading,
  chapterTitle,
  escapeHtml
};
