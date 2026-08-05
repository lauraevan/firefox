/* Arkeus - shared utilities */
window.Arkeus = window.Arkeus || {};

(function (PT) {
  "use strict";

  const util = {};

  util.esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  util.sleep = function (ms) {
    return new Promise((r) => setTimeout(r, ms));
  };

  util.randInt = function (n) {
    return Math.floor(Math.random() * n);
  };

  util.pick = function (arr) {
    return arr[util.randInt(arr.length)];
  };

  /* Tokenize a command line, honoring single and double quotes. */
  util.tokenize = function (line) {
    const tokens = [];
    let cur = "";
    let quote = null;
    let has = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          cur += ch;
        }
        has = true;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
        has = true;
      } else if (ch === " " || ch === "\t") {
        if (has) {
          tokens.push(cur);
          cur = "";
          has = false;
        }
      } else {
        cur += ch;
        has = true;
      }
    }
    if (has) tokens.push(cur);
    return tokens;
  };

  /* Split tokens into positional args and KEY=VALUE / --key=value flags. */
  util.parseFlags = function (tokens) {
    const args = [];
    const flags = {};
    for (const tok of tokens) {
      let m = tok.match(/^--([A-Za-z_][\w-]*)=(.*)$/);
      if (m) { flags[m[1].toLowerCase()] = m[2]; continue; }
      m = tok.match(/^--([A-Za-z_][\w-]*)$/);
      if (m) { flags[m[1].toLowerCase()] = true; continue; }
      m = tok.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) { flags[m[1].toLowerCase()] = m[2]; continue; }
      args.push(tok);
    }
    return { args, flags };
  };

  /* Join a base URL and a relative path without doubling or dropping slashes. */
  util.joinUrl = function (base, path) {
    if (!path) return base || "";
    if (/^(https?:)?\/\//i.test(path) || /^data:/i.test(path)) return path;
    if (!base) return path;
    return base.replace(/\/+$/, "") + "/" + String(path).replace(/^\/+/, "");
  };

  util.isAbsUrl = function (s) {
    return /^(https?:)?\/\//i.test(s) || /^data:/i.test(s);
  };

  /* Join base + relative path, percent-encoding the path (handles spaces in names). */
  util.joinUrlEncoded = function (base, path) {
    if (path == null || path === "") return base || "";
    if (util.isAbsUrl(path)) return path;
    const p = String(path).replace(/^\/+/, "");
    if (!base) return encodeURI(p);
    return base.replace(/\/+$/, "") + "/" + encodeURI(p);
  };

  util.slug = function (s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  };

  /* Fetch text from the first URL in `urls` that succeeds. */
  util.fetchTextFallback = async function (urls, timeoutMs) {
    const errors = [];
    for (const url of urls) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs || 9000);
      try {
        const res = await fetch(url, { signal: ctrl.signal, mode: "cors", credentials: "omit" });
        clearTimeout(t);
        if (!res.ok) { errors.push(url + " -> HTTP " + res.status); continue; }
        return { text: await res.text(), url };
      } catch (e) {
        clearTimeout(t);
        errors.push(url + " -> " + (e && e.name === "AbortError" ? "timeout" : (e && e.message) || e));
      }
    }
    const err = new Error("all mirrors failed");
    err.details = errors;
    throw err;
  };

  /* localStorage wrapper with JSON + TTL support; degrades gracefully. */
  util.store = {
    get(key) {
      try {
        const raw = localStorage.getItem("arkeus:" + key);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (obj && obj.exp && Date.now() > obj.exp) {
          localStorage.removeItem("arkeus:" + key);
          return null;
        }
        return obj ? obj.v : null;
      } catch (e) { return null; }
    },
    set(key, value, ttlMs) {
      try {
        const obj = { v: value };
        if (ttlMs) obj.exp = Date.now() + ttlMs;
        localStorage.setItem("arkeus:" + key, JSON.stringify(obj));
        return true;
      } catch (e) { return false; }
    },
    del(key) {
      try { localStorage.removeItem("arkeus:" + key); } catch (e) {}
    },
  };

  util.fmtDuration = function (ms) {
    let s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const parts = [];
    if (d) parts.push(d + "d");
    if (h) parts.push(h + "h");
    if (m) parts.push(m + "m");
    parts.push(s + "s");
    return parts.join(" ");
  };

  PT.util = util;
})(window.Arkeus);
