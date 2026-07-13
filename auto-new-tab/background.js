// Auto New Tab — badge service worker
//
// The content script reports whether the extension is active on its page,
// and the toolbar icon shows an ON badge for active tabs. Tab-specific badge
// text is cleared by the browser on navigation, and the content script
// re-reports on every page load, so the badge tracks the current page.

'use strict';

// Green so the badge stands out against the blue icon.
chrome.action.setBadgeBackgroundColor({ color: '#1e8e3e' });
if (chrome.action.setBadgeTextColor) {
  chrome.action.setBadgeTextColor({ color: '#ffffff' });
}

// On install or update, clear per-tab badges left by a previous version:
// content scripts already running in open tabs are orphaned by the update
// and cannot refresh their badge until the tab reloads.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.action.setBadgeText({ tabId: tab.id, text: '' }).catch(() => {});
      }
    }
  } catch (e) {
    // best effort
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message && message.name === 'SetBadge' && sender.tab && sender.tab.id !== undefined) {
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      // Single character: badge width scales with text length, and one
      // character renders at the same compact size as a count badge.
      text: message.active ? '\u2713' : '',
    });
  }
});
