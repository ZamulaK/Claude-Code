# Auto New Tab

A Microsoft Edge extension that opens links in a new tab on sites you choose.
Pick the sites and pages where it's active; on those pages, tapped links open
in a new tab unless one of your rules says otherwise. Works on desktop Edge
and Edge for Android, and on other Chromium-based browsers.

**Install:** Microsoft Edge Add-ons — *store link coming once the listing is
certified.*

## Using the extension

**The quickest way:** browse to a page where you want links to pop into new
tabs, tap the Auto New Tab icon, and flip the toggle on. That's it — the
extension creates a rule scoped to pages like that one. Flip the toggle off
anytime to disable it there (nothing is deleted; flipping it back restores
exactly what you had).

**Fine-tuning:** open **All Settings** from the popup. Configuration is a list
of **site cards** — each card is a place where the extension is active,
holding its own rules:

- **Site pattern** (card header) — where the card applies. `*` is a wildcard,
  so `https://example.com/account/*` covers that whole section. The first
  enabled card matching the page URL governs the page; pages matching no card
  are left entirely alone.
- **Rules** — when you tap a link on that site, the card's first matching rule
  (top to bottom) decides **New Tab** or **Same Tab**. "Same Tab" means the
  link is left untouched — the extension never forces anything.
- **Other Links Open In** — the card's default for links matching no rule.

Changes save automatically and apply immediately — no reload needed. The
**Try It** section lets you paste a page URL and a link URL to see exactly
which rule would fire. **Backup & Reset** exports/imports your settings as
JSON, **Load Sample Rules** adds the author's ruleset (hotel-loyalty pages
and Google search) as a starting point, and **Remove All Rules** starts over.
A fresh install begins with no rules at all — the extension does nothing
until you enable it somewhere.

Settings are stored in your browser's extension sync storage, so signed-in
browsers carry them between your devices. The extension collects no data and
makes no network requests — see [PRIVACY.md](PRIVACY.md).

## Tips & known quirks

- The version you're running is shown at the bottom of the popup and the
  settings page.
- On some Android browsers the popup opens as a bottom sheet with an
  "open in tab" control in its corner — that lands on the settings page.
- Links that a site's own JavaScript intercepts (single-page-app routers)
  can't be forced into a new tab; this is a browser limitation.
- A link must match the *whole* pattern: use `*confirmationNumber=*` to match
  text anywhere in a URL, and a trailing `*` for prefixes.

## Support

Questions, bugs, or ideas: please
[open an issue](https://github.com/ZamulaK/Claude-Code/issues) — include the
version number from the bottom of the settings page, your browser, and (for
rule questions) the page URL and link URL involved. No guarantees, but issues
are read.

## For developers

Plain HTML/JS/CSS, Manifest V3, no build step:

- `manifest.json` — MV3 manifest (`storage` + `activeTab` permissions)
- `common.js` — config model, wildcard matching, storage helpers (shared)
- `content.js` — a single delegated capture-phase click listener that decides
  at click time whether the clicked link gets `target="_blank"` +
  `rel="noopener"`; nothing runs until a link is clicked
- `options.html` / `options.js` — settings UI · `popup.html` / `popup.js` —
  toolbar popup · `styles.css` — shared styles (layout lives on an inner
  wrapper because some mobile browsers override popup `body` styles)
- `test/run-tests.js` — unit tests for the rule engine (`node test/run-tests.js`)
- `pack.sh` — builds the store-upload zip into `dist/`

Local testing: `edge://extensions` → Developer mode → **Load unpacked** →
select this folder. CI syntax-checks the code, runs the tests, and uploads
the built zip as an artifact on every push.

## History

Auto New Tab began as a Tampermonkey userscript. It was rebuilt as a proper
extension because userscript managers can no longer inject on Edge for
Android — the Manifest V3 rules require a developer-mode toggle that mobile
Edge can't reach ([Tampermonkey issue #2241](https://github.com/Tampermonkey/tampermonkey/issues/2241)).
