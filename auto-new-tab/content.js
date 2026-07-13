// Auto New Tab — content script
//
// A single delegated capture-phase click listener decides at click time
// whether the clicked link should open in a new tab, based on the user's
// site cards in chrome.storage. Nothing runs until a link is clicked, and
// links added dynamically are covered automatically. The site lookup happens
// per click against location.href, so single-page-app URL changes are handled.
//
// The script also reports the page's active state to the background service
// worker, which shows an ON badge on the toolbar icon for active tabs.

(function () {
  'use strict';

  let compiled = lntCompileConfig(LNT_DEFAULT_CONFIG);

  function updateBadge() {
    try {
      chrome.runtime.sendMessage({
        name: 'SetBadge',
        active: lntIsActiveOn(compiled, location.href),
      }).catch(() => {});
    } catch (e) {
      // extension context gone (e.g. right after an update); nothing to do
    }
  }

  lntLoadConfig().then((config) => {
    compiled = lntCompileConfig(config);
    updateBadge();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[LNT_STORAGE_KEY]) {
      compiled = lntCompileConfig(changes[LNT_STORAGE_KEY].newValue || LNT_DEFAULT_CONFIG);
      updateBadge();
    }
  });

  // Keep the badge in step with history/hash navigation and bfcache restores.
  window.addEventListener('popstate', updateBadge);
  window.addEventListener('hashchange', updateBadge);
  window.addEventListener('pageshow', updateBadge);

  document.addEventListener('click', (event) => {
    const site = lntSiteForPage(compiled, location.href);
    if (!site) return;

    // composedPath() finds the anchor even through shadow DOM.
    const link = event.composedPath().find(
      (node) => node instanceof HTMLAnchorElement && node.href,
    );
    if (!link) return;

    let url;
    try {
      url = new URL(link.href);
    } catch {
      return;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

    // 'same-tab' means "leave the link alone", never force anything.
    if (lntActionForLink(site, link.href) !== 'new-tab') return;

    link.target = '_blank';
    link.relList.add('noopener');
  }, true); // capture phase: runs before the page's own click handlers
})();
