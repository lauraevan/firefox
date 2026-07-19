// Fetches every catalog source and normalizes it to a common game shape:
//   { id, title, source, sourceLabel, author?, img:[...], embed:[...]|null, external? }
// - img:    ordered candidate cover URLs (UI walks them on error, then falls
//           back to the controller glyph).
// - embed:  ordered candidate URLs safe to load in an <iframe> (jsDelivr/Fastly
//           for GitHub-hosted HTML, or a live site). null means "open externally".
// - external: absolute URL to open in a new tab instead of embedding.

import { MIRRORS, ghLocator, expand } from "./config.js";

// Try each URL in order; return the text of the first that responds OK.
async function fetchFirst(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) return await res.text();
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("all mirrors failed");
}

// The JS catalog files (Strongdog, Noah) are not valid JSON, so we pull fields
// out of each flat { ... } block by hand. These helpers tolerate single or
// double quotes and unquoted keys.
function objectBlocks(text) {
  return text.match(/\{[^{}]*\}/g) || [];
}
function str(block, key) {
  const m = block.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]*)['"]`));
  return m ? m[1] : null;
}
function num(block, key) {
  const m = block.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function dataMirrors(owner, repo, ref, path) {
  return expand(
    [
      "https://cdn.jsdelivr.net/{u}",
      "https://originfastly.jsdelivr.net/{u}",
      "https://raw.githubusercontent.com/{r}",
    ],
    ghLocator(owner, repo, ref, path)
  );
}

// ---------------------------------------------------------------------------
// GN-Math: zones.json with {COVER_URL} / {HTML_URL} tokens.
// ---------------------------------------------------------------------------
async function loadGnMath() {
  const text = await fetchFirst(
    dataMirrors("freebuisness", "assets", "main", "zones.json")
  );
  return parseGnMath(text);
}
export function parseGnMath(text) {
  const zones = JSON.parse(text);
  const out = [];
  for (const z of zones) {
    if (typeof z.id === "number" && z.id < 0) continue; // suggestion/discord row
    const url = String(z.url || "");
    const cover = String(z.cover || "");
    const coverPath = cover.replace("{COVER_URL}/", "");
    const img = cover.includes("{COVER_URL}")
      ? expand(MIRRORS.image, ghLocator("freebuisness", "covers", "main", coverPath))
      : [cover];

    let embed = null;
    let external;
    if (url.includes("{HTML_URL}")) {
      const gamePath = url.replace("{HTML_URL}/", "");
      embed = expand(MIRRORS.embed, ghLocator("freebuisness", "html", "main", gamePath));
    } else if (/^https?:\/\//.test(url)) {
      external = url; // external link (skipped id<0 already; keep others as links)
    } else {
      continue;
    }
    out.push({
      id: `gnmath-${z.id}`,
      title: z.name || "Untitled",
      source: "gnmath",
      sourceLabel: "GN-Math",
      author: z.author || null,
      img,
      embed,
      external,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strongdog XP: cards-data.js. page 2 -> strongdog2 repo, page 3 -> strongdog3,
// everything else -> the base strongdogxp repo.
// ---------------------------------------------------------------------------
function strongdogRepo(page) {
  if (page === 2) return ["strongdogxp", "strongdog2"];
  if (page === 3) return ["strongdogxp", "strongdog3"];
  return ["IAmNotTechnoblade", "strongdogxp"];
}
async function loadStrongdog() {
  const text = await fetchFirst(
    dataMirrors("IAmNotTechnoblade", "strongdogxp", "master", "cards-data.js")
  );
  return parseStrongdog(text);
}
export function parseStrongdog(text) {
  const out = [];
  objectBlocks(text).forEach((block, i) => {
    const href = str(block, "href");
    const imgSrc = str(block, "imgSrc");
    const name = str(block, "name");
    if (!href || !name) return;
    const page = num(block, "page");
    const [owner, repo] = strongdogRepo(page);
    const gamePath = href.replace(/^\.\//, "");
    const embed = expand(MIRRORS.embed, ghLocator(owner, repo, "master", gamePath));
    const img = imgSrc
      ? expand(MIRRORS.image, ghLocator(owner, repo, "master", `img/${imgSrc}`))
      : [];
    out.push({
      id: `strongdog-${i}`,
      title: name,
      source: "strongdog",
      sourceLabel: "Strongdog XP",
      img,
      embed,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Noah's Amazing Tutoring: games.js (const games = [...]). URLs point at
// raw.githubusercontent; rewrite to a jsDelivr locator so they can be embedded.
// ---------------------------------------------------------------------------
function rawToLocatorParts(rawUrl) {
  const m = String(rawUrl).match(
    /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\/(.+)$/
  );
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
}
async function loadNoah() {
  const text = await fetchFirst(
    dataMirrors("NoahsAmazingTutoringHelp", "Noahs-Calculus-Tutor", "master", "games.js")
  );
  return parseNoah(text);
}
export function parseNoah(text) {
  const out = [];
  objectBlocks(text).forEach((block, i) => {
    const title = str(block, "title");
    const url = str(block, "url");
    const image = str(block, "image");
    if (!title || !url) return;
    const gp = rawToLocatorParts(url);
    const embed = gp
      ? expand(MIRRORS.embed, ghLocator(gp.owner, gp.repo, gp.ref, gp.path))
      : /^https?:/.test(url)
      ? [url]
      : null;
    let img = [];
    if (image) {
      const ip = rawToLocatorParts(image);
      img = ip
        ? expand(MIRRORS.image, ghLocator(ip.owner, ip.repo, ip.ref, ip.path))
        : [image];
    }
    out.push({
      id: `noah-${i}`,
      title,
      source: "noah",
      sourceLabel: "Noah's Tutoring",
      desc: str(block, "desc") || null,
      img,
      embed,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Truffled: public/js/json/g.json. Thumbnails live in the repo; game files are
// served from truffled.lol, so games embed from there (or open externally).
// ---------------------------------------------------------------------------
async function loadTruffled() {
  const text = await fetchFirst(
    dataMirrors("aukak", "truffled", "main", "public/js/json/g.json")
  );
  return parseTruffled(text);
}
export function parseTruffled(text) {
  const data = JSON.parse(text);
  const games = Array.isArray(data) ? data : data.games || [];
  const out = [];
  games.forEach((g, i) => {
    if (!g || !g.name || !g.url) return;
    const path = String(g.url)
      .replace(/^\/+/, "")
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const embed = [`https://truffled.lol/${path}`];
    const thumb = g.thumbnail ? String(g.thumbnail).replace(/^\/+/, "") : null;
    const img = thumb
      ? expand(MIRRORS.image, ghLocator("aukak", "truffled", "main", `public/${thumb}`))
      : [];
    out.push({
      id: `truffled-${i}`,
      title: g.name,
      source: "truffled",
      sourceLabel: "Truffled",
      img,
      embed,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// UGS: a static, hand-maintained list (data/ugs-games.json). The upstream
// Ultimate Game Stash doc is not publicly exportable, so this seed is meant to
// be extended by pasting in entries. Each entry: { title, url, img? }.
// ---------------------------------------------------------------------------
async function loadUgs() {
  const res = await fetch("data/ugs-games.json");
  if (!res.ok) throw new Error(`UGS list HTTP ${res.status}`);
  const list = await res.json();
  return list.map((g, i) => ({
    id: `ugs-${i}`,
    title: g.title || "Untitled",
    source: "ugs",
    sourceLabel: "UGS",
    img: g.img ? (Array.isArray(g.img) ? g.img : [g.img]) : [],
    embed: g.url ? [g.url] : null,
    external: g.external || undefined,
  }));
}

export const PROVIDERS = {
  gnmath: loadGnMath,
  strongdog: loadStrongdog,
  noah: loadNoah,
  truffled: loadTruffled,
  ugs: loadUgs,
};
