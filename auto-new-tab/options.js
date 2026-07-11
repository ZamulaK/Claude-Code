'use strict';

let config;

function uid(prefix) {
  return prefix + '-' + crypto.randomUUID().slice(0, 8);
}

function normalize(cfg) {
  cfg.version = 1;
  if (cfg.defaultAction !== 'same-tab') cfg.defaultAction = 'new-tab';
  cfg.sites = (Array.isArray(cfg.sites) ? cfg.sites : [])
    .filter((s) => s && typeof s.pattern === 'string');
  cfg.linkRules = (Array.isArray(cfg.linkRules) ? cfg.linkRules : [])
    .filter((r) => r && typeof r.pattern === 'string');
  for (const s of cfg.sites) {
    if (!s.id) s.id = uid('s');
    s.enabled = s.enabled !== false;
  }
  for (const r of cfg.linkRules) {
    if (!r.id) r.id = uid('r');
    r.enabled = r.enabled !== false;
    if (r.action !== 'same-tab') r.action = 'new-tab';
  }
  return cfg;
}

function save() {
  lntSaveConfig(config);
  updateTester();
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function enabledCheckbox(item) {
  const box = el('input', { type: 'checkbox', checked: item.enabled, title: 'Enabled' });
  box.addEventListener('change', () => {
    item.enabled = box.checked;
    save();
  });
  return box;
}

function patternInput(item) {
  const input = el('input', {
    type: 'text', value: item.pattern, className: 'pattern',
    autocomplete: 'off', spellcheck: false,
  });
  input.addEventListener('change', () => {
    item.pattern = input.value.trim();
    save();
  });
  return input;
}

function iconButton(label, title, onClick) {
  const button = el('button', { type: 'button', className: 'icon', textContent: label, title });
  button.addEventListener('click', onClick);
  return button;
}

function renderSites() {
  const list = document.getElementById('site-list');
  list.textContent = '';
  if (!config.sites.length) {
    list.append(el('p', { className: 'hint', textContent: 'No sites yet — the extension is inactive everywhere.' }));
  }
  for (const site of config.sites) {
    list.append(el('div', { className: 'row' },
      enabledCheckbox(site),
      patternInput(site),
      iconButton('✕', 'Delete', () => {
        if (!confirm(`Delete site pattern “${site.pattern}”?`)) return;
        config.sites = config.sites.filter((s) => s !== site);
        save();
        renderSites();
      }),
    ));
  }
}

function renderRules() {
  const list = document.getElementById('rule-list');
  list.textContent = '';
  if (!config.linkRules.length) {
    list.append(el('p', { className: 'hint', textContent: 'No rules — every link on active sites uses the default action.' }));
  }
  config.linkRules.forEach((rule, index) => {
    const action = el('select', {},
      el('option', { value: 'new-tab', textContent: 'New tab', selected: rule.action === 'new-tab' }),
      el('option', { value: 'same-tab', textContent: 'Same tab', selected: rule.action === 'same-tab' }),
    );
    action.addEventListener('change', () => {
      rule.action = action.value;
      save();
    });

    const move = (delta) => () => {
      const target = index + delta;
      config.linkRules.splice(index, 1);
      config.linkRules.splice(target, 0, rule);
      save();
      renderRules();
    };
    const up = iconButton('↑', 'Move up', move(-1));
    const down = iconButton('↓', 'Move down', move(1));
    up.disabled = index === 0;
    down.disabled = index === config.linkRules.length - 1;

    list.append(el('div', { className: 'row' },
      enabledCheckbox(rule),
      patternInput(rule),
      action,
      up,
      down,
      iconButton('✕', 'Delete', () => {
        if (!confirm(`Delete rule “${rule.pattern}”?`)) return;
        config.linkRules = config.linkRules.filter((r) => r !== rule);
        save();
        renderRules();
      }),
    ));
  });
}

function updateTester() {
  const pageUrl = document.getElementById('test-page').value.trim();
  const linkUrl = document.getElementById('test-link').value.trim();
  const out = document.getElementById('test-result');
  if (!pageUrl && !linkUrl) {
    out.textContent = '';
    return;
  }
  const compiled = lntCompileConfig(config);
  const lines = [];
  let active = true;
  if (pageUrl) {
    active = lntIsActiveOn(compiled, pageUrl);
    lines.push(active
      ? 'Page matches an active site.'
      : 'Page matches no active site — links there are left alone.');
  }
  if (linkUrl && active) {
    const rule = lntRuleForLink(compiled, linkUrl);
    const action = rule ? rule.action : compiled.defaultAction;
    const why = rule ? `rule “${rule.pattern}”` : 'the default action';
    lines.push(`Link opens in a ${action === 'new-tab' ? 'new tab' : 'same tab (left alone)'} — decided by ${why}.`);
  }
  out.textContent = lines.join(' ');
}

function wireForms() {
  document.getElementById('site-add').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('site-pattern');
    const pattern = input.value.trim();
    if (!pattern) return;
    config.sites.push({ id: uid('s'), pattern, enabled: true });
    input.value = '';
    save();
    renderSites();
  });

  document.getElementById('rule-add').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('rule-pattern');
    const pattern = input.value.trim();
    if (!pattern) return;
    config.linkRules.push({
      id: uid('r'),
      pattern,
      action: document.getElementById('rule-action').value,
      enabled: true,
    });
    input.value = '';
    save();
    renderRules();
  });

  const defaultAction = document.getElementById('default-action');
  defaultAction.addEventListener('change', () => {
    config.defaultAction = defaultAction.value;
    save();
  });

  document.getElementById('test-page').addEventListener('input', updateTester);
  document.getElementById('test-link').addEventListener('input', updateTester);

  document.getElementById('export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'auto-new-tab-config.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const importFile = document.getElementById('import-file');
  document.getElementById('import-button').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const file = importFile.files[0];
    importFile.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
      config = normalize(parsed);
      save();
      renderAll();
    } catch (e) {
      alert('Could not import: not a valid config file.');
    }
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Replace all sites and rules with the built-in defaults? This cannot be undone.')) return;
    config = normalize(JSON.parse(JSON.stringify(LNT_DEFAULT_CONFIG)));
    save();
    renderAll();
  });
}

function renderAll() {
  renderSites();
  renderRules();
  document.getElementById('default-action').value = config.defaultAction;
  updateTester();
}

async function init() {
  config = normalize(await lntLoadConfig());
  wireForms();
  renderAll();
}

init();
