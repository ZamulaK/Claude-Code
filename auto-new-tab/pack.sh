#!/usr/bin/env bash
# Build a store-uploadable zip of the extension into dist/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/auto-new-tab.zip
zip -r dist/auto-new-tab.zip \
  manifest.json \
  common.js content.js \
  options.html options.js \
  popup.html popup.js \
  styles.css \
  icons
echo "Built dist/auto-new-tab.zip"
