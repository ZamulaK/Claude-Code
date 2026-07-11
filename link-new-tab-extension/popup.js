'use strict';

function popupUid(prefix) {
  return prefix + '-' + crypto.randomUUID().slice(0, 8);
}

async function init() {
  const status = document.getElementById('status');
  const addSite = document.getElementById('add-site');
  const addPage = document.getElementById('add-page');

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

  const sitePattern = url.origin + '/*';
  const pagePattern = url.origin + url.pathname + '*';

  let config = await lntLoadConfig();

  const refresh = () => {
    const compiled = lntCompileConfig(config);
    status.textContent = lntIsActiveOn(compiled, url.href)
      ? '✓ Active on this page'
      : 'Not active on this page';
    const patterns = config.sites.map((s) => s.pattern);
    addSite.hidden = patterns.includes(sitePattern);
    addPage.hidden = patterns.includes(pagePattern) || pagePattern === sitePattern;
  };

  const wire = (button, pattern) => {
    button.addEventListener('click', async () => {
      config.sites.push({ id: popupUid('s'), pattern, enabled: true });
      await lntSaveConfig(config);
      refresh();
    });
  };

  addSite.textContent = 'Open links in new tab on ' + url.hostname;
  addPage.textContent = 'Only on pages like this one';
  wire(addSite, sitePattern);
  wire(addPage, pagePattern);

  refresh();
}

init();
