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
| `browser/confvars.sh` | Default branding directory now `browser/branding/aurora` |
| `browser/components/moz.build` | Added `aurora` to `DIRS` |
| `browser/components/preferences/preferences.js` | Added `aurora` group to the appearance pane |
| `browser/components/preferences/config/appearance.mjs` | One import of `config/aurora.mjs` |
| `browser/components/preferences/jar.mn` | Packaged `config/aurora.mjs` |
| `browser/locales/en-US/browser/preferences/preferences.ftl` | Appended Aurora settings strings |
| `browser/extensions/moz.build` | Conditional `ublock` dir |
| `browser/extensions/moz.configure` | `MOZ_UBLOCK_XPI` detection |

New directories/files (no merge cost):

- `browser/themes/addons/aurora/` and `browser/themes/addons/aurora-glass/` (built-in themes)
- `browser/themes/shared/aurora-skin.css` (pref-gated effects and Liquid Glass layer)
- `browser/components/aurora/` (wallpaper engine + bundled wallpapers)
- `browser/components/preferences/config/aurora.mjs` (settings group)
- `browser/extensions/ublock/` (uBlock Origin vendoring + packaging)
- `browser/branding/aurora/` (Aurora Browser branding)
