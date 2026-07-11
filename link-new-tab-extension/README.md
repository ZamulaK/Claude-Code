# Link New Tab | Auto — Edge extension

A standalone Microsoft Edge (Manifest V3) extension port of the "Link New Tab | Auto"
Tampermonkey userscript. It forces links to open in a new tab on:

- `https://www.marriott.com/loyalty/findReservationList.mi*`
- `https://www.hilton.com/en/hilton-honors/guest/*`
- `https://www.ihg.com/rewardsclub/us/en/account-mgmt/staysevents*`
- `https://www.google.com/search*`

## Why an extension instead of Tampermonkey?

Since Tampermonkey 5.3.x, Chromium's Manifest V3 rules require the browser's
**Developer mode** (or the "Allow User Scripts" toggle) to be enabled before any
userscript can be injected. On desktop Edge you can flip that switch on
`edge://extensions` — but Edge for Android cannot open `edge://extensions`, so
Tampermonkey silently stops injecting scripts there
([Tampermonkey issue #2241](https://github.com/Tampermonkey/tampermonkey/issues/2241)).

A regular extension content script does **not** need that toggle, so packaging the
script as its own extension restores the behavior on Android.

## What changed from the userscript

The URL rules are the same (Hilton activity links still stay in the same tab,
confirmation-number links always get a new tab), but the implementation is
different: instead of scanning every `<a>` on the page and re-scanning on timers
and click handlers, a single delegated capture-phase click listener decides at
click time whether the clicked link should get `target="_blank"`. That means:

- **No missed links.** Content added by pagination, toggles, or in-page views is
  covered automatically — the decision happens on the click, not on a pre-pass.
- **No wasted work.** Nothing runs until you actually tap a link.
- **Cleaner rules.** URL checks use parsed `URL` objects (hostname, pathname,
  query params) instead of substring matching on the raw href, declared in two
  small rule lists (`KEEP_SAME_TAB` / `OPEN_NEW_TAB`) that are easy to extend.
- **`rel="noopener"`** is added alongside `target="_blank"` so the opened page
  can't script the opener tab.

## Install on desktop Edge (for testing)

1. Open `edge://extensions`, enable **Developer mode**.
2. Click **Load unpacked** and select this `link-new-tab-extension/` folder.

## Install on Edge for Android

Extension sideloading currently requires **Edge Canary** for Android
(from Google Play). Stable Edge only installs extensions curated in the mobile
Add-ons store.

1. **Pack the extension into a `.crx` on your desktop:**
   - Open desktop Edge → `edge://extensions` → enable **Developer mode**.
   - Click **Pack extension**, choose this `link-new-tab-extension/` folder,
     leave the key field empty, and click **Pack extension**.
   - This produces `link-new-tab-extension.crx` (and a `.pem` key — keep the `.pem`
     if you want future updates to keep the same extension identity).
2. **Copy the `.crx` to your phone** (Drive, email, USB, etc.).
3. **Unlock developer options in Edge Canary on Android:**
   - Menu (☰) → **Settings** → **About Microsoft Edge** → tap the build/version
     number **5 times**.
4. **Sideload it:**
   - Settings → **Developer options** → **Extension install by crx** → pick the
     `.crx` file you copied over.
5. Open one of the matched sites and verify links open in new tabs.

> Note: Edge Canary updates frequently and developer options occasionally move.
> If "Extension install by crx" is missing, update Canary and re-check
> Settings → Developer options.

### Alternative: publish to the Edge Add-ons store

If you'd rather not re-sideload after Canary updates, you can publish the extension
(privately/unlisted) to the [Edge Add-ons developer dashboard](https://partner.microsoft.com/dashboard/microsoftedge),
then use **Developer options → Extension install by ID** on Android with the ID from
the store listing URL. `pack.sh` builds the store-upload zip.

## Files

- `manifest.json` — MV3 manifest with the same match patterns as the userscript
- `content.js` — the ported script
- `icons/` — extension icons
- `pack.sh` — builds `dist/link-new-tab-extension.zip` for store upload
