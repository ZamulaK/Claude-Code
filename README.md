# Auto New Tab

Microsoft Edge extension that opens links in a new tab on sites you choose.
Started as a Tampermonkey userscript for hotel-loyalty and search sites.

## Contents

- [`auto-new-tab/`](auto-new-tab/) — Microsoft Edge (Manifest
  V3) extension that opens links in a new tab on sites you choose, configured
  through a built-in settings page with wildcard URL rules (add/edit/delete,
  first-match-wins ordering) and a one-tap "add this site" toolbar popup. Built
  as a standalone extension because Tampermonkey userscripts can no longer
  inject on Edge for Android (the required developer-mode toggle isn't reachable
  there). See its [README](auto-new-tab/README.md) for install and
  Edge Add-ons store publishing instructions.

## Development

- Load the extension unpacked via `edge://extensions` (Developer mode → Load
  unpacked) for local testing.
- `auto-new-tab/pack.sh` builds the store-uploadable zip into
  `auto-new-tab/dist/`.
- CI validates `manifest.json` and `content.js` and uploads the built zip as a
  workflow artifact on every push.
