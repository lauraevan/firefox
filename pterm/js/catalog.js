/* PTerm - game catalog: sources, adapters, normalization, search */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const U = PT.util;
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

  /* Source registry. Each visitor's browser fetches these directly (CORS-enabled
     CDNs), so nothing is bundled at build time. Adding a source = adding an entry. */
  const SOURCES = [
    {
      key: "gn-math",
      label: "GN-Math",
      aliases: ["gnmath", "gn", "gm", "gnm", "gn-math"],
      type: "json",
      catalogUrls: [
        "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json",
        "https://originfastly.jsdelivr.net/gh/freebuisness/assets@main/zones.json",
        "https://raw.githubusercontent.com/freebuisness/assets/main/zones.json",
      ],
      gameBase: "https://cdn.jsdelivr.net/gh/freebuisness/html@main",
      gameBaseAlts: ["https://originfastly.jsdelivr.net/gh/freebuisness/html@main"],
      coverBase: "https://cdn.jsdelivr.net/gh/freebuisness/covers@main",
      idKind: "folder", // bare id -> id/index.html
    },
    {
      key: "strongdog",
      label: "Strongdog XP",
      aliases: ["sd", "strongdog", "strongdogxp", "xp", "strong"],
      type: "js",
      catalogUrls: [
        "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master/cards-data.js",
        "https://originfastly.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master/cards-data.js",
        "https://raw.githubusercontent.com/IAmNotTechnoblade/strongdogxp/master/cards-data.js",
      ],
      gameBase: "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master",
      gameBaseAlts: ["https://originfastly.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master"],
      coverBase: "https://cdn.jsdelivr.net/gh/IAmNotTechnoblade/strongdogxp@master",
      idKind: "path", // url is already a path
    },
  ];

  const state = {
    all: [],
    bySource: {},   // key -> [games]
    loaded: {},     // key -> true
    error: {},      // key -> message
    injected: {},   // url -> true (avoid re-declaring const globals)
  };

  const NAME_KEYS = ["name", "title", "gameName", "label", "text", "alt"];
  const URL_KEYS = ["url", "link", "href", "path", "game", "file", "src", "page", "id"];
  const IMG_KEYS = ["image", "cover", "icon", "img", "thumbnail", "thumb", "banner", "logo"];

  function firstKey(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && obj[k] !== "") return obj[k];
    }
    return null;
  }

  function pathNoQuery(s) {
    return String(s).split(/[?#]/)[0];
  }

  function resolveLaunch(raw, source) {
    if (raw == null) return null;
    let url = String(raw).trim();
    if (!url) return null;
    if (U.isAbsUrl(url)) return url;
    url = url.replace(/^\/+/, "");
    const p = pathNoQuery(url);
    if (/\.(html?|php)$/i.test(p)) return U.joinUrl(source.gameBase, url);
    if (source.idKind === "folder") return U.joinUrl(source.gameBase, url + "/index.html");
    return U.joinUrl(source.gameBase, url);
  }

  function resolveCover(raw, source) {
    if (raw == null || raw === "") return null;
    const s = String(raw).trim();
    if (U.isAbsUrl(s)) return s;
    return U.joinUrl(source.coverBase, s.replace(/^\/+/, ""));
  }

  function normalizeEntry(entry, source, i) {
    if (entry == null) return null;
    if (typeof entry === "string") {
      // bare string: treat as both name and folder/id
      const launch = resolveLaunch(entry, source);
      if (!launch) return null;
      return {
        id: source.key + ":" + U.slug(entry) + ":" + i,
        name: entry,
        source: source.key,
        sourceLabel: source.label,
        launchUrl: launch,
        coverUrl: null,
        raw: entry,
      };
    }
    if (typeof entry !== "object") return null;
    const name = firstKey(entry, NAME_KEYS);
    const urlRaw = firstKey(entry, URL_KEYS);
    const imgRaw = firstKey(entry, IMG_KEYS);
    const launch = resolveLaunch(urlRaw, source);
    if (!name || !launch) return null;
    return {
      id: source.key + ":" + U.slug(name) + ":" + i,
      name: String(name).trim(),
      source: source.key,
      sourceLabel: source.label,
      launchUrl: launch,
      launchAlt: source.gameBaseAlts && urlRaw != null && !U.isAbsUrl(String(urlRaw))
        ? source.gameBaseAlts.map((b) => resolveLaunch(urlRaw, Object.assign({}, source, { gameBase: b })))
        : [],
      coverUrl: resolveCover(imgRaw, source),
      raw: entry,
    };
  }

  function normalizeList(list, source) {
    const out = [];
    if (!Array.isArray(list)) return out;
    for (let i = 0; i < list.length; i++) {
      const g = normalizeEntry(list[i], source, i);
      if (g) out.push(g);
    }
    return out;
  }

  /* ---- adapters ---- */

  async function loadJson(source) {
    const { text } = await U.fetchTextFallback(source.catalogUrls);
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // some catalogs wrap the array in an assignment; try to extract it
      data = extractArrayLiteral(text);
      if (!data) throw new Error("catalog is not valid JSON");
    }
    if (!Array.isArray(data)) {
      if (data && Array.isArray(data.games)) data = data.games;
      else if (data && Array.isArray(data.zones)) data = data.zones;
    }
    return normalizeList(data, source);
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
      // Body runs in global scope; sees both `var`/window and lexical (const/let) globals.
      return new Function("try{return " + name + "}catch(e){return undefined}")();
    } catch (e) { return undefined; }
  }

  function looksLikeGameList(arr) {
    if (!Array.isArray(arr) || !arr.length) return false;
    const sample = arr.slice(0, 5);
    let hits = 0;
    for (const it of sample) {
      if (typeof it === "string") { hits++; continue; }
      if (it && typeof it === "object" && (firstKey(it, NAME_KEYS) || firstKey(it, URL_KEYS))) hits++;
    }
    return hits >= Math.min(2, sample.length);
  }

  const KNOWN_GLOBALS = ["cards", "cardsData", "cardData", "CARDS", "cardList",
    "data", "games", "gameData", "gamesData", "apps", "items", "list", "gameList"];

  async function loadJs(source) {
    let best = null;
    let lastErr = null;
    for (const url of source.catalogUrls) {
      try {
        const before = new Set(Object.keys(window));
        if (!state.injected[url]) {
          await injectScript(url);
          state.injected[url] = true;
        }
        // 1) diff new window props (var / window.X = ...)
        for (const k of Object.keys(window)) {
          if (before.has(k)) continue;
          const v = window[k];
          const arr = Array.isArray(v) ? v : (v && Array.isArray(v.games) ? v.games : null);
          if (looksLikeGameList(arr)) { best = arr; break; }
        }
        // 2) probe known names (catches const/let lexical globals)
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
    // 3) last resort: fetch as text and extract an array literal
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
        // fall back to any stale cache we may still have in memory
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

    forSource(key) {
      const s = this.resolveSource(key);
      return s ? state.bySource[s.key] || [] : [];
    },

    search(query, opts) {
      opts = opts || {};
      const q = String(query || "").toLowerCase();
      let pool = opts.sourceKey ? this.forSource(opts.sourceKey) : state.all;
      if (!q) return pool.slice(0, opts.limit || pool.length);
      const out = pool.filter((g) => g.name.toLowerCase().includes(q));
      out.sort((a, b) => {
        const ai = a.name.toLowerCase().indexOf(q);
        const bi = b.name.toLowerCase().indexOf(q);
        return ai - bi || a.name.localeCompare(b.name);
      });
      return opts.limit ? out.slice(0, opts.limit) : out;
    },

    /* Best-effort resolution of a name to a single game. */
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

      const cands = (starts.length ? starts : incl);
      return { exact: null, candidates: cands };
    },
  };

  function rebuildAll() {
    const all = [];
    for (const s of SOURCES) {
      const arr = state.bySource[s.key];
      if (arr) all.push.apply(all, arr);
    }
    state.all = all;
  }

  PT.catalog = catalog;
})(window.PTerm);
