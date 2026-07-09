# Build Plan: premium customizable Firefox fork with bundled uBlock Origin

Direction (updated): not an Opera GX clone. The goal is a premium,
customizable browser — wallpaper-first theming, unique layout with tasteful
custom animations, an optional Liquid Glass mode toggled from settings, and
built-in uBlock Origin for privacy. The internal codename for the theming
system is "aurora".

Goal: an Opera GX–inspired browser built on Firefox source, with user-selectable
chrome wallpapers, an optional "Liquid Glass" translucency mode, a polished
settings experience, and uBlock Origin enabled out of the box — while staying
mergeable against upstream mozilla-central.

Everything below references real files in this tree; all the infrastructure
needed already exists upstream.

---

## Guiding principle: stay additive

The fork stays cheap to update as long as changes are:

1. **New directories** (your themes, your extension, your settings pane) — zero
   merge cost.
2. **One-line registrations** in upstream extension points (`DIRS` lists,
   `jar.mn`, config maps) — trivial merge cost.
3. **New prefs** appended to `browser/app/profile/firefox.js` — trivial.

What to avoid: editing `browser/base/content/browser.xhtml` markup, tabbrowser
internals, or rewriting rules inside upstream CSS files. Those churn every
release and merges become painful. Nearly everything GX-like is achievable
without touching them.

Track upstream by merging release tags (or ESR tags for a slower, calmer
cadence). Keep a `TOUCHED_UPSTREAM_FILES.md` listing every upstream file you
modified so merges are a checklist, not archaeology.

---

## Phase 1 — Theming architecture

Firefox theming is three stackable layers. Use all three, in this order of
preference.

### Layer A: Built-in WebExtension themes (safe, zero merge risk)

Firefox ships its default themes as in-tree WebExtension themes:

- `browser/themes/addons/{light,dark,alpenglow,...}/` — each is just a
  `manifest.json` + images.
- Registered in `browser/themes/BuiltInThemeConfig.sys.mjs` (a Map of theme ID
  to `resource://builtin-themes/...` path).
- Packaged via `browser/themes/addons/jar.mn`.
- Built-in themes are **signing-exempt** and update with the browser.

The static theme manifest already supports almost the whole GX look:

- `theme.colors.*` — frame, toolbar, tabs, urlbar, popups, sidebar, new tab
  (see `browser/themes/addons/alpenglow/manifest.json` for a full example).
- `theme.images.additional_backgrounds` + `properties.additional_backgrounds_
  {alignment,tiling,size}` — **this is the chrome wallpaper system, for free.**
  Alpenglow uses it for its corner "noodles"; a full-bleed wallpaper is the
  same mechanism with a large image.
- `theme_experiment` (in the manifest) can map extra CSS variables if the
  built-in property set isn't enough. `browser/themes/ThemeVariableMap.sys.mjs`
  shows how theme properties become `--lwt-*` CSS variables on the chrome
  document.

**Plan:**
1. Create `browser/themes/addons/aurora/` (and a few accent variants) as
   static themes. Register in `BuiltInThemeConfig.sys.mjs` and
   `browser/themes/addons/jar.mn`. Set the default theme pref
   (`extensions.activeThemeID`) in `browser/app/profile/firefox.js`.
2. For **user-selectable wallpaper + accent color** (arbitrary combinations,
   user-supplied images), static variants don't scale. Add a small in-tree
   module, e.g. `browser/components/auroratheme/AuroraThemeManager.sys.mjs`, that
   composes a theme object from prefs (wallpaper path, accent color, mode) and
   applies it the same way dynamic themes do. Two implementation options:
   - a built-in WebExtension using the `theme.update()` API (the Firefox Color
     approach — simplest, uses only public API), or
   - a JSM driving `LightweightThemeManager`/`LightweightThemeConsumer`
     directly (more power, slightly more coupling).
   Start with the extension approach; it's the least invasive. User-supplied
   wallpapers get copied into the profile and referenced by `file://`/
   `moz-extension://` URL.

### Layer B: In-tree "skin" CSS, gated on prefs (moderate risk, high payoff)

Theme API can't do animation, glow effects, or reshape elements. For that, add
your own stylesheet:

- New file `browser/themes/shared/aurora-skin.css`, registered in
  `browser/themes/shared/jar.mn` and imported from one place
  (e.g. appended to the imports in `browser-shared.css` — a one-line diff).
- Gate every rule on your pref using the in-tree pref media query, which
  upstream itself uses heavily:

  ```css
  @media -moz-pref("browser.aurora.skin.enabled") {
    .tabbrowser-tab:hover { /* glow, transitions, ... */ }
  }
  ```

  (See `browser/themes/shared/browser-shared.css:84` for upstream usage.)

- **Rule of thumb for merge safety:** override CSS *variables* (`--toolbar-
  bgcolor`, `--tab-*`, `--arrowpanel-*`, `--urlbar-*`) and add new rules keyed
  on stable IDs/classes (`#navigator-toolbox`, `.tabbrowser-tab`, `#urlbar`).
  Never fork/duplicate upstream rule bodies.

This is where "animated/reactive elements" live: tab hover glows, loading
pulses, accent-colored focus rings, transitions on toolbar buttons. Honor
`prefers-reduced-motion`.

### Layer C: Deep changes (avoid unless necessary)

Reshaping browser chrome markup, C++ widget changes, new toolbar surfaces.
Only Liquid Glass needs a toe in this water (below). Everything else in the GX
aesthetic is Layers A+B.

### Liquid Glass mode

Ship as another built-in theme + a pref-gated section of the skin CSS:

- Theme sets `frame`/`toolbar` colors to semi-transparent values.
- Skin CSS (gated on `browser.aurora.liquidGlass.enabled`) applies translucency and
  blur to chrome surfaces. In-content panels/menus can use `backdrop-filter`.
- **macOS:** the widget layer already supports vibrancy —
  `widget/cocoa/VibrancyManager.{h,mm}` manages vibrant window regions (used
  for the titlebar and menus today). True behind-window "glass" for the whole
  toolbar area means extending the vibrancy regions there: a real but contained
  `widget/cocoa` patch. Do this as a stretch goal; start with the CSS-level
  translucency which already looks good with a wallpaper behind the toolbar.
- The pref `browser.tabs.allow_transparent_browser`
  (`browser/app/profile/firefox.js:1253`) exists for transparent content areas
  if you want the effect to extend into pages like the new tab.
- **Windows:** true Mica/Acrylic needs widget/windows work; defer. CSS
  translucency-over-wallpaper is the portable v1.

**Deliverables for Phase 1**
- [x] `browser/themes/addons/aurora/` built-in theme, registered
- [x] `browser/components/aurora/AuroraThemeManager.sys.mjs` wallpaper + accent engine
- [x] `browser/themes/shared/aurora-skin.css` with pref-gated effects
- [x] `browser.aurora.*` prefs in `firefox.js` (Aurora theme is the default)
- [x] Liquid Glass theme variant + CSS (settings-toggled); macOS vibrancy as stretch goal

---

## Phase 2 — Settings page

Important correction to the premise: `about:preferences` is **not React**, and
new Firefox front-end work doesn't use React either (only legacy surfaces like
newtab do). The current stack — and what you should build on — is:

- **Lit-based web components** from the design system:
  `toolkit/content/widgets/moz-*` (`moz-toggle`, `moz-radio-group`,
  `moz-input-color`, `moz-card`, `moz-button-group`, `moz-page-nav`, ...).
- A **declarative settings framework** already in this tree:
  `browser/components/preferences/config/*.mjs` — each pane is a config module
  (see `appearance.mjs` for the closest analog to what you need), wired
  through `SettingPaneManager.mjs` / `SettingGroupManager.mjs` and rendered by
  the `setting-pane` / `setting-group` / `setting-control` widgets in
  `browser/components/preferences/widgets/`.

**Plan:**
1. Add a **"Theme" category** to about:preferences:
   - New config module `browser/components/preferences/config/auroraTheme.mjs`
     defining groups: theme mode (Aurora / Liquid Glass / stock), accent color
     (`moz-input-color` or a swatch `moz-radio-group`), wallpaper picker,
     effects toggles (animations, glow), each bound to a `browser.aurora.*` pref.
   - Register it in `SettingPaneManager.mjs` and add the category entry +
     Fluent strings (new `.ftl` file in `browser/locales/en-US/browser/`).
2. **Live preview is nearly free:** theme changes via the theme API /
   LightweightThemeManager apply to the window instantly, so binding controls
   to prefs that `GXThemeManager` observes gives real-time preview of the
   actual browser. Add a wallpaper thumbnail grid as a small Lit component
   (the newtab wallpaper picker in `browser/extensions/newtab` — see
   `lib/Wallpapers/WallpaperFeed.sys.mjs` — is a good reference for the UX,
   though it's React; reimplement the picker UI in Lit for consistency).
3. Custom wallpaper upload: file picker → copy into profile directory →
   store path in pref → `GXThemeManager` rebuilds the theme.

A standalone `about:theming` page (own registration in the about redirector,
same moz-* widgets) is possible but only worth it if the design outgrows
preferences. Start inside about:preferences.

**Deliverables for Phase 2**
- [x] `config/aurora.mjs` group in the appearance pane
- [x] Fluent strings
- [x] Wallpaper picker with live apply, including a custom image file picker
- [ ] Smooth transitions: CSS view transitions / animations within the pane

---

## Phase 3 — Bundling uBlock Origin

Three mechanisms, in increasing order of integration depth:

### Option 1: `distribution/extensions` (recommended starting point)

Place the AMO-signed `uBlock0@raymondhill.net.xpi` in the application's
`distribution/extensions/` directory (add to packaging via
`browser/installer/package-manifest.in` / branding packaging).

- Installs into every new profile at first run, **enabled by default**.
- Keeps **auto-updates from AMO** — you don't chase uBO releases.
- User can disable/remove it (arguably a feature).
- Zero code, no signing concerns (the AMO xpi is already signed).

### Option 2: True built-in add-on (deeper integration)

The mechanism system extensions use (`webcompat`, `pictureinpicture`,
`newtab` in `browser/extensions/`):

1. Build uBO for Firefox from source (its repo's `make firefox` target) and
   vendor the output into `browser/extensions/ublock-origin/`.
2. Add a `moz.build` + `jar.mn` mapping the files under
   `builtin-addons/ublock-origin/` (copy the pattern from
   `browser/extensions/pictureinpicture/{moz.build,jar.mn}` — it's ~15 lines).
3. Add `"ublock-origin"` to `DIRS` in `browser/extensions/moz.build`.
4. `toolkit/mozapps/extensions/gen_built_in_addons.py` generates
   `built_in_addons.json` from the install manifest automatically; the
   XPIProvider installs everything listed there at startup
   (`XPIProvider.sys.mjs`, `BUILT_IN_ADDONS_URI`).

Properties: signing-exempt, cannot be uninstalled, ships/updates with *your*
releases (you own version bumps — uBO updates frequently, so this is a real
maintenance commitment). Built-in extensions are hidden in about:addons by
default (`XPIDatabase.sys.mjs` — `location.hidden`), so you'd surface uBO's
dashboard/options from your own settings UI instead.

### Option 3: Enterprise policy (`distribution/policies.json`)

`ExtensionSettings` with `installation_mode: "force_installed"` from an AMO
URL. Works, keeps updates, but shows "managed by your organization" chrome —
wrong vibe for a consumer product. Skip.

**Recommendation:** ship v1 with Option 1 (distribution xpi: enabled by
default, auto-updating, one afternoon of work). Move to Option 2 later only if
"non-removable, feels native" is a hard requirement.

**Licensing note:** uBO is GPLv3; Firefox is MPL 2.0. Bundling is fine — they
remain separate works — but keep uBO's license text with it, don't strip
attribution, and if you patch uBO itself, publish those patches.

**Deliverables for Phase 3**
- [x] Packaging wired (`browser/extensions/ublock/`); run `vendor.py` once to fetch the AMO xpi (network-restricted here)
- [ ] First-run check that it's active; expose an "Ad blocking" row in your
      settings pane linking to uBO's dashboard
- [ ] (Later, optional) migrate to in-tree built-in add-on

---

## Phase 4 — Build, branding, and update hygiene

- **Branding:** when you have a name, create `browser/branding/<name>/`
  (copy `browser/branding/unofficial/`), select with
  `--with-branding=browser/branding/<name>` in mozconfig. Don't rename
  internals.
- **Iteration speed:** front-end-only changes (CSS/JS/themes/settings) don't
  need compilation — use `./mach build faster` and artifact builds
  (`ac_add_options --enable-artifact-builds` in mozconfig) so you never
  compile C++ while doing UI work.
- **Update cadence:** merge upstream `release` tags monthly, or track ESR for
  ~yearly big merges + security point releases. Given the additive layout
  above, expected conflict surface per merge is a handful of one-line
  registrations.
- **Testing:** browser-chrome mochitests for the settings pane
  (`./mach test browser/components/preferences`), visual smoke tests of the
  themes via `./mach run`.

## Suggested milestone order

1. Static GX built-in theme + default-on (proves the pipeline, ~days)
2. Skin CSS with effects behind `browser.aurora.skin.enabled`
3. Dynamic theme engine (accent + wallpaper from prefs)
4. Settings pane with live preview
5. uBO via distribution/extensions
6. Liquid Glass CSS mode; macOS vibrancy stretch goal
7. Branding, packaging, upstream-merge dry run

---

## Deferred: Scramjet proxy

Requested as an optional privacy feature. Deliberately deferred: Scramjet is
an interstitial web proxy that requires a hosted server component (it cannot
ship inside the browser), and its primary use case is circumventing network
filtering rather than blocking ad tracking - uBlock Origin plus Firefox's
built-in Enhanced Tracking Protection already cover the tracking goal. If
still wanted later, the right shape is an optional extension or proxy setting
pointing at a self-hosted Scramjet instance, off by default.
