#!/usr/bin/env bash
# Build a store-uploadable zip of the extension into dist/.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/link-new-tab-extension.zip
zip -r dist/link-new-tab-extension.zip manifest.json content.js icons
echo "Built dist/link-new-tab-extension.zip"
