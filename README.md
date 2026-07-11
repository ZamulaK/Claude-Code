# Link New Tab | Auto

Browser extension (and formerly Tampermonkey userscript) tooling for opening
selected links in a new tab on hotel-loyalty and search sites.

## Contents

- [`link-new-tab-extension/`](link-new-tab-extension/) — Microsoft Edge (Manifest
  V3) extension that opens links in a new tab on sites you choose, configured
  through a built-in settings page with wildcard URL rules (add/edit/delete,
  first-match-wins ordering) and a one-tap "add this site" toolbar popup. Built
  as a standalone extension because Tampermonkey userscripts can no longer
  inject on Edge for Android (the required developer-mode toggle isn't reachable
  there). See its [README](link-new-tab-extension/README.md) for install and
  Edge Add-ons store publishing instructions.

## Development

- Load the extension unpacked via `edge://extensions` (Developer mode → Load
  unpacked) for local testing.
- `link-new-tab-extension/pack.sh` builds the store-uploadable zip into
  `link-new-tab-extension/dist/`.
- CI validates `manifest.json` and `content.js` and uploads the built zip as a
  workflow artifact on every push.
