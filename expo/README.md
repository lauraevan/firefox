# Expo

A Duck-Math-style game catalog with a Material 3 Expressive skin: a wall of
square game tiles you click to play in a fullscreen embed. It pulls several
public game catalogs live at runtime and puts them all on one shelf.

## What's inside

| Source | Games | Loaded from |
| --- | --- | --- |
| GN-Math | ~818 | `zones.json` (freebuisness/assets), covers + html repos |
| Strongdog XP | ~702 | `cards-data.js`, base + `strongdog2`/`strongdog3` repos |
| Noah's Amazing Tutoring | ~416 | `games.js` (Noahs-Calculus-Tutor) |
| Truffled | ~442 | `public/js/json/g.json`, games served from truffled.lol |
| UGS | seed list | `data/ugs-games.json` (see below) |

That's **~2,380 games** out of the box.

Each source provides its own cover art. Games that ship without a cover fall back
to a game-controller icon.

## Theme

The UI follows Material 3 Expressive: baseline M3 color tokens (seed `#6750A4`)
with light and dark schemes, Roboto Flex type, pill search bar, filter chips,
tonal buttons, springy shape-morphing on hover/press, and a shape-morph loading
indicator. Theme follows the system by default; the header button cycles
auto / light / dark (persisted in `localStorage`).

## Running / hosting

It's a fully static site. Serve it over HTTP(S) from any static host
(GitHub Pages, Netlify, Vercel, githack, or `python3 -m http.server`). It uses
`fetch` and ES modules, so it will **not** work from a `file://` URL — it needs
a server.

```
cd expo
python3 -m http.server 8000
# open http://localhost:8000
```

Every path is relative, so it also works from a project subpath such as
`https://you.github.io/expo/` or a githack URL.

### Deploying via githack

githack serves files straight from this GitHub repo with correct content-types,
so the site runs from it with no build step:

- Development (tracks the branch, short CDN cache):
  `https://raw.githack.com/<owner>/<repo>/<branch>/expo/index.html`
- Production (permanent CDN cache — pin a commit hash, not a branch):
  `https://rawcdn.githack.com/<owner>/<repo>/<commit-sha>/expo/index.html`

Live deployment for this repo (tracks this branch):

https://raw.githack.com/lauraevan/firefox/claude/duck-math-game-catalog-vxb4wc/expo/index.html

### How games are embedded

The raw-file CDNs these catalogs live on (jsDelivr, Fastly, raw.githubusercontent)
all serve `.html` as `text/plain`, so a plain `<iframe src>` would show source
code instead of the game. The player instead **fetches the game HTML as text,
injects a `<base>` tag pointing at the file's CDN directory** (so the game's
relative assets still resolve — non-HTML assets get correct content-types), and
renders it through `iframe.srcdoc`. If a mirror fails, the player automatically
advances to the next one (cdn.jsdelivr → Fastly → raw); the **Mirror** button
cycles them manually. Games hosted on real sites (Truffled) embed directly.
"Open" pops injected games into a new tab via a Blob URL.

## Configuration

Open `js/config.js`:

- `SITE.name` / `SITE.tagline` — rename the site here.
- `SOURCES` — toggle a source with `enabled: false`, or change its chip color.
- `MIRRORS` — the CDN mirror order.

## Extending the UGS list

The upstream "Ultimate Game Stash" Google Doc is not publicly exportable, so UGS
ships as a small, hand-maintained seed in `data/ugs-games.json` (verified games
mirrored in the same ecosystem the doc curates). To add more, append entries:

```json
{ "title": "Game Name", "url": "https://cdn.jsdelivr.net/gh/owner/repo@branch/path/game.html" }
```

- `url` — an **embeddable** URL (a CDN that serves HTML with the right
  content-type, e.g. jsDelivr). Optional `img` for a cover, otherwise the
  controller icon is used. Use `external` instead of `url` for games that must
  open in a new tab.

## Credits

All games belong to their original creators. Expo only links to their existing
public mirrors; it does not host or modify any game.
