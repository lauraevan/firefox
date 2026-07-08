# Upstream files modified by this fork

Merge checklist: these are the only upstream files we edit. Everything else
we ship lives in new directories (see BUILD_PLAN.md).

| File | Change |
| --- | --- |
| `browser/app/profile/firefox.js` | Added `extensions.activeThemeID` default (GX theme) and `browser.gx.skin.enabled` pref |
| `browser/components/BrowserGlue.sys.mjs` | Lazy getter + `BuiltInThemes.maybeInstallActiveBuiltInTheme()` call in `_beforeUIStartup` |
| `browser/themes/BuiltInThemeConfig.sys.mjs` | Registered `firefox-gx@mozilla.org` entry |
| `browser/themes/addons/jar.mn` | Packaged `gx/` theme files |
| `browser/themes/shared/browser-shared.css` | One `@import` for `gx-skin.css` |
| `browser/themes/shared/jar.inc.mn` | Packaged `gx-skin.css` |

New directories/files (no merge cost):

- `browser/themes/addons/gx/` (built-in GX theme)
- `browser/themes/shared/gx-skin.css` (pref-gated effects layer)
