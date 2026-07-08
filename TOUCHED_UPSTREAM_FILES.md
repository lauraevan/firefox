# Upstream files modified by this fork

Merge checklist: these are the only upstream files we edit. Everything else
we ship lives in new directories (see BUILD_PLAN.md).

| File | Change |
| --- | --- |
| `browser/app/profile/firefox.js` | Added `extensions.activeThemeID` default (Aurora theme) and `browser.aurora.*` prefs |
| `browser/components/BrowserGlue.sys.mjs` | Lazy getter + `BuiltInThemes.maybeInstallActiveBuiltInTheme()` call in `_beforeUIStartup` |
| `browser/themes/BuiltInThemeConfig.sys.mjs` | Registered `firefox-aurora@mozilla.org` and `firefox-aurora-glass@mozilla.org` entries |
| `browser/themes/addons/jar.mn` | Packaged `aurora/` and `aurora-glass/` theme files |
| `browser/themes/shared/browser-shared.css` | One `@import` for `aurora-skin.css` |
| `browser/themes/shared/jar.inc.mn` | Packaged `aurora-skin.css` |

New directories/files (no merge cost):

- `browser/themes/addons/aurora/` and `browser/themes/addons/aurora-glass/` (built-in themes)
- `browser/themes/shared/aurora-skin.css` (pref-gated effects and Liquid Glass layer)
