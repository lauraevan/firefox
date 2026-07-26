# PTerm

A terminal-based game launcher. PTerm boots into a fake Linux terminal with an
ASCII `P` logo and launches browser games from public catalogs — but you have to
_type_ for them. No menus, no big play buttons. You run the command, you get the
game.

```
guest@pterm:~$ npm start "Cookie Clicker" S=GN-Math
```

## Running it

PTerm is a static site — plain HTML/CSS/JS, no build step, no dependencies.

- **Locally:** serve the folder over HTTP (game catalogs are fetched with
  `fetch()`, which does not work from `file://`):
  ```
  cd pterm
  python3 -m http.server 8099
  # open http://127.0.0.1:8099/
  ```
- **Deploy:** drop the `pterm/` folder on any static host (GitHub Pages, Netlify,
  Vercel, an S3 bucket, ...). Everything is fetched client-side from CDN mirrors.

## Commands

Type `help` in the terminal for the full list. Highlights:

| Command | What it does |
| --- | --- |
| `npm start "<Game>" S=<Source>` | launch a game (the headline act) |
| `npm install "<Game>" S=<Source>` | stage a game, then tells you how to start it |
| `play "<Game>" S=<Source>` | shortcut for `npm start` |
| `ls [source] [--all]` | list available games |
| `search <query>` | find games by name |
| `info "<Game>"` | details for one game |
| `random [S=source]` | launch a random game |
| `sources` | list configured sources and their status |
| `sync` | re-fetch all catalogs from the CDN |
| `fastfetch` / `neofetch` | system info + logo, the cool way |
| `version`, `banner`, `about` | who/what/which |
| `theme [green\|amber\|matrix\|ice\|mono]` | recolor the terminal |
| `crt [on\|off]` | toggle the scanline effect |
| `whoami`, `uname -a`, `date`, `uptime`, `cat`, `echo`, `sudo`, ... | Linux flavor |

Input niceties: **Tab** completes commands, source flags (`S=`), and game names;
**Up/Down** walk history; **Ctrl+L** clears; **Ctrl+C** cancels the line; games in
listings are clickable. Inside a game, **Esc** or **Ctrl+Q** quits back to the shell.

## Sources

Sources are defined in [`js/catalog.js`](js/catalog.js) (`SOURCES`). Each visitor's
browser fetches them directly from CORS-enabled CDN mirrors, so nothing is bundled.

Wired up:

- **GN-Math** (`S=GN-Math`) — JSON `zones.json` catalog.
  - catalog: `freebuisness/assets@ .../zones.json`
  - games: `freebuisness/html@main/`
  - covers: `freebuisness/covers@main/`
- **Strongdog XP** (`S=Strongdog`) — `cards-data.js` catalog.
  - catalog + games + icons: `IAmNotTechnoblade/strongdogxp@master/`

Each source lists several mirrors (jsDelivr, originfastly, raw.githubusercontent);
catalogs are fetched with fallback across them and cached in `localStorage` for 6h.

### Adding a source

Add an entry to `SOURCES`:

```js
{
  key: "my-source",
  label: "My Source",
  aliases: ["ms", "mine"],
  type: "json",              // "json" (array) or "js" (script that defines an array)
  catalogUrls: [ /* mirror URLs, tried in order */ ],
  gameBase: "https://.../games",   // base for launch URLs
  coverBase: "https://.../covers", // base for cover images
  idKind: "folder",          // "folder" => <id>/index.html, "path" => url used as-is
}
```

The normalizer is intentionally tolerant about field names (`name`/`title`,
`url`/`link`/`path`/`id`, `image`/`cover`/`icon`, ...) so most catalogs work with
no custom code. `type: "js"` catalogs are loaded by injecting the script and
detecting the array it defines (with a text-parse fallback).

**Still to import** (from the brief): UGS (needs the HTML5 game list from the
shared Google Doc), Truffled, and Noah's Amazing Tutoring. Each is a new `SOURCES`
entry once we have its catalog URL/shape.

## Notes on the catalog assumptions

The GN-Math and Strongdog catalogs are fetched and parsed in the browser. The
field mapping and URL construction here are based on the known shapes of those
catalogs; the exact key names and game-path layout (e.g. `<id>/index.html` vs
`<id>.html`) are worth a quick live confirmation on first run. If a source loads
0 games or games 404 on launch, it's almost always a field-name or path-shape
tweak in that source's `SOURCES` entry — the rest of the app is source-agnostic.

## Layout

```
pterm/
  index.html          # shell: screen, input line, game overlay
  css/pterm.css       # themes, CRT effect, layout
  js/
    util.js           # helpers: tokenizer, url join, storage, fetch-with-fallback
    ascii.js          # P logo + PTERM banner
    catalog.js        # sources, adapters, normalization, search, caching
    launcher.js       # in-terminal iframe overlay (+ new-tab fallback)
    commands.js       # the command registry
    terminal.js       # input line, history, tab completion, dispatch
    boot.js           # boot sequence + wiring
```
