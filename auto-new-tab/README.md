# Auto New Tab — Edge extension

A Microsoft Edge (Manifest V3) extension that opens links in a new tab on sites
you choose, with wildcard URL rules you manage yourself — no code changes needed
to add or remove sites. Works on desktop Edge and Edge for Android.

Originally a Tampermonkey userscript; rebuilt as an extension because userscript
managers can no longer inject on Edge for Android (the required developer-mode
toggle isn't reachable there — see
[Tampermonkey issue #2241](https://github.com/Tampermonkey/tampermonkey/issues/2241)).

## How it works

Configuration is a list of **site cards**, edited on the extension's settings
page (changes apply immediately, no reload needed). Each card says where the
extension is active and what happens to links tapped there:

- **Site pattern** — where the card applies. Patterns use `*` as a wildcard:
  `https://example.com/account/*`. The first enabled card matching the page
  URL governs that page; pages matching no card are left entirely alone.
- **Rules** — the card's first matching rule (top to bottom) decides whether a
  tapped link opens in a **New Tab** or **Same Tab** ("same tab" means the link
  is left alone, never forced).
- **Other Links Open In** — the card's default for links matching no rule.

Rules live inside their card, so a rule for one site can never leak onto
another. The toolbar popup shows the current page's path with an on/off
toggle — turning it off disables the matching card (reversibly), and turning
it on for a new page creates a card scoped to that page's path. Settings live
in `chrome.storage.sync`, so they ride Edge's sync between your devices; older
stored configs migrate to the card format automatically, and a first install
is pre-seeded with the original userscript's Marriott / Hilton / IHG / Google
cards.

Implementation: a single delegated capture-phase click listener sets
`target="_blank"` (plus `rel="noopener"`) at click time. Nothing runs until a
link is clicked, dynamically added links can't be missed, and the site lookup
runs against the live URL so single-page-app navigation is handled.

## Install for local testing (desktop Edge)

`edge://extensions` → enable **Developer mode** → **Load unpacked** → select this
folder.

## Recommended: publish to the Edge Add-ons store, install by ID on Android

This is the low-maintenance path: install once on the phone, and every version
you publish afterwards auto-updates — no re-sideloading after browser updates.

1. Register (free) for the Microsoft Edge program on
   [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Run `./pack.sh` and upload `dist/auto-new-tab.zip` as a new
   extension. Set **Visibility: Hidden** so it never appears in store search —
   it stays reachable only by direct link/ID.
3. After certification (up to 7 business days, usually much faster), copy the
   extension ID from the end of the store listing URL.
4. On the phone (Edge Dev or Canary): Settings → **About Microsoft Edge** → tap
   the version number 5 times → **Developer options** → **Extension install by
   ID** → paste the ID.
5. Future updates: bump `version` in `manifest.json`, `./pack.sh`, upload to
   Partner Center. Installed copies update automatically.

## Alternative: sideload a .crx (Edge Canary only)

For quick device testing without the store: desktop Edge → `edge://extensions` →
**Pack extension** on this folder (keep the generated `.pem`), copy the `.crx` to
the phone, then Edge Canary → Developer options → **Extension install by crx**.
Note you must re-sideload after code changes yourself.

## Development

- `npm` not required; plain HTML/JS/CSS.
- `node test/run-tests.js` — unit tests for the pattern/rule engine.
- `pack.sh` — builds the store-upload zip into `dist/`.
- CI syntax-checks the JS, runs the tests, and uploads the built zip as an
  artifact on every push.

## Files

- `manifest.json` — MV3 manifest (`storage` + `activeTab` permissions, content
  script on `http`/`https`)
- `common.js` — config model, wildcard matching, storage helpers (shared)
- `content.js` — the delegated click listener
- `options.html` / `options.js` — settings UI (sites, rules, tester, backup)
- `popup.html` / `popup.js` — one-tap "add this site" toolbar popup
- `styles.css` — shared styles, mobile-first with dark-mode support
- `test/run-tests.js` — unit tests
- `pack.sh` — zip builder
