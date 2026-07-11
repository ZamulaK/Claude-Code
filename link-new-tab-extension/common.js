// Shared config model, wildcard matching, and storage helpers.
// Loaded by the content script, the options page, and the popup.

'use strict';

const LNT_STORAGE_KEY = 'config';

// Seeded on first run; reproduces the behavior of the original userscript.
const LNT_DEFAULT_CONFIG = {
  version: 1,
  defaultAction: 'new-tab',
  sites: [
    { id: 's-marriott', pattern: 'https://www.marriott.com/loyalty/findReservationList.mi*', enabled: true },
    { id: 's-hilton', pattern: 'https://www.hilton.com/en/hilton-honors/guest/*', enabled: true },
    { id: 's-ihg', pattern: 'https://www.ihg.com/rewardsclub/us/en/account-mgmt/staysevents*', enabled: true },
    { id: 's-google', pattern: 'https://www.google.com/search*', enabled: true },
  ],
  linkRules: [
    { id: 'r-hilton-activity', pattern: 'https://www.hilton.com/en/hilton-honors/guest/activity/*', action: 'same-tab', enabled: true },
    { id: 'r-confirmation', pattern: '*confirmationNumber=*', action: 'new-tab', enabled: true },
    { id: 'r-marriott', pattern: 'https://www.marriott.com/*', action: 'same-tab', enabled: true },
    { id: 'r-google-search', pattern: 'https://www.google.com/search*', action: 'same-tab', enabled: true },
  ],
};

// Userscript-style wildcard: '*' matches anything, everything else is literal.
// The pattern must match the whole URL, so use a trailing '*' for prefixes.
function lntCompilePattern(pattern) {
  const escaped = pattern
    .trim()
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp('^' + escaped + '$', 'i');
}

function lntCompileConfig(config) {
  const compile = (items) => (Array.isArray(items) ? items : [])
    .filter((item) => item && item.enabled !== false && item.pattern && item.pattern.trim())
    .map((item) => ({ ...item, regex: lntCompilePattern(item.pattern) }));
  return {
    defaultAction: config.defaultAction === 'same-tab' ? 'same-tab' : 'new-tab',
    sites: compile(config.sites),
    linkRules: compile(config.linkRules),
  };
}

function lntIsActiveOn(compiled, pageUrl) {
  return compiled.sites.some((site) => site.regex.test(pageUrl));
}

// First matching rule wins; null means the default action applies.
function lntRuleForLink(compiled, linkUrl) {
  return compiled.linkRules.find((rule) => rule.regex.test(linkUrl)) || null;
}

function lntActionForLink(compiled, linkUrl) {
  const rule = lntRuleForLink(compiled, linkUrl);
  return rule ? rule.action : compiled.defaultAction;
}

function lntStorageArea() {
  return chrome.storage.sync || chrome.storage.local;
}

async function lntLoadConfig() {
  try {
    const data = await lntStorageArea().get(LNT_STORAGE_KEY);
    if (data && data[LNT_STORAGE_KEY]) return data[LNT_STORAGE_KEY];
  } catch (e) {
    // fall through to defaults
  }
  return JSON.parse(JSON.stringify(LNT_DEFAULT_CONFIG));
}

async function lntSaveConfig(config) {
  await lntStorageArea().set({ [LNT_STORAGE_KEY]: config });
}
