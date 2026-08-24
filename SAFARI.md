# Safari-style Firefox

A project to give Firefox a Safari look and interaction model while keeping the
real Gecko engine and all of Firefox's real browser infrastructure underneath.
The architecture is:

```
Safari-style chrome + surfaces  ->  Firefox front-end + Gecko  ->  the web
```

Nothing is faked: every surface is wired to real Firefox data (Top Sites,
tracking protection, preferences, etc.). Where a piece cannot yet be wired to
real data, it is left hidden rather than shown with placeholder numbers.

## Status

| Area | State |
| --- | --- |
| **Start Page** (Favorites, Frequently Visited, Privacy Report, Customize) | Implemented, real data, unit-tested, visually validated |
| Browser chrome (tabs, toolbar, Smart Search Field, sidebar, ...) | Not started (roadmap below) |

## Build environment note

The full/artifact Firefox build cannot be produced in the Claude Code cloud
sandbox: its egress policy blocks Mozilla's build hosts
(`firefox-ci-tc.services.mozilla.com`, `product-details.mozilla.org` return
403), which artifact builds must reach. Build and run on your own Mac instead
(instructions below). UI iteration in the sandbox is done with the local
preview harness, which needs no Gecko build.

## Start Page architecture

The Start Page replaces Firefox's `about:newtab` / `about:home` layout when the
`browser.newtabpage.activity-stream.safari.enabled` pref is on (default: on). It
is a self-contained component tree inside the newtab WebExtension, fed by the
real Redux store that already powers Top Sites and the Privacy widget.

```
browser/extensions/newtab/
  content-src/components/Safari/
    SafariStartPage.jsx        Redux container: maps real store -> props
    SafariStartPageInner.jsx   Presentational page (used by Firefox AND the harness)
    SafariSection.jsx          Section header + slot
    SafariTile.jsx             One favorite: favicon / colored-letter fallback
    SafariPrivacyCard.jsx      Privacy Report card (real tracker count)
    SafariCustomizePopover.jsx  Bottom-right settings popover (toggles real prefs)
    icons.jsx                  Original SF-Symbol-style SVG glyphs
  content-src/styles/_safari.scss   Design tokens + layout (light/dark, reduced-motion)
  lib/ActivityStream.sys.mjs        Registers the `safari.*` prefs
  lib/Widgets/PrivacyFeed.sys.mjs   Also runs for the Safari Privacy Report
  test/jest/safari/                 Unit tests
```

Data sources (all real):

- **Favorites / Frequently Visited** — `state.TopSites.rows`, split by
  `isPinned` (pinned -> Favorites; the rest -> Frequently Visited; on a fresh
  profile the frecency sites fill Favorites so the page is never empty).
- **Privacy Report** — `state.PrivacyWidget` (`trackersToday`), sourced from
  `PrivacyMetricsService`, the same data behind `about:protections`. Shown only
  when a real count exists; the copy says "Today" because that is the real range.
- **Customize popover** — each toggle writes a real, persisted preference
  (`safari.showFavorites`, `safari.showFrequentlyVisited`,
  `safari.showPrivacyReport`).

Prefs (namespaced `browser.newtabpage.activity-stream.` in `about:config`):

| Pref | Default | Effect |
| --- | --- | --- |
| `safari.enabled` | `true` | Render the Safari Start Page |
| `safari.showFavorites` | `true` | Show the Favorites section |
| `safari.showFrequentlyVisited` | `true` | Show the Frequently Visited section |
| `safari.showPrivacyReport` | `true` | Show the Privacy Report card |

## Build & run on macOS

Create a `mozconfig` in the repo root (this file is git-ignored, so it is
per-machine):

```
ac_add_options --enable-application=browser
ac_add_options --enable-artifact-builds
mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/obj-artifact
```

Then:

```sh
# One-time: set up the toolchain for artifact builds
./mach bootstrap --application-choice browser_artifact_mode

# Build only the front-end (downloads a prebuilt Gecko):
./mach build

# Run it
./mach run
```

Open a new tab. You should see the Safari Start Page. Compare against Safari and
report differences; refinement is expected.

After editing Start Page source (JSX/SCSS), rebuild just the front-end:

```sh
./mach build faster        # or: ./mach newtab bundle && ./mach build faster
```

## Fast UI iteration without a Gecko build (preview harness)

The Start Page's presentational layer renders in plain Chromium with
representative data, so you can iterate on look-and-feel in seconds. This is a
developer tool only; it is never shipped and Firefox never uses it.

```sh
cd browser/extensions/newtab
npm install
npx sass content-src/styles/_safari.scss:harness/dist/safari.css --no-source-map
npx webpack --config harness/webpack.harness.js
# open browser/extensions/newtab/harness/index.html in any browser
```

Run the unit tests:

```sh
cd browser/extensions/newtab
npx jest test/jest/safari
```

## Roadmap

The Start Page is the first completed surface. Remaining Safari surfaces, in
suggested order of impact, all layer on Firefox's real subsystems:

1. Browser chrome: title/tab bar (compact + separate), toolbar, window controls
2. Smart Search Field (address bar states + suggestions)
3. Sidebar (Tab Groups, Bookmarks, Reading List) + Tab Overview
4. Downloads popover, History, Bookmarks management
5. Settings redesigned over real preferences
6. Menus / context menus, Share menu, Reader, Picture-in-Picture
7. Website permissions + Privacy Report detail view
