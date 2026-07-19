# Quackade

A Duck-Math-style game catalog: a wall of square game tiles you click to play
in a fullscreen embed. It pulls several public game catalogs live at runtime and
puts them all on one shelf.

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

## Running / hosting

It's a fully static site. Serve it over HTTP(S) from any static host
(GitHub Pages, Netlify, Vercel, or `python3 -m http.server`). It uses `fetch`
and ES modules, so it will **not** work from a `file://` URL — it needs a server.

```
cd quackade
python3 -m http.server 8000
# open http://localhost:8000
```

Every path is relative, so it also works from a project subpath such as
`https://you.github.io/quackade/`.

### A note on mirrors

Game HTML is embedded from jsDelivr (with a Fastly mirror as a fallback you can
switch to with the **Mirror** button in the player). `raw.githubusercontent.com`
is intentionally **not** used for game frames because it serves HTML as
`text/plain`, which would show source code instead of the game; it is only used
as a last-resort fallback for cover images.

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

All games belong to their original creators. Quackade only links to their
existing public mirrors; it does not host or modify any game.
