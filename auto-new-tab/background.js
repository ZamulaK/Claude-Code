// Auto New Tab — badge service worker
//
// The content script reports whether the extension is active on its page,
// and the toolbar icon shows an ON badge for active tabs. Tab-specific badge
// text is cleared by the browser on navigation, and the content script
// re-reports on every page load, so the badge tracks the current page.

'use strict';

chrome.action.setBadgeBackgroundColor({ color: '#0b57d0' });
if (chrome.action.setBadgeTextColor) {
  chrome.action.setBadgeTextColor({ color: '#ffffff' });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.name === 'SetBadge' && sender.tab && sender.tab.id !== undefined) {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: message.active ? 'ON' : '',
    });
  }
});
