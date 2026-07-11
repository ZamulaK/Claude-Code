#!/usr/bin/env bash
# Build a store-uploadable zip of the extension into dist/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/link-new-tab-extension.zip
zip -r dist/link-new-tab-extension.zip \
  manifest.json \
  common.js content.js \
  options.html options.js \
  popup.html popup.js \
  styles.css \
  icons
echo "Built dist/link-new-tab-extension.zip"
