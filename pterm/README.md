# PTerm

A terminal-based game launcher. PTerm boots into a fake Linux terminal with an
ASCII `P` logo and launches browser games from public catalogs — but you have to
_type_ for them. No menus, no big play buttons. You type the name, you get the
game.

```
guest@pterm:~$ cookie clicker
```

That's it — just type a game name (no quotes, no source needed). Prefer the
ceremony? `play cookie clicker` and `npm start "Cookie Clicker" S=GN-Math` still
work. PTerm starts in a clean black-and-white theme; `theme green` (or `amber`,
`matrix`, `ice`) and `crt on` bring back the retro glow.

## Running it

PTerm is a static site — plain HTML/CSS/JS, no build step, no dependencies.

- **Locally:** serve the folder over HTTP (catalogs are fetched with `fetch()`,
  which does not work from `file://`):
  ```
  cd pterm
  python3 -m http.server 8099
  # open http://127.0.0.1:8099/
  ```
- **Deploy via githack** (no setup — it serves the repo files with correct MIME
  types and permissive CORS). Once this branch is pushed, the site is live at:

  ```
  https://rawcdn.githack.com/lauraevan/firefox/<commit-sha>/pterm/index.html
  ```

  Use a **commit SHA** (not the branch name) because the branch name contains a
  `/`, which githack's `owner/repo/ref/path` URL scheme can't split unambiguously.
  `rawcdn.githack.com` is the cached production host; `raw.githack.com` is the
  uncached dev host. All relative assets (`css/`, `js/`, `assets/`) resolve under
  the same prefix automatically.

- Or any other static host (GitHub Pages, Netlify, Vercel): everything is fetched
  client-side, so just serve the `pterm/` folder.

## Commands

Type `help` in the terminal for the full list. Highlights:

| Command | What it does |
| --- | --- |
| `npm start "<Game>" S=<Source>` | launch a game (the headline act) |
| `npm install "<Game>" S=<Source>` | stage a game, then tells you how to start it |
| `play "<Game>" S=<Source>` | shortcut for `npm start` |
| `ls [source] [--all]` | list available games |
| `search <query>` | find games by name |
| `stats` / `count` | how many games per source, and the total |
| `info "<Game>"` | details for one game |
| `random [S=source]` | launch a random game |
| `fav` / `unfav` / `favorites` | star games for quick access |
| `recent` | recently launched games |
| `sources` | list configured sources and their status |
| `sync` | re-fetch all catalogs from the CDN |
| `fastfetch` / `neofetch` | system info + logo, the cool way |
| `version`, `banner`, `about` | who/what/which |
| `theme [green\|amber\|matrix\|ice\|mono]`, `crt`, `colors` | looks |
| `matrix`, `hack`, `cowsay`, `fortune`, `calc`, `roll`, `flip`, `ping`, `top`, `weather` | fun |
| `whoami`, `uname -a`, `date`, `uptime`, `cat`, `echo`, `sudo`, ... | Linux flavor |

Input niceties: **Tab** completes commands, source flags (`S=`), and game names;
**Up/Down** walk history; **Ctrl+L** clears; **Ctrl+C** cancels the line; games in
listings are clickable. Inside a game, **Esc** or **Ctrl+Q** quits back to the shell.

## Sources

Sources live in [`js/catalog.js`](js/catalog.js) (`SOURCES`). Each visitor's browser
fetches them directly from CORS-enabled CDN mirrors, so nothing is bundled. Formats
below were confirmed against each project's real catalog files.

### GN-Math (`S=GN-Math`)
- catalog: `gn-math/assets@main/zones.json` — array of `{ id, name, cover, url }`.
- `cover`/`url` use **placeholder tokens** (`{HTML_URL}`, `{COVER_URL}`,
  `{ASSET_URL}`) that PTerm substitutes with the gn-math CDN bases, e.g.
  `"{HTML_URL}/4.html"` -> `https://cdn.jsdelivr.net/gh/gn-math/html@main/4.html`.
- Entries with `id < 0` / `[!]` names / Discord links (ads) are filtered out.
- Note: the `freebuisness/*` fork from the original brief has been deleted, so
  PTerm points at the upstream `gn-math/*` repos (same format, same games).

### Strongdog XP (`S=Strongdog`)
- catalog: `IAmNotTechnoblade/strongdogxp@master/cards-data.js` — an **ES module**
  (`export default [ { href, imgSrc, name, page } ]`). Because a `<script>` tag
  can't expose a module's default export, PTerm fetches it as text and extracts the
  array literal. Paths contain **spaces** (`./html/free kick classic/index.html`),
  which are percent-encoded when building URLs.

### Truffled (`S=Truffled`)
- catalog: `aukak/truffled@main/public/js/json/g.json` — `{ games: [ { name, url,
  thumbnail, frameType } ] }`. Games live under the repo's `public/` web root, so
  `"/games/1/index.html"` -> `.../truffled@main/public/games/1/index.html`. Only the
  games list (`g.json`) is imported; the site's proxy `apps`/`cloak` data is ignored.

### Noah's Amazing Tutoring — not wired up
`github.com/NoahsAmazingTutoringHelp` is ~214 mostly auto-named repos with no single
games catalog (searched `games.json`, `g.json`, `zones.json`, `cards-data.js` across
the org — none found). It's a multi-repo mirror operation, not a clean data source.
To import it, point me at one specific repo + its catalog file and it's one more
`SOURCES` entry. Same goes for **UGS**, which needs the HTML5 game list from the
shared Google Doc.

### Adding a source

```js
{
  key: "my-source",
  label: "My Source",
  aliases: ["ms"],
  type: "json",                 // "json" (array or {games:[...]}) or "js"
  jsParse: "text",              // for "js" ES-module catalogs (export default [...])
  catalogUrls: [ /* mirrors, tried in order */ ],
  placeholders: { "{X}": "https://..." },  // optional token substitution
  gameBase: "https://.../games",
  coverBase: "https://.../covers",
  idKind: "folder",             // "folder" => <id>/index.html; "path" => url as-is
}
```

The normalizer is tolerant about field names (`name`/`title`, `url`/`href`/`link`/`id`,
`cover`/`image`/`imgSrc`/`thumbnail`, ...), substitutes placeholders, encodes spaces,
de-dupes by launch URL, and drops ad/junk entries.

## Layout

```
pterm/
  index.html          # shell: screen, input line, game overlay
  css/pterm.css       # themes, CRT effect, layout
  js/
    util.js           # helpers: tokenizer, url join/encode, storage, fetch-fallback
    ascii.js          # P logo + PTERM banner
    catalog.js        # sources, adapters, normalization, search, caching
    launcher.js       # in-terminal iframe overlay (+ new-tab fallback)
    commands.js       # the command registry
    terminal.js       # input line, history, tab completion, dispatch
    boot.js           # boot sequence + wiring
```
