/* PTerm - game catalog: sources, adapters, normalization, search */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const U = PT.util;
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

  /* Source registry. Each visitor's browser fetches these directly (CORS-enabled
     CDNs), so nothing is bundled at build time. Adding a source = adding an entry.
     Formats confirmed against each project's real catalog files. */
  const SOURCES = [
    {
      // zones.json: [{ id, name, cover:"{COVER_URL}/4.png", url:"{HTML_URL}/4.html" }]
      // Placeholder tokens are substituted below. Original freebuisness fork is
      // gone; gn-math is the upstream and is what the tokens resolve to.
      key: "gn-math",
      label: "GN-Math",
      aliases: ["gnmath", "gn", "gm", "gnm"],
      type: "json",
      // local snapshot first (same origin as the deploy, so it can't be blocked
      // separately from the page); CDNs are refresh fallbacks.
      catalogUrls: [
        "data/gn-math.zones.json",
        "https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json",
        "https://fastly.jsdelivr.net/gh/gn-math/assets@main/zones.json",
        "https://raw.githubusercontent.com/gn-math/assets/main/zones.json",
      ],
      placeholders: {
        "{HTML_URL}": "https://cdn.jsdelivr.net/gh/gn-math/html@main",
        "{COVER_URL}": "https://cdn.jsdelivr.net/gh/gn-math/covers@main",
        "{ASSET_URL}": "https://cdn.jsdelivr.net/gh/gn-math/assets@main",
      },
      gameBase: "https://cdn.jsdelivr.net/gh/gn-math/html@main",
      coverBase: "https://cdn.jsdelivr.net/gh/gn-math/covers@main",
      idKind: "folder",
    },
    {
      // cards-data.js: `export default [{ href:'./html/<name>/index.html',
      // imgSrc:'<name>.jpg', name:'<name>', page }]` -- an ES module, so it must
      // be text-parsed (a script tag can't expose a module's default export).
      key: "strongdog",
      label: "Strongdog XP",
      aliases: ["sd", "strongdog", "strongdogxp", "xp", "strong"],
      type: "js",
      jsParse: "text",
      catalogUrls: [
        "data/strongdog.cards.js",
        "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master/cards-data.js",
        "https://fastly.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master/cards-data.js",
        "https://raw.githubusercontent.com/IAmNotTechnoblade/strongdogxp/master/cards-data.js",
      ],
      gameBase: "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master",
      coverBase: "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master",
      idKind: "path",
    },
    {
      // public/js/json/g.json: { games:[{ name, url:"/games/<id>/index.html",
      // thumbnail:"png/games/<id>.webp", frameType }] }. Web root is public/.
      key: "truffled",
      label: "Truffled",
      aliases: ["tr", "truffle", "truf"],
      type: "json",
      catalogUrls: [
        "data/truffled.g.json",
        "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json",
        "https://fastly.jsdelivr.net/gh/aukak/truffled@main/public/js/json/g.json",
        "https://raw.githubusercontent.com/aukak/truffled/main/public/js/json/g.json",
      ],
      gameBase: "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public",
      coverBase: "https://cdn.jsdelivr.net/gh/aukak/truffled@main/public",
      idKind: "path",
    },
  ];

  const state = {
    all: [],
    bySource: {},
    loaded: {},
    error: {},
    injected: {},
  };

  const NAME_KEYS = ["name", "title", "gameName", "label", "text", "alt"];
  const URL_KEYS = ["url", "href", "link", "path", "game", "file", "src", "page", "id"];
  const IMG_KEYS = ["cover", "image", "imgSrc", "imgsrc", "icon", "img", "thumbnail", "thumb", "banner", "logo"];

  function firstKey(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && obj[k] !== "") return obj[k];
    }
    return null;
  }

  function subPlaceholders(s, source) {
    if (!source.placeholders || s == null) return s;
    let out = String(s);
    for (const token in source.placeholders) {
      if (out.indexOf(token) >= 0) out = out.split(token).join(source.placeholders[token]);
    }
    return out;
  }

  function resolveLaunch(raw, source) {
    if (raw == null) return null;
    let url = subPlaceholders(String(raw).trim(), source);
    if (!url) return null;
    if (U.isAbsUrl(url)) return url;
    url = url.replace(/^\.\//, "").replace(/^\/+/, "");
    const p = url.split(/[?#]/)[0];
    if (!/\.(html?|php)$/i.test(p) && source.idKind === "folder") {
      url = url.replace(/\/+$/, "") + "/index.html";
    }
    return U.joinUrlEncoded(source.gameBase, url);
  }

  function resolveCover(raw, source) {
    if (raw == null || raw === "") return null;
    let s = subPlaceholders(String(raw).trim(), source);
    if (U.isAbsUrl(s)) return s;
    return U.joinUrlEncoded(source.coverBase, s.replace(/^\.\//, "").replace(/^\/+/, ""));
  }

  /* Same file, different CDN. Games get removed and CDNs rate-limit, so every
     launch has fallbacks to try. */
  function mirrorSwaps(url) {
    const m = url.match(/^https?:\/\/(?:cdn|originfastly|fastly|gcore|testingcf)\.jsdelivr\.net\/gh\/([^@/]+)\/([^@/]+)@([^/]+)\/(.*)$/);
    if (!m) return [];
    const o = m[1], r = m[2], ref = m[3], path = m[4];
    return [
      "https://originfastly.jsdelivr.net/gh/" + o + "/" + r + "@" + ref + "/" + path,
      "https://raw.githack.com/" + o + "/" + r + "/" + ref + "/" + path,
      "https://cdn.statically.io/gh/" + o + "/" + r + "/" + ref + "/" + path,
    ];
  }

  /* GN-Math games are either single-file (html/<id>.html) or multi-file
     (assets/<id>/index.html); if the catalog's shape 404s, try the other one. */
  function pathShapeAlts(url) {
    let m;
    if ((m = url.match(/^(https?:\/\/.*\/gh\/gn-math\/)html(@[^/]+)\/([^/?#]+)\.html(?:[?#].*)?$/)))
      return [m[1] + "assets" + m[2] + "/" + m[3] + "/index.html"];
    if ((m = url.match(/^(https?:\/\/.*\/gh\/gn-math\/)assets(@[^/]+)\/([^/?#]+)\/index\.html(?:[?#].*)?$/)))
      return [m[1] + "html" + m[2] + "/" + m[3] + ".html"];
    return [];
  }

  function buildAlts(launch) {
    if (!launch) return [];
    const out = [];
    mirrorSwaps(launch).forEach((u) => out.push(u));
    pathShapeAlts(launch).forEach((a) => { out.push(a); mirrorSwaps(a).forEach((u) => out.push(u)); });
    const seen = Object.create(null);
    const res = [];
    for (const u of out) { if (u && u !== launch && !seen[u]) { seen[u] = 1; res.push(u); } }
    return res;
  }

  function isJunkEntry(name, launch, entry) {
    if (entry && typeof entry === "object" && typeof entry.id === "number" && entry.id < 0) return true;
    if (name && /^\s*\[!\]/.test(String(name))) return true;
    if (launch && /discord\.(gg|com)/i.test(launch)) return true;
    return false;
  }

  function normalizeEntry(entry, source, i) {
    if (entry == null) return null;
    if (typeof entry === "string") {
      const launch = resolveLaunch(entry, source);
      if (!launch || isJunkEntry(entry, launch, null)) return null;
      return {
        id: source.key + ":" + U.slug(entry) + ":" + i,
        name: entry, source: source.key, sourceLabel: source.label,
        launchUrl: launch, coverUrl: null, launchAlt: buildAlts(launch), raw: entry,
      };
    }
    if (typeof entry !== "object") return null;
    const name = firstKey(entry, NAME_KEYS);
    const urlRaw = firstKey(entry, URL_KEYS);
    const imgRaw = firstKey(entry, IMG_KEYS);
    const launch = resolveLaunch(urlRaw, source);
    if (!name || !launch) return null;
    if (isJunkEntry(name, launch, entry)) return null;
    return {
      id: source.key + ":" + U.slug(name) + ":" + i,
      name: String(name).trim(),
      source: source.key,
      sourceLabel: source.label,
      launchUrl: launch,
      launchAlt: buildAlts(launch),
      coverUrl: resolveCover(imgRaw, source),
      raw: entry,
    };
  }

  function normalizeList(list, source) {
    const out = [];
    if (!Array.isArray(list)) return out;
    const seen = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const g = normalizeEntry(list[i], source, i);
      if (!g) continue;
      const key = g.launchUrl;
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(g);
    }
    return out;
  }

  /* ---- adapters ---- */

  function unwrapArray(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.games)) return data.games;
    if (data && Array.isArray(data.zones)) return data.zones;
    if (data && Array.isArray(data.data)) return data.data;
    return data;
  }

  async function loadJson(source) {
    const { text } = await U.fetchTextFallback(source.catalogUrls);
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = extractArrayLiteral(text);
      if (!data) throw new Error("catalog is not valid JSON");
    }
    return normalizeList(unwrapArray(data), source);
  }

  function injectScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      let done = false;
      const to = setTimeout(() => { if (!done) { done = true; s.remove(); reject(new Error("timeout")); } }, 9000);
      s.onload = () => { if (!done) { done = true; clearTimeout(to); resolve(); } };
      s.onerror = () => { if (!done) { done = true; clearTimeout(to); s.remove(); reject(new Error("script error")); } };
      s.src = url;
      document.head.appendChild(s);
    });
  }

  function probeGlobal(name) {
    try {
      return new Function("try{return " + name + "}catch(e){return undefined}")();
    } catch (e) { return undefined; }
  }

  function looksLikeGameList(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    let hits = 0;
    const sample = arr.slice(0, 5);
    for (const it of sample) {
      if (typeof it === "string") { hits++; continue; }
      if (it && typeof it === "object" && (firstKey(it, NAME_KEYS) || firstKey(it, URL_KEYS))) hits++;
    }
    return hits >= Math.min(2, sample.length);
  }

  const KNOWN_GLOBALS = ["cards", "cardsData", "cardData", "CARDS", "cardList",
    "data", "games", "gameData", "gamesData", "apps", "items", "list", "gameList"];

  async function loadJs(source) {
    // Module-style catalogs (export default [...]) can't be read via a script
    // tag; parse the text directly.
    if (source.jsParse === "text") {
      const { text } = await U.fetchTextFallback(source.catalogUrls);
      const arr = extractArrayLiteral(text);
      if (!looksLikeGameList(arr)) throw new Error("could not parse game array from script");
      return normalizeList(arr, source);
    }

    let best = null, lastErr = null;
    for (const url of source.catalogUrls) {
      try {
        const before = new Set(Object.keys(window));
        if (!state.injected[url]) { await injectScript(url); state.injected[url] = true; }
        for (const k of Object.keys(window)) {
          if (before.has(k)) continue;
          const v = window[k];
          const arr = Array.isArray(v) ? v : (v && Array.isArray(v.games) ? v.games : null);
          if (looksLikeGameList(arr)) { best = arr; break; }
        }
        if (!best) {
          for (const name of KNOWN_GLOBALS) {
            const v = probeGlobal(name);
            const arr = Array.isArray(v) ? v : (v && Array.isArray(v.games) ? v.games : null);
            if (looksLikeGameList(arr)) { best = arr; break; }
          }
        }
        if (best) break;
      } catch (e) { lastErr = e; }
    }
    if (!best) {
      try {
        const { text } = await U.fetchTextFallback(source.catalogUrls);
        const arr = extractArrayLiteral(text);
        if (looksLikeGameList(arr)) best = arr;
      } catch (e) { lastErr = e; }
    }
    if (!best) throw (lastErr || new Error("could not locate game data in script"));
    return normalizeList(best, source);
  }

  /* Extract the first top-level `[ ... ]` array literal and tolerantly evaluate it. */
  function extractArrayLiteral(text) {
    const start = text.indexOf("[");
    if (start < 0) return null;
    let depth = 0, inStr = null, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "[") depth++;
      else if (ch === "]") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) return null;
    const snippet = text.slice(start, end + 1);
    try { return JSON.parse(snippet); } catch (e) {}
    try { return new Function("return (" + snippet + ")")(); } catch (e) {}
    return null;
  }

  function rebuildAll() {
    const all = [];
    for (const s of SOURCES) {
      const arr = state.bySource[s.key];
      if (arr) all.push.apply(all, arr);
    }
    state.all = all;
  }

  /* ---- public API ---- */

  const catalog = {
    SOURCES,
    state,

    resolveSource(name) {
      if (!name) return null;
      const q = String(name).toLowerCase().replace(/[\s_]+/g, "-");
      const qslug = U.slug(name);
      for (const s of SOURCES) {
        if (s.key === q || U.slug(s.key) === qslug || U.slug(s.label) === qslug) return s;
        for (const a of s.aliases) if (a === q || U.slug(a) === qslug) return s;
      }
      return null;
    },

    isLoaded(key) { return !!state.loaded[key]; },

    async load(sourceKey, opts) {
      opts = opts || {};
      const source = typeof sourceKey === "object" ? sourceKey : this.resolveSource(sourceKey);
      if (!source) throw new Error("unknown source: " + sourceKey);
      const cacheKey = "cat:" + source.key;

      if (!opts.force) {
        if (state.loaded[source.key]) return state.bySource[source.key];
        const cached = U.store.get(cacheKey);
        if (cached && cached.length) {
          state.bySource[source.key] = cached;
          state.loaded[source.key] = true;
          rebuildAll();
          return cached;
        }
      }

      let games;
      try {
        games = source.type === "js" ? await loadJs(source) : await loadJson(source);
      } catch (e) {
        state.error[source.key] = (e && e.message) || String(e);
        if (state.bySource[source.key]) return state.bySource[source.key];
        throw e;
      }

      state.bySource[source.key] = games;
      state.loaded[source.key] = true;
      delete state.error[source.key];
      U.store.set(cacheKey, games, CACHE_TTL);
      rebuildAll();
      return games;
    },

    async loadAll(opts) {
      opts = opts || {};
      const results = {};
      for (const s of SOURCES) {
        if (opts.onProgress) opts.onProgress(s, "loading");
        try {
          const g = await this.load(s, opts);
          results[s.key] = { ok: true, count: g.length };
          if (opts.onProgress) opts.onProgress(s, "ok", g.length);
        } catch (e) {
          results[s.key] = { ok: false, error: (e && e.message) || String(e) };
          if (opts.onProgress) opts.onProgress(s, "error", e);
        }
      }
      return results;
    },

    all() { return state.all; },

    byId(id) { return state.all.find((g) => g.id === id) || null; },

    forSource(key) {
      const s = this.resolveSource(key);
      return s ? state.bySource[s.key] || [] : [];
    },

    search(query, opts) {
      opts = opts || {};
      const q = String(query || "").toLowerCase();
      const pool = opts.sourceKey ? this.forSource(opts.sourceKey) : state.all;
      if (!q) return pool.slice(0, opts.limit || pool.length);
      const out = pool.filter((g) => g.name.toLowerCase().includes(q));
      out.sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(q);
        const bi = b.name.toLowerCase().indexOf(q);
        return ai - bi || a.name.localeCompare(b.name);
      });
      return opts.limit ? out.slice(0, opts.limit) : out;
    },

    find(name, sourceKey) {
      const pool = sourceKey ? this.forSource(sourceKey) : state.all;
      const q = String(name || "").trim().toLowerCase();
      const qslug = U.slug(name);
      if (!q) return { exact: null, candidates: [] };

      const exactName = pool.filter((g) => g.name.toLowerCase() === q);
      if (exactName.length === 1) return { exact: exactName[0], candidates: exactName };
      if (exactName.length > 1) return { exact: null, candidates: exactName };

      const exactSlug = pool.filter((g) => U.slug(g.name) === qslug);
      if (exactSlug.length === 1) return { exact: exactSlug[0], candidates: exactSlug };
      if (exactSlug.length > 1) return { exact: null, candidates: exactSlug };

      const starts = pool.filter((g) => g.name.toLowerCase().startsWith(q));
      if (starts.length === 1) return { exact: starts[0], candidates: starts };

      const incl = pool.filter((g) => g.name.toLowerCase().includes(q));
      if (incl.length === 1) return { exact: incl[0], candidates: incl };

      return { exact: null, candidates: starts.length ? starts : incl };
    },

    // exposed for offline parser tests
    _debug: { normalizeList, extractArrayLiteral, resolveLaunch, resolveCover, subPlaceholders, unwrapArray },
  };

  PT.catalog = catalog;
})(window.PTerm);
