'use strict';

/**
 * HTML → PDF для premium-разбора (print CSS).
 * Fallback: pdfkit если chromium недоступен.
 */

var pdfReading = require('./pdf-reading');

async function htmlToPdfBuffer(html) {
  try {
    var chromium = require('@sparticuz/chromium');
    var puppeteer = require('puppeteer-core');
    var executablePath = await chromium.executablePath();
    var browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: executablePath,
      headless: chromium.headless !== false
    });
    try {
      var page = await browser.newPage();
      await page.setContent(String(html), { waitUntil: 'networkidle0', timeout: 45000 });
      await page.emulateMediaType('print');
      var buf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }
      });
      return Buffer.from(buf);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('[html-to-pdf] chromium fallback:', err.message);
    return null;
  }
}

async function buildPremiumPdf(reading, order, html) {
  var fromHtml = await htmlToPdfBuffer(html);
  if (fromHtml && fromHtml.length > 2000) return fromHtml;
  return pdfReading.buildReadingPdf(reading, order || {});
}

module.exports = {
  htmlToPdfBuffer: htmlToPdfBuffer,
  buildPremiumPdf: buildPremiumPdf
};
