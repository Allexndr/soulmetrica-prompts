(function () {
  if (typeof window === 'undefined') return;
  if (window.__soulWebMcp) return;
  window.__soulWebMcp = true;

  var TOOL_DEFS = [
    {
      name: 'open_order',
      description: 'Open the SoulMetrica order modal for a product',
      inputSchema: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Product name, e.g. Полный разбор' }
        }
      }
    },
    {
      name: 'list_products',
      description: 'List SoulMetrica product names and prices',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'navigate_section',
      description: 'Scroll to a landing section or open /offer',
      inputSchema: {
        type: 'object',
        properties: { section: { type: 'string' } },
        required: ['section']
      }
    },
    {
      name: 'get_llms_txt',
      description: 'Fetch /llms.txt site summary for citation',
      inputSchema: { type: 'object', properties: {} }
    }
  ];

  function executors() {
    return {
      open_order: async function (args) {
        var name = (args && args.product) || 'Полный разбор';
        if (typeof window.velunaOpenOrder === 'function') {
          window.velunaOpenOrder(name);
          return { content: [{ type: 'text', text: 'Opened order modal for ' + name }] };
        }
        return { content: [{ type: 'text', text: 'Order modal not ready' }], isError: true };
      },
      list_products: async function () {
        try {
          var r = await fetch('/api/admin/prices?public=1');
          var j = await r.json();
          return { content: [{ type: 'text', text: JSON.stringify(j) }] };
        } catch (e) {
          return { content: [{ type: 'text', text: String(e) }], isError: true };
        }
      },
      navigate_section: async function (args) {
        var id = String((args && args.section) || '').replace(/^#/, '');
        if (id === 'offer') {
          window.location.href = '/offer';
          return { content: [{ type: 'text', text: 'Navigating to /offer' }] };
        }
        var el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return { content: [{ type: 'text', text: 'Scrolled to #' + id }] };
        }
        return { content: [{ type: 'text', text: 'Section not found' }], isError: true };
      },
      get_llms_txt: async function () {
        var r = await fetch('/llms.txt');
        var t = await r.text();
        return { content: [{ type: 'text', text: t }] };
      }
    };
  }

  function getModelContext() {
    if (navigator.modelContext) return navigator.modelContext;
    if (document.modelContext) return document.modelContext;
    return null;
  }

  function registerAll() {
    var mc = getModelContext();
    var run = executors();
    var registered = [];

    TOOL_DEFS.forEach(function (def) {
      var tool = {
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        execute: run[def.name]
      };
      registered.push(tool);
      if (!mc) return;
      try {
        if (typeof mc.registerTool === 'function') mc.registerTool(tool);
      } catch (e) {}
    });

    if (mc && typeof mc.provideContext === 'function') {
      try {
        mc.provideContext({ tools: registered });
      } catch (e) {}
    }

    window.__webmcpTools = registered.map(function (t) {
      return { name: t.name, description: t.description, inputSchema: t.inputSchema };
    });
    return !!mc;
  }

  registerAll();
  document.addEventListener('modelcontextready', registerAll);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerAll);
  }
  setTimeout(registerAll, 500);
  setTimeout(registerAll, 2000);
})();
