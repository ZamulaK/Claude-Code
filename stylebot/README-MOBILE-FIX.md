# Stylebot Mobile

A minimally patched copy of [Stylebot](https://github.com/ankit/stylebot) 3.1
(by Ankit Ahuja, open source) that makes the options page reachable on
Microsoft Edge for Android. For personal use — not for redistribution.

## The problem

Stylebot opens its options page with `chrome.runtime.openOptionsPage()`, which
routes through the browser's extension-details UI. On Edge for Android that
path is broken, so tapping "Options" in the popup silently does nothing and
the styles manager is unreachable.

## The patch (v3.1 → v3.1.1)

Both call sites now open `options/index.html` directly as a normal tab, which
works everywhere:

- `popup/index.js` — the Options menu item:
  `chrome.runtime.openOptionsPage()` → `chrome.tabs.create({url: chrome.runtime.getURL("options/index.html")})`
- `background/index.js` — the `"OpenOptionsPage"` message handler: same change.

Manifest changes:

- `name` → "Stylebot Mobile" and `version` → 3.1.3, to distinguish it
  from the store copy.
- Removed `key`, so this copy gets its own extension ID and can be installed
  alongside (or instead of) the store version without colliding with it.
- Removed `update_url`, so the store can never auto-update over the patch.
- Removed the store's `_metadata` signature folder (invalid after any edit).

Nothing else is modified.

## Install on Edge for Android

Pack this folder as a `.crx` (desktop Edge → `edge://extensions` → Developer
mode → Pack Extension), copy it to the phone, then Edge Canary/Dev →
Settings → Developer Options → Extension Install by CRX.

Because this copy has a new extension ID, it starts with empty settings: it
does not see styles saved by the store copy. Export styles from the store
copy first (desktop → Stylebot Options → Sync → Export), then import them on
the phone via the now-working options page. Remove or disable the store copy
to avoid both extensions styling the same pages.

## Caveats

- Stylebot 3.1 is Manifest V2. Edge still runs MV2 extensions (including this
  one), but Chromium is retiring MV2, so this is a stopgap with a shelf life.
  The long-term fix would be an MV3 build from Stylebot's upstream source.
- Tested in desktop Chromium: popup renders, Options opens the full styles
  manager in a new tab.
