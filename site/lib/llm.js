'use strict';

var https = require('https');

function digitizeDate(day, month, year) {
  var s = String(day || '') + String(month || '') + String(year || '');
  var digits = s.replace(/\D/g, '').split('').map(Number).filter(function (n) {
    return !isNaN(n);
  });
  var sum = digits.reduce(function (a, b) {
    return a + b;
  }, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum)
      .split('')
      .reduce(function (a, b) {
        return a + Number(b);
      }, 0);
  }
  return sum || 7;
}

var ARCH = {
  1: 'движение вперёд и своё решение',
  2: 'тонкая настройка на людей',
  3: 'голос, образы и самовыражение',
  4: 'структура и опора',
  5: 'перемены и свобода хода',
  6: 'забота и ответственность за ближних',
  7: 'глубина, анализ и своя правда',
  8: 'сила, масштаб и ресурс',
  9: 'смысл, отдача и завершение циклов',
  11: 'видение дальше очевидного',
  22: 'сборка большого из деталей',
  33: 'служение через ясность'
};

function demoBlock(order, block) {
  var name = order.customer_name || 'ты';
  var date =
    order.birth_day && order.birth_month && order.birth_year
      ? [order.birth_day, order.birth_month, order.birth_year].join('.')
      : 'твоей дате';
  var lp = digitizeDate(order.birth_day, order.birth_month, order.birth_year);
  var core = ARCH[lp] || ARCH[7];

  return (
    '## ' +
    block.num +
    '. ' +
    block.title +
    '\n\n' +
    name +
    ', этот слой собран по ' +
    date +
    '. В твоей карте ядро звучит как ' +
    core +
    '.\n\n' +
    'Снаружи ты держишь собранный вид, а внутри давно идёт другой разговор — тише, точнее и честнее. ' +
    'Ты ловишь себя на том, что снова и снова возвращаешься к одному и тому же развилку: идти своим темпом или подстраиваться под чужой.\n\n' +
    'Якорная фраза: ты сильнее там, где перестаёшь оправдываться.\n\n' +
    '(Демо-режим — задай TOGETHER_API_KEY или OPENAI_API_KEY для полной генерации по v12.)'
  );
}

function resolveProvider() {
  var forced = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (forced === 'together' && process.env.TOGETHER_API_KEY) {
    return {
      name: 'together',
      apiKey: process.env.TOGETHER_API_KEY,
      hostname: 'api.together.xyz',
      path: '/v1/chat/completions',
      model: process.env.TOGETHER_MODEL || process.env.OPENAI_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
    };
  }
  if (forced === 'openai' && process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  }
  // Prefer Together if key present (user requested), else OpenAI
  if (process.env.TOGETHER_API_KEY) {
    return {
      name: 'together',
      apiKey: process.env.TOGETHER_API_KEY,
      hostname: 'api.together.xyz',
      path: '/v1/chat/completions',
      model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  }
  return null;
}

function chatCompletion(systemPrompt, userPrompt, opts) {
  opts = opts || {};
  var provider = resolveProvider();
  if (!provider) {
    return Promise.reject(new Error('NO_LLM_KEY'));
  }

  var body = JSON.stringify({
    model: provider.model,
    temperature: opts.temperature != null ? opts.temperature : 0.85,
    max_tokens: opts.max_tokens || 1800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  return new Promise(function (resolve, reject) {
    var req = https.request(
      {
        hostname: provider.hostname,
        path: provider.path,
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + provider.apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 120000
      },
      function (res) {
        var chunks = [];
        res.on('data', function (c) {
          chunks.push(c);
        });
        res.on('end', function () {
          var raw = Buffer.concat(chunks).toString('utf8');
          try {
            var json = JSON.parse(raw);
            if (json.error) {
              var msg =
                (json.error && json.error.message) ||
                (typeof json.error === 'string' ? json.error : provider.name + ' error');
              reject(new Error(msg));
              return;
            }
            var text =
              json.choices &&
              json.choices[0] &&
              json.choices[0].message &&
              json.choices[0].message.content;
            if (!text) {
              reject(new Error('Пустой ответ модели (' + provider.name + ')'));
              return;
            }
            resolve(text.trim());
          } catch (e) {
            reject(new Error(provider.name + ' parse error: ' + raw.slice(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error(provider.name + ' timeout'));
    });
    req.write(body);
    req.end();
  });
}

function callOpenAI(systemPrompt, userPrompt, order, block, opts) {
  return chatCompletion(systemPrompt, userPrompt, opts).catch(function (err) {
    if (err && err.message === 'NO_LLM_KEY') {
      return demoBlock(order || {}, block || { num: 1, title: 'Разбор' });
    }
    throw err;
  });
}

module.exports = { callOpenAI, demoBlock, resolveProvider, chatCompletion };
