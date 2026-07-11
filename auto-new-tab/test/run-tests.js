// Unit tests for the config model in common.js. Run with: node test/run-tests.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'common.js'), 'utf8');
const context = vm.createContext({ console });
const api = vm.runInContext(
  src + '\n;({ LNT_DEFAULT_CONFIG, lntCompilePattern, lntCompileConfig, lntIsActiveOn, lntRuleForLink, lntActionForLink })',
  context,
);

const compiled = api.lntCompileConfig(api.LNT_DEFAULT_CONFIG);
const active = (url) => api.lntIsActiveOn(compiled, url);
const action = (url) => api.lntActionForLink(compiled, url);

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

check('hostname matching is case-insensitive', () => {
  const re = api.lntCompilePattern('https://www.Example.com/*');
  assert(re.test('https://www.example.com/page'));
});

// --- default config: site activation (the userscript's @match lines) ---

check('active on the four original pages', () => {
  assert(active('https://www.marriott.com/loyalty/findReservationList.mi?x=1'));
  assert(active('https://www.hilton.com/en/hilton-honors/guest/points/'));
  assert(active('https://www.ihg.com/rewardsclub/us/en/account-mgmt/staysevents'));
  assert(active('https://www.google.com/search?q=hotels'));
});

check('inactive elsewhere', () => {
  assert(!active('https://www.google.com/maps'));
  assert(!active('https://www.marriott.com/'));
  assert(!active('https://example.com/'));
});

// --- default config: link actions (the userscript's if/else logic) ---

check('external links open in a new tab', () => {
  assert.equal(action('https://example.com/deal'), 'new-tab');
  assert.equal(action('https://www.hilton.com/en/book/reservation/'), 'new-tab');
});

check('marriott and google-search links stay put', () => {
  assert.equal(action('https://www.marriott.com/reservation/lookup.mi'), 'same-tab');
  assert.equal(action('https://www.google.com/search?q=next+page'), 'same-tab');
});

check('confirmationNumber links open in a new tab even on marriott', () => {
  assert.equal(action('https://www.marriott.com/reservation/review.mi?confirmationNumber=123'), 'new-tab');
});

check('hilton activity links stay put, beating the confirmation rule by order', () => {
  assert.equal(action('https://www.hilton.com/en/hilton-honors/guest/activity/'), 'same-tab');
  assert.equal(action('https://www.hilton.com/en/hilton-honors/guest/activity/?confirmationNumber=9'), 'same-tab');
});

// --- rule mechanics ---

check('first matching rule wins', () => {
  const cfg = api.lntCompileConfig({
    defaultAction: 'same-tab',
    sites: [],
    linkRules: [
      { pattern: '*special*', action: 'new-tab', enabled: true },
      { pattern: 'https://a.com/*', action: 'same-tab', enabled: true },
    ],
  });
  assert.equal(api.lntActionForLink(cfg, 'https://a.com/special'), 'new-tab');
  assert.equal(api.lntActionForLink(cfg, 'https://a.com/plain'), 'same-tab');
});

check('disabled rules and sites are skipped', () => {
  const cfg = api.lntCompileConfig({
    defaultAction: 'new-tab',
    sites: [{ pattern: 'https://a.com/*', enabled: false }],
    linkRules: [{ pattern: '*x*', action: 'same-tab', enabled: false }],
  });
  assert(!api.lntIsActiveOn(cfg, 'https://a.com/page'));
  assert.equal(api.lntActionForLink(cfg, 'https://b.com/x'), 'new-tab');
});

check('unmatched links use defaultAction; invalid defaults coerce to new-tab', () => {
  const cfg = api.lntCompileConfig({ defaultAction: 'bogus', sites: [], linkRules: [] });
  assert.equal(api.lntActionForLink(cfg, 'https://a.com/'), 'new-tab');
});

check('blank and whitespace-only patterns are ignored', () => {
  const cfg = api.lntCompileConfig({
    defaultAction: 'same-tab',
    sites: [{ pattern: '   ', enabled: true }],
    linkRules: [],
  });
  assert(!api.lntIsActiveOn(cfg, 'https://a.com/'));
});

console.log(`\n${passed} tests passed`);
