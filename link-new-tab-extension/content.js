// Link New Tab | Auto — content script
//
// A single delegated capture-phase click listener decides at click time
// whether the clicked link should open in a new tab, based on the user's
// rules in chrome.storage. Nothing runs until a link is clicked, and links
// added dynamically are covered automatically. The site check happens per
// click against location.href, so single-page-app URL changes are handled.

(function () {
  'use strict';

  let compiled = lntCompileConfig(LNT_DEFAULT_CONFIG);

  lntLoadConfig().then((config) => {
    compiled = lntCompileConfig(config);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[LNT_STORAGE_KEY]) {
      compiled = lntCompileConfig(changes[LNT_STORAGE_KEY].newValue || LNT_DEFAULT_CONFIG);
    }
  });

  document.addEventListener('click', (event) => {
    if (!lntIsActiveOn(compiled, location.href)) return;

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
    if (lntActionForLink(compiled, link.href) !== 'new-tab') return;

    link.target = '_blank';
    link.relList.add('noopener');
  }, true); // capture phase: runs before the page's own click handlers
})();
