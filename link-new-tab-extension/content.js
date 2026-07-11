// Link New Tab | Auto — content script
//
// Ported from the Tampermonkey userscript of the same name. Instead of the
// userscript's setTimeout/click-handler re-runs, a MutationObserver reprocesses
// links whenever the page adds or changes them (pagination, toggles, Hilton
// activity views, etc.), so dynamically loaded content is always covered.

(function () {
  'use strict';

  var HILTON_ACTIVITY = 'https://www.hilton.com/en/hilton-honors/guest/activity/';

  function processLink(a) {
    var href = a.href || '';
    if (!href) return;

    // Hilton activity links stay in the same tab (they load in-page content
    // that the observer will then pick up).
    if (href.indexOf(HILTON_ACTIVITY) === 0) return;

    if (
      (href.indexOf('https://www.marriott.com/') === -1 &&
        href.indexOf('https://www.google.com/search') === -1) ||
      href.indexOf('confirmationNumber=') !== -1
    ) {
      a.setAttribute('target', '_blank');
    }
  }

  function processAll() {
    document.querySelectorAll('a[href]').forEach(processLink);
  }

  // Initial pass, plus late passes for slow single-page-app rendering.
  processAll();
  setTimeout(processAll, 2000);
  setTimeout(processAll, 6000);

  // Reprocess (debounced) whenever the DOM changes or an href is rewritten.
  var scheduled = null;
  var observer = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = setTimeout(function () {
      scheduled = null;
      processAll();
    }, 300);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href']
  });
})();
