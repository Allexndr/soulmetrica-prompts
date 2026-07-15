'use strict';

var fs = require('fs');
var path = require('path');

function readLlms() {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'llms.txt'), 'utf8');
  } catch (e) {
    return '# SoulMetrica\n\nhttps://soulmetrica.com\n';
  }
}

async function listProducts() {
  try {
    var admin = require('../../lib/admin');
    var prices = await admin.listPrices();
    return { ok: true, prices: (prices || []).filter(function (p) { return p && p.active; }) };
  } catch (e) {
    return {
      ok: true,
      prices: [
        { name: 'Полный разбор', product_key: 'full' },
        { name: 'Сценарий любви', product_key: 'love' },
        { name: 'Денежный код', product_key: 'money' }
      ],
      note: 'fallback catalog'
    };
  }
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id: id == null ? null : id, result: result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id == null ? null : id, error: { code: code, message: message } };
}

async function handleRpc(body) {
  var method = body && body.method;
  var id = body && body.id;
  var params = (body && body.params) || {};

  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'soulmetrica', version: '3.0.0' }
    });
  }
  if (method === 'tools/list') {
    return jsonRpcResult(id, {
      tools: [
        {
          name: 'list_products',
          description: 'List SoulMetrica products / public prices',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'get_site_summary',
          description: 'Return llms.txt markdown summary',
          inputSchema: { type: 'object', properties: {} }
        }
      ]
    });
  }
  if (method === 'tools/call') {
    var name = params.name;
    if (name === 'list_products') {
      var products = await listProducts();
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(products, null, 2) }]
      });
    }
    if (name === 'get_site_summary') {
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: readLlms() }]
      });
    }
    return jsonRpcError(id, -32601, 'Unknown tool');
  }
  if (method === 'ping') {
    return jsonRpcResult(id, {});
  }
  return jsonRpcError(id, -32601, 'Method not found: ' + method);
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: true,
        mcp: true,
        endpoint: '/api/mcp',
        card: '/.well-known/mcp/server-card.json',
        transport: 'json-rpc over POST'
      })
    );
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  var body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      var chunks = [];
      for await (var c of req) chunks.push(c);
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')));
      return;
    }
  }

  try {
    var out = await handleRpc(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(out));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify(jsonRpcError(body && body.id, -32603, err.message || 'Internal')));
  }
}

module.exports = handler;
module.exports.default = handler;
