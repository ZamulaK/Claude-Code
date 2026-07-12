'use strict';

let config;

function uid(prefix) {
  return prefix + '-' + crypto.randomUUID().slice(0, 8);
}

function normalize(cfg) {
  cfg = lntMigrateConfig(cfg);
  cfg.version = 2;
  cfg.sites = (Array.isArray(cfg.sites) ? cfg.sites : [])
    .filter((s) => s && typeof s.pattern === 'string');
  for (const site of cfg.sites) {
    if (!site.id) site.id = uid('s');
    site.enabled = site.enabled !== false;
    if (site.defaultAction !== 'same-tab') site.defaultAction = 'new-tab';
    site.rules = (Array.isArray(site.rules) ? site.rules : [])
      .filter((r) => r && typeof r.pattern === 'string');
    for (const rule of site.rules) {
      if (!rule.id) rule.id = uid('r');
      rule.enabled = rule.enabled !== false;
      if (rule.action !== 'same-tab') rule.action = 'new-tab';
    }
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

function actionSelect(item) {
  const select = el('select', {},
    el('option', { value: 'new-tab', textContent: 'New Tab', selected: item.action !== 'same-tab' }),
    el('option', { value: 'same-tab', textContent: 'Same Tab', selected: item.action === 'same-tab' }),
  );
  select.addEventListener('change', () => {
    item.action = select.value;
    save();
  });
  return select;
}

function iconButton(label, title, onClick) {
  const button = el('button', { type: 'button', className: 'icon', textContent: label, title });
  button.addEventListener('click', onClick);
  return button;
}

function moveButtons(list, index, item, rerender) {
  const move = (delta) => () => {
    list.splice(index, 1);
    list.splice(index + delta, 0, item);
    save();
    rerender();
  };
  const up = iconButton('↑', 'Move Up', move(-1));
  const down = iconButton('↓', 'Move Down', move(1));
  up.disabled = index === 0;
  down.disabled = index === list.length - 1;
  return [up, down];
}

function renderRules(site, container) {
  container.textContent = '';
  if (!site.rules.length) {
    container.append(el('p', { className: 'hint', textContent: 'No rules — every link here uses the Other Links setting.' }));
  }
  site.rules.forEach((rule, index) => {
    container.append(el('div', { className: 'row' },
      enabledCheckbox(rule),
      patternInput(rule),
      actionSelect(rule),
      ...moveButtons(site.rules, index, rule, () => renderRules(site, container)),
      iconButton('✕', 'Delete', () => {
        if (!confirm(`Delete rule “${rule.pattern}”?`)) return;
        site.rules = site.rules.filter((r) => r !== rule);
        save();
        renderRules(site, container);
      }),
    ));
  });
}

function renderSiteCard(site, index) {
  const card = el('div', { className: 'card' });

  const header = el('div', { className: 'row card-header' },
    enabledCheckbox(site),
    patternInput(site),
    ...moveButtons(config.sites, index, site, renderSites),
    iconButton('✕', 'Delete', () => {
      if (!confirm(`Delete site “${site.pattern}” and its ${site.rules.length} rule(s)?`)) return;
      config.sites = config.sites.filter((s) => s !== site);
      save();
      renderSites();
    }),
  );

  const rules = el('div', { className: 'rules' });
  renderRules(site, rules);

  const addPattern = el('input', {
    type: 'text', className: 'pattern', placeholder: '*confirmationNumber=*',
    autocomplete: 'off', spellcheck: false,
  });
  const addAction = el('select', {},
    el('option', { value: 'new-tab', textContent: 'New Tab' }),
    el('option', { value: 'same-tab', textContent: 'Same Tab' }),
  );
  const addButton = el('button', { type: 'button', textContent: 'Add Rule' });
  const addRule = () => {
    const pattern = addPattern.value.trim();
    if (!pattern) return;
    site.rules.push({ id: uid('r'), pattern, action: addAction.value, enabled: true });
    addPattern.value = '';
    save();
    renderRules(site, rules);
  };
  addButton.addEventListener('click', addRule);
  addPattern.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addRule(); }
  });

  const otherSelect = el('select', {},
    el('option', { value: 'new-tab', textContent: 'New Tab', selected: site.defaultAction !== 'same-tab' }),
    el('option', { value: 'same-tab', textContent: 'Same Tab', selected: site.defaultAction === 'same-tab' }),
  );
  otherSelect.addEventListener('change', () => {
    site.defaultAction = otherSelect.value;
    save();
  });

  card.append(
    header,
    rules,
    el('div', { className: 'row add' }, addPattern, addAction, addButton),
    el('div', { className: 'row spaced' },
      el('span', { className: 'other-label', textContent: 'Other Links Open In' }),
      otherSelect,
    ),
  );
  return card;
}

function loadSamples() {
  const existing = new Set(config.sites.map((site) => site.pattern));
  for (const sample of LNT_SAMPLE_SITES) {
    if (!existing.has(sample.pattern)) config.sites.push(lntClone(sample));
  }
  save();
  renderSites();
}

function renderSites() {
  const list = document.getElementById('site-list');
  list.textContent = '';
  if (!config.sites.length) {
    const sampleButton = el('button', { type: 'button', textContent: 'Load Sample Rules' });
    sampleButton.addEventListener('click', loadSamples);
    list.append(
      el('p', {
        className: 'hint',
        textContent: 'No sites yet — the extension is inactive everywhere. '
          + 'Flip the toggle in the popup on any page, add a site below, or start from the sample ruleset:',
      }),
      el('div', { className: 'row' }, sampleButton),
    );
  }
  config.sites.forEach((site, index) => list.append(renderSiteCard(site, index)));
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
  let site = null;
  if (pageUrl) {
    site = lntSiteForPage(compiled, pageUrl);
    lines.push(site
      ? `Page is governed by the site card “${site.pattern}”.`
      : 'Page matches no active site — links there are left alone.');
  }
  if (linkUrl && site) {
    const rule = lntRuleForLink(site, linkUrl);
    const action = rule ? rule.action : site.defaultAction;
    const why = rule ? `rule “${rule.pattern}”` : 'the Other Links setting';
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
    config.sites.push({ id: uid('s'), pattern, enabled: true, defaultAction: 'new-tab', rules: [] });
    input.value = '';
    save();
    renderSites();
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

  document.getElementById('load-samples').addEventListener('click', loadSamples);

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Remove all sites and rules? This cannot be undone.')) return;
    config = normalize(lntClone(LNT_DEFAULT_CONFIG));
    save();
    renderAll();
  });
}

function renderAll() {
  renderSites();
  updateTester();
}

async function init() {
  config = normalize(await lntLoadConfig());
  document.getElementById('version').textContent =
    'Auto New Tab v' + chrome.runtime.getManifest().version;
  wireForms();
  renderAll();
}

init();
