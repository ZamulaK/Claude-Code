// Shared config model, wildcard matching, and storage helpers.
// Loaded by the content script, the options page, and the popup.

'use strict';

const LNT_STORAGE_KEY = 'config';

const lntClone = (value) => JSON.parse(JSON.stringify(value));

// Config schema v2: each active site is a card that owns its link rules and
// its own default action. The first enabled site whose pattern matches the
// page URL governs that page; within it, the first matching rule decides a
// tapped link, falling back to the site's defaultAction.
//
// Fresh installs start empty: the extension does nothing until the user
// enables a site via the popup toggle or the settings page.
const LNT_DEFAULT_CONFIG = {
  version: 2,
  sites: [],
};

// The author's ruleset (from the original userscript), offered on the
// settings page as a one-tap sample the user can choose to apply.
const LNT_SAMPLE_SITES = [
    {
      id: 's-marriott',
      pattern: 'https://www.marriott.com/loyalty/findReservationList.mi*',
      enabled: true,
      defaultAction: 'new-tab',
      rules: [
        { id: 'r-marriott-list', pattern: 'https://www.marriott.com/loyalty/findReservationList.mi*', action: 'same-tab', enabled: true },
      ],
    },
    {
      id: 's-hilton',
      pattern: 'https://www.hilton.com/en/hilton-honors/guest/*',
      enabled: true,
      defaultAction: 'new-tab',
      rules: [
        { id: 'r-hilton-activity', pattern: 'https://www.hilton.com/en/hilton-honors/guest/activity/*', action: 'same-tab', enabled: true },
      ],
    },
    {
      id: 's-ihg',
      pattern: 'https://www.ihg.com/rewardsclub/us/en/account-mgmt/staysevents*',
      enabled: true,
      defaultAction: 'new-tab',
      rules: [],
    },
    {
      id: 's-google',
      pattern: 'https://www.google.com/search*',
      enabled: true,
      defaultAction: 'new-tab',
      rules: [
        { id: 'r-google-search', pattern: 'https://www.google.com/search*', action: 'same-tab', enabled: true },
      ],
    },
];

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

// Upgrade any stored shape to schema v2. v1 configs had one flat linkRules
// list and one defaultAction shared across all sites.
function lntMigrateConfig(config) {
  if (!config || typeof config !== 'object' || !Array.isArray(config.sites)) {
    return lntClone(LNT_DEFAULT_CONFIG);
  }
  if (config.version === 2) return config;

  const defaultAction = config.defaultAction === 'same-tab' ? 'same-tab' : 'new-tab';
  const globalRules = (Array.isArray(config.linkRules) ? config.linkRules : [])
    .filter((rule) => rule && typeof rule.pattern === 'string');
  const seeded = new Map(LNT_SAMPLE_SITES.map((site) => [site.id, site]));
  const ruleEnabled = new Map(globalRules.map((rule) => [rule.id, rule.enabled !== false]));

  return {
    version: 2,
    sites: config.sites
      .filter((site) => site && typeof site.pattern === 'string')
      .map((site) => {
        const seed = seeded.get(site.id);
        if (seed) {
          // Known seeded site: give it its curated per-site rules, keeping any
          // pattern edits and enabled flags the user had made.
          return {
            ...lntClone(seed),
            pattern: site.pattern,
            enabled: site.enabled !== false,
            defaultAction,
            rules: lntClone(seed.rules).map((rule) => ({
              ...rule,
              enabled: ruleEnabled.has(rule.id) ? ruleEnabled.get(rule.id) : rule.enabled,
            })),
          };
        }
        // User-added site: carry over all old global rules; ones that can
        // never match this site's links are inert.
        return {
          id: site.id,
          pattern: site.pattern,
          enabled: site.enabled !== false,
          defaultAction,
          rules: lntClone(globalRules),
        };
      }),
  };
}

function lntCompileConfig(config) {
  const migrated = lntMigrateConfig(config);
  return {
    sites: (migrated.sites || [])
      .filter((site) => site && site.enabled !== false && site.pattern && site.pattern.trim())
      .map((site) => ({
        ...site,
        regex: lntCompilePattern(site.pattern),
        defaultAction: site.defaultAction === 'same-tab' ? 'same-tab' : 'new-tab',
        rules: (Array.isArray(site.rules) ? site.rules : [])
          .filter((rule) => rule && rule.enabled !== false && rule.pattern && rule.pattern.trim())
          .map((rule) => ({ ...rule, regex: lntCompilePattern(rule.pattern) })),
      })),
  };
}

// First enabled site whose pattern matches the page URL; null means the
// extension is inactive on this page.
function lntSiteForPage(compiled, pageUrl) {
  return compiled.sites.find((site) => site.regex.test(pageUrl)) || null;
}

function lntIsActiveOn(compiled, pageUrl) {
  return lntSiteForPage(compiled, pageUrl) !== null;
}

// First matching rule within the governing site; null means the site's
// default action applies.
function lntRuleForLink(site, linkUrl) {
  return site.rules.find((rule) => rule.regex.test(linkUrl)) || null;
}

function lntActionForLink(site, linkUrl) {
  const rule = lntRuleForLink(site, linkUrl);
  return rule ? rule.action : site.defaultAction;
}

function lntStorageArea() {
  return chrome.storage.sync || chrome.storage.local;
}

async function lntLoadConfig() {
  try {
    const data = await lntStorageArea().get(LNT_STORAGE_KEY);
    if (data && data[LNT_STORAGE_KEY]) return lntMigrateConfig(data[LNT_STORAGE_KEY]);
  } catch (e) {
    // fall through to defaults
  }
  return lntClone(LNT_DEFAULT_CONFIG);
}

async function lntSaveConfig(config) {
  await lntStorageArea().set({ [LNT_STORAGE_KEY]: config });
}
