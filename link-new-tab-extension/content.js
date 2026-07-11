// Link New Tab | Auto — content script
//
// Instead of scanning and rewriting every <a> on the page (and re-scanning as
// the page changes), a single delegated capture-phase click listener decides at
// click time whether the link should open in a new tab. Links added by
// pagination, toggles, or in-page views are covered automatically because the
// decision happens on the click itself, not on a pre-pass over the DOM.

(function () {
  'use strict';

  // Rules receive a parsed URL object. A link opens in a new tab when no
  // KEEP_SAME_TAB rule matches and at least one OPEN_NEW_TAB rule does.

  const KEEP_SAME_TAB = [
    // Hilton activity links load in-page detail views.
    (url) => url.hostname === 'www.hilton.com'
      && url.pathname.startsWith('/en/hilton-honors/guest/activity/'),
  ];

  const OPEN_NEW_TAB = [
    // Reservation-confirmation links always get a new tab.
    (url) => url.searchParams.has('confirmationNumber'),
    // Anything that navigates away from the list/search pages themselves.
    (url) => url.hostname !== 'www.marriott.com'
      && !(url.hostname === 'www.google.com' && url.pathname === '/search'),
  ];

  function shouldOpenInNewTab(href) {
    let url;
    try {
      url = new URL(href, location.href);
    } catch {
      return false;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    if (KEEP_SAME_TAB.some((rule) => rule(url))) return false;
    return OPEN_NEW_TAB.some((rule) => rule(url));
  }

  document.addEventListener('click', (event) => {
    // composedPath() finds the anchor even through shadow DOM.
    const link = event.composedPath().find(
      (node) => node instanceof HTMLAnchorElement && node.href,
    );
    if (!link || !shouldOpenInNewTab(link.href)) return;
    link.target = '_blank';
    link.relList.add('noopener');
  }, true); // capture phase: runs before the page's own click handlers
})();
