// Unit tests for the config model in common.js. Run with: node test/run-tests.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'common.js'), 'utf8');
const context = vm.createContext({ console });
const api = vm.runInContext(
  src + '\n;({ LNT_DEFAULT_CONFIG, lntCompilePattern, lntCompileConfig, lntMigrateConfig, lntSiteForPage, lntIsActiveOn, lntRuleForLink, lntActionForLink })',
  context,
);

const compiled = api.lntCompileConfig(api.LNT_DEFAULT_CONFIG);
const active = (url) => api.lntIsActiveOn(compiled, url);
// Action for a link clicked while on a given page (null if page is inactive).
const action = (pageUrl, linkUrl) => {
  const site = api.lntSiteForPage(compiled, pageUrl);
  return site ? api.lntActionForLink(site, linkUrl) : null;
};

const MARRIOTT_PAGE = 'https://www.marriott.com/loyalty/findReservationList.mi?x=1';
const HILTON_PAGE = 'https://www.hilton.com/en/hilton-honors/guest/points/';
const GOOGLE_PAGE = 'https://www.google.com/search?q=hotels';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

// --- pattern compilation ---

check('wildcard matches anything including slashes', () => {
  const re = api.lntCompilePattern('https://a.com/x*');
  assert(re.test('https://a.com/x'));
  assert(re.test('https://a.com/x/y/z?q=1'));
  assert(!re.test('https://a.com/other'));
});

check('pattern without wildcard is an exact match', () => {
  const re = api.lntCompilePattern('https://a.com/x');
  assert(re.test('https://a.com/x'));
  assert(!re.test('https://a.com/x/y'));
});

check('regex special characters are literal', () => {
  const re = api.lntCompilePattern('https://a.com/p?q=1*');
  assert(re.test('https://a.com/p?q=123'));
  assert(!re.test('https://a.com/pXq=123'));
});

// --- default config: site activation (the userscript's @match lines) ---

check('active on the four original pages', () => {
  assert(active(MARRIOTT_PAGE));
  assert(active(HILTON_PAGE));
  assert(active('https://www.ihg.com/rewardsclub/us/en/account-mgmt/staysevents'));
  assert(active(GOOGLE_PAGE));
});

check('inactive elsewhere', () => {
  assert(!active('https://www.google.com/maps'));
  assert(!active('https://www.marriott.com/'));
  assert(!active('https://example.com/'));
});

// --- default config: per-site link actions (the userscript's if/else logic) ---

check('external links open in a new tab', () => {
  assert.equal(action(MARRIOTT_PAGE, 'https://example.com/deal'), 'new-tab');
  assert.equal(action(HILTON_PAGE, 'https://www.hilton.com/en/book/reservation/'), 'new-tab');
});

check('marriott internal links stay put on the marriott page', () => {
  assert.equal(action(MARRIOTT_PAGE, 'https://www.marriott.com/reservation/lookup.mi'), 'same-tab');
});

check('confirmationNumber links open in a new tab even for marriott', () => {
  assert.equal(action(MARRIOTT_PAGE, 'https://www.marriott.com/reservation/review.mi?confirmationNumber=123'), 'new-tab');
});

check('google search refinement links stay put on the search page', () => {
  assert.equal(action(GOOGLE_PAGE, 'https://www.google.com/search?q=next+page'), 'same-tab');
  assert.equal(action(GOOGLE_PAGE, 'https://example.com/result'), 'new-tab');
});

check('hilton activity links stay put on hilton pages', () => {
  assert.equal(action(HILTON_PAGE, 'https://www.hilton.com/en/hilton-honors/guest/activity/'), 'same-tab');
  assert.equal(action(HILTON_PAGE, 'https://www.hilton.com/en/hilton-honors/guest/activity/?confirmationNumber=9'), 'same-tab');
});

check('rules are scoped to their site card, not global', () => {
  const cfg = api.lntCompileConfig({
    version: 2,
    sites: [
      { pattern: 'https://a.com/*', enabled: true, defaultAction: 'same-tab', rules: [{ pattern: '*x*', action: 'new-tab', enabled: true }] },
      { pattern: 'https://b.com/*', enabled: true, defaultAction: 'same-tab', rules: [] },
    ],
  });
  const onA = api.lntSiteForPage(cfg, 'https://a.com/page');
  const onB = api.lntSiteForPage(cfg, 'https://b.com/page');
  assert.equal(api.lntActionForLink(onA, 'https://c.com/x'), 'new-tab');
  assert.equal(api.lntActionForLink(onB, 'https://c.com/x'), 'same-tab');
});

// --- rule mechanics ---

check('first matching site card governs; first matching rule wins', () => {
  const cfg = api.lntCompileConfig({
    version: 2,
    sites: [
      {
        pattern: 'https://a.com/*', enabled: true, defaultAction: 'same-tab',
        rules: [
          { pattern: '*special*', action: 'new-tab', enabled: true },
          { pattern: 'https://a.com/*', action: 'same-tab', enabled: true },
        ],
      },
      { pattern: 'https://a.com/sub/*', enabled: true, defaultAction: 'new-tab', rules: [] },
    ],
  });
  const site = api.lntSiteForPage(cfg, 'https://a.com/sub/page');
  assert.equal(site.pattern, 'https://a.com/*'); // first card wins
  assert.equal(api.lntActionForLink(site, 'https://a.com/special'), 'new-tab');
  assert.equal(api.lntActionForLink(site, 'https://a.com/plain'), 'same-tab');
});

check('disabled sites and rules are skipped', () => {
  const cfg = api.lntCompileConfig({
    version: 2,
    sites: [
      { pattern: 'https://a.com/*', enabled: false, defaultAction: 'new-tab', rules: [] },
      { pattern: 'https://b.com/*', enabled: true, defaultAction: 'new-tab', rules: [{ pattern: '*x*', action: 'same-tab', enabled: false }] },
    ],
  });
  assert(!api.lntIsActiveOn(cfg, 'https://a.com/page'));
  const site = api.lntSiteForPage(cfg, 'https://b.com/page');
  assert.equal(api.lntActionForLink(site, 'https://c.com/x'), 'new-tab');
});

check('invalid defaultAction coerces to new-tab; blank patterns are ignored', () => {
  const cfg = api.lntCompileConfig({
    version: 2,
    sites: [
      { pattern: 'https://a.com/*', enabled: true, defaultAction: 'bogus', rules: [{ pattern: '   ', action: 'same-tab', enabled: true }] },
    ],
  });
  const site = api.lntSiteForPage(cfg, 'https://a.com/page');
  assert.equal(site.rules.length, 0);
  assert.equal(api.lntActionForLink(site, 'https://c.com/'), 'new-tab');
});

// --- migration from schema v1 ---

check('v1 seeded config migrates to per-site cards with curated rules', () => {
  const v1 = {
    version: 1,
    defaultAction: 'new-tab',
    sites: [
      { id: 's-marriott', pattern: 'https://www.marriott.com/loyalty/findReservationList.mi*', enabled: true },
      { id: 's-google', pattern: 'https://www.google.com/search*', enabled: false },
    ],
    linkRules: [
      { id: 'r-confirmation', pattern: '*confirmationNumber=*', action: 'new-tab', enabled: false },
      { id: 'r-marriott', pattern: 'https://www.marriott.com/*', action: 'same-tab', enabled: true },
      { id: 'r-google-search', pattern: 'https://www.google.com/search*', action: 'same-tab', enabled: true },
    ],
  };
  const migrated = api.lntMigrateConfig(v1);
  assert.equal(migrated.version, 2);
  const marriott = migrated.sites.find((s) => s.id === 's-marriott');
  assert.deepEqual(marriott.rules.map((r) => r.id), ['r-confirmation', 'r-marriott']);
  assert.equal(marriott.rules[0].enabled, false); // user's disable preserved
  assert.equal(migrated.sites.find((s) => s.id === 's-google').enabled, false);
});

check('v1 user-added sites carry over the old global rules', () => {
  const v1 = {
    version: 1,
    defaultAction: 'same-tab',
    sites: [{ id: 's-custom', pattern: 'https://custom.com/*', enabled: true }],
    linkRules: [{ id: 'r-1', pattern: '*download*', action: 'new-tab', enabled: true }],
  };
  const migrated = api.lntMigrateConfig(v1);
  const custom = migrated.sites[0];
  assert.equal(custom.defaultAction, 'same-tab');
  assert.deepEqual(custom.rules.map((r) => r.id), ['r-1']);
});

check('v2 configs pass through migration untouched; garbage becomes defaults', () => {
  const v2 = { version: 2, sites: [{ id: 'x', pattern: 'https://a.com/*', enabled: true, defaultAction: 'new-tab', rules: [] }] };
  assert.strictEqual(api.lntMigrateConfig(v2), v2);
  assert.equal(api.lntMigrateConfig(null).sites.length, 4);
  assert.equal(api.lntMigrateConfig({ hello: 1 }).sites.length, 4);
});

console.log(`\n${passed} tests passed`);
