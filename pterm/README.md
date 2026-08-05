# Arkeus

A terminal that launches browser games. Arkeus boots into a fake Linux shell
(ASCII `A` logo), gates behind a password, and launches games from public
catalogs — but you have to _type_ for them. It also has a small real filesystem
(`ls`, `cd`, `cat`, `tree`, …) so it feels like an actual terminal.

```
guest@arkeus:~$ cookie clicker
```

Just type a game name (no quotes, no source needed). Prefer the ceremony?
`play cookie clicker` and `npm start "Cookie Clicker" S=GN-Math` still work.
Arkeus starts black-and-white; `theme green`/`amber`/`matrix`/`ice` + `crt on`
bring back the glow.

> The project folder is still named `pterm/` (so existing deploy paths keep
> working) but the product is **Arkeus**.

## Security — and its honest limits

The whole app is **client-side**, so nothing running in the browser can be made
"unbreakable": a determined person can always read what the browser executes.
What Arkeus *can* and does do — aimed squarely at "someone reads the source and
steals the password":

- **No password is ever stored, anywhere.** Login uses Web Crypto: a
  `PBKDF2-SHA256` (210k iterations) key derived from the typed password must
  decrypt a salted `AES-256-GCM` verification token. The source and
  `localStorage` hold only the token + salt — **there is no password to find**.
  `passwd` re-encrypts a fresh token; the plaintext never touches storage.
- **The deployed code is obfuscated.** `index.html` loads
  [`dist/arkeus.min.js`](dist/arkeus.min.js) (built from `js/*.js` by
  [`build.js`](build.js)) — identifiers mangled, strings base64-packed — so
  casual "view source" gets nothing readable.

What this does **not** do (and can't, client-side): stop someone from *bypassing*
the gate in devtools, or brute-forcing a **weak** password offline from the
token. So: **change the default immediately with `passwd` and pick a strong
password.** (The first-run default is `arkeus`, and this repo being public means
the default token is guessable — your own strong password lives only in your
browser, never in the repo.) Rebuild the bundle after any source change:
`npm install javascript-obfuscator && node build.js`.

## Running it

Arkeus is a static site — HTML/CSS/JS. The only build step is the obfuscated
bundle (`node build.js`); the committed `dist/arkeus.min.js` is ready to serve.
Web Crypto needs a **secure context**, so use `https://` or `http://localhost`.

- **Locally:** serve over HTTP (localhost counts as secure):
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
| `mode [frame\|tab]` | play in the overlay, or in a new browser tab |
| `retry` | relaunch the last game, trying other mirrors |
| `fastfetch [distro]` / `logo` | system info with a saved distro logo (arch, ubuntu, mint, ...) |
| `diag` | test connectivity to each source / CDN |
| `passwd` / `lock` | change the encrypted password / re-lock the terminal |
| `ls`, `cd`, `pwd`, `cat`, `tree`, `mkdir`, `touch`, `rm` | the (in-memory) filesystem |
| `id`, `groups`, `env`, `which`, `df`, `free`, `su`, `rev`, `yes` | more Linux flavor |
| `fastfetch` / `neofetch` | system info + logo, the cool way |
| `version`, `banner`, `about` | who/what/which |
| `theme [green\|amber\|matrix\|ice\|mono]`, `crt`, `colors` | looks |
| `matrix`, `hack`, `cowsay`, `fortune`, `calc`, `roll`, `flip`, `ping`, `top`, `weather` | fun |
| `whoami`, `uname -a`, `date`, `uptime`, `cat`, `echo`, `sudo`, ... | Linux flavor |

Input niceties: **Tab** completes commands, source flags (`S=`), and game names;
**Up/Down** walk history; **Ctrl+L** clears; **Ctrl+C** cancels the line; games in
listings are clickable. Inside a game, **Esc** or **Ctrl+Q** quits back to the shell.

## Catalogs are embedded (why sources always load)

The three catalogs are committed as a snapshot in [`js/catalogs.js`](js/catalogs.js)
(`window.PTerm.DATA`), which is loaded with a plain `<script>` tag — the same way as
every other `js/` file. So there is **no catalog fetch at all**: no relative path to
404, no CORS, no CDN to block. If the page loads, the ~1955 games load. The live CDNs
are only touched on an explicit `sync`. Run `diag` to see the embedded snapshot status
vs remote CDN reachability. To refresh the snapshot, re-download the source catalogs
and regenerate `js/catalogs.js`.

Note the **games themselves** still stream from CDNs (they're gigabytes — can't be
bundled). If a network blocks every game CDN, games won't launch even though the
catalog does; the launcher tries jsDelivr → originfastly → githack → statically per
game to maximize the odds. This mirrors how GN-Math/Truffled work — they serve games
from their own (unblocked) domain; PTerm uses public CDNs instead.

## If a game doesn't load

Games come from third-party CDNs, and sometimes a specific game has been removed,
is rate-limited, or refuses to run inside a frame. PTerm tries to route around it:

- Every launch **preflights several mirrors** (jsDelivr → originfastly → githack →
  statically) plus GN-Math's single-file (`html/<id>.html`) vs multi-file
  (`assets/<id>/index.html`) paths, and mounts the first one that actually responds
  (so a removed game/404 no longer shows a dead page).
- `retry` relaunches the last game and re-picks a mirror.
- `mode tab` opens games in a real browser tab instead of the overlay — the most
  reliable option for games that block framing (allow pop-ups for the site).
- `sync` re-fetches the catalogs and retries a source that failed earlier;
  `sources` shows each source's status and game count.

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
    ascii.js          # P logo, PTERM banner, 14 distro logos for fastfetch
    catalogs.js       # embedded catalog snapshot (window.PTerm.DATA) -- generated
    catalog.js        # sources, adapters, normalization, search (embedded-first)
    launcher.js       # in-terminal iframe overlay (+ new-tab fallback)
    commands.js       # the command registry
    terminal.js       # input line, history, tab completion, dispatch
    boot.js           # boot sequence + wiring
```
