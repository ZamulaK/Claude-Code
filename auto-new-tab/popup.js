'use strict';

function popupUid(prefix) {
  return prefix + '-' + crypto.randomUUID().slice(0, 8);
}

async function init() {
  const status = document.getElementById('status');
  const row = document.getElementById('site-row');
  const label = document.getElementById('site-label');
  const toggle = document.getElementById('site-toggle');

  // Open options.html as a plain tab instead of chrome.runtime.openOptionsPage():
  // on Edge for Android the latter routes through the extension-details page,
  // which is broken (blank) there, so the call silently does nothing.
  document.getElementById('open-options').addEventListener('click', async () => {
    const optionsUrl = chrome.runtime.getURL('options.html');
    try {
      await chrome.tabs.create({ url: optionsUrl });
      window.close();
    } catch (e) {
      window.open(optionsUrl);
    }
  });

  let url = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) url = new URL(tab.url);
  } catch (e) {
    // leave url null
  }
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    status.textContent = 'This page can’t be configured.';
    return;
  }

  const config = await lntLoadConfig();

  // Site entries whose pattern matches the current page, enabled or not.
  const matchingSites = () => config.sites.filter(
    (site) => site.pattern && lntCompilePattern(site.pattern).test(url.href),
  );

  const refresh = () => {
    const active = matchingSites().some((site) => site.enabled !== false);
    status.textContent = active ? '✓ Active on this page' : 'Not active on this page';
    toggle.checked = active;
  };

  label.textContent = 'Open links in new tab on ' + url.hostname;
  row.hidden = false;

  // The toggle disables matching site entries rather than deleting them, so
  // flipping it back restores exactly what was there before.
  toggle.addEventListener('change', async () => {
    const matched = matchingSites();
    if (toggle.checked) {
      if (matched.length) {
        matched.forEach((site) => { site.enabled = true; });
      } else {
        config.sites.push({ id: popupUid('s'), pattern: url.origin + '/*', enabled: true });
      }
    } else {
      matched.forEach((site) => { site.enabled = false; });
    }
    await lntSaveConfig(config);
    refresh();
  });

  refresh();
}

init();
