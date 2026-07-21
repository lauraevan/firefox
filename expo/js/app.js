import { SITE, SOURCES } from "./config.js";
import { PROVIDERS } from "./providers.js";
import { needsInject, withBase } from "./embed.js";

const BATCH = 48; // tiles rendered per infinite-scroll step

const state = {
  all: [], // every loaded game, each tagged with a stable random sort key
  filtered: [],
  rendered: 0,
  query: "",
  active: new Set(SOURCES.filter((s) => s.enabled).map((s) => s.id)),
};

const els = {};

function init() {
  document.title = `${SITE.name} — ${SITE.tagline}`;
  els.brand = document.getElementById("brand");
  els.brand.textContent = SITE.name;
  els.tagline = document.getElementById("tagline");
  els.tagline.textContent = SITE.tagline;
  els.search = document.getElementById("search");
  els.chips = document.getElementById("chips");
  els.grid = document.getElementById("grid");
  els.count = document.getElementById("count");
  els.sentinel = document.getElementById("sentinel");
  els.empty = document.getElementById("empty");
  els.loader = document.getElementById("loader");

  initTheme();
  buildChips();
  wireSearch();
  wirePlayer();
  wireInfiniteScroll();
  loadAll();
}

// --- theme (auto -> light -> dark) -----------------------------------------
const THEME_KEY = "expo-theme";
const THEME_ICONS = {
  auto: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 0 1 0 14V5Z" fill="currentColor"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"/></svg>',
  dark: '<svg viewBox="0 0 24 24"><path d="M20.2 14.7A8.6 8.6 0 0 1 9.3 3.8 8.6 8.6 0 1 0 20.2 14.7Z" fill="currentColor"/></svg>',
};

function initTheme() {
  els.themeBtn = document.getElementById("theme-btn");
  renderTheme(localStorage.getItem(THEME_KEY) || "auto");
  els.themeBtn.addEventListener("click", () => {
    const cur = localStorage.getItem(THEME_KEY) || "auto";
    const next = cur === "auto" ? "light" : cur === "light" ? "dark" : "auto";
    if (next === "auto") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
    renderTheme(next);
  });
}

function renderTheme(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode;
  else delete root.dataset.theme;
  els.themeBtn.innerHTML = THEME_ICONS[mode];
  els.themeBtn.title = `Theme: ${mode}`;
}

// --- source filter chips --------------------------------------------------
function buildChips() {
  SOURCES.forEach((s) => {
    const chip = document.createElement("button");
    chip.className = "chip on";
    chip.dataset.id = s.id;
    chip.style.setProperty("--c", s.color);
    chip.innerHTML = `<span class="dot"></span><span class="lbl">${s.label}</span><span class="n" data-n>—</span>`;
    chip.addEventListener("click", () => {
      if (state.active.has(s.id)) state.active.delete(s.id);
      else state.active.add(s.id);
      chip.classList.toggle("on", state.active.has(s.id));
      applyFilter();
    });
    els.chips.appendChild(chip);
  });
}
function setChipCount(id, n, status) {
  const chip = els.chips.querySelector(`.chip[data-id="${id}"]`);
  if (!chip) return;
  const nEl = chip.querySelector("[data-n]");
  if (status === "loading") nEl.textContent = "…";
  else if (status === "error") {
    nEl.textContent = "!";
    chip.classList.add("err");
    chip.title = "Failed to load this source";
  } else nEl.textContent = n;
}

// --- loading --------------------------------------------------------------
function loadAll() {
  const enabled = SOURCES.filter((s) => s.enabled);
  let settled = 0;
  const done = () => {
    settled++;
    if (settled === enabled.length && state.all.length === 0) {
      els.loader.hidden = true;
      els.count.textContent = "couldn't reach any game source";
    }
  };
  enabled.forEach((s) => {
    setChipCount(s.id, 0, "loading");
    PROVIDERS[s.id]()
      .then((games) => {
        for (const g of games) g._k = Math.random();
        state.all.push(...games);
        setChipCount(s.id, games.length, "ok");
        applyFilter();
      })
      .catch((err) => {
        console.error(`[${s.id}]`, err);
        setChipCount(s.id, 0, "error");
      })
      .finally(done);
  });
}

// --- filtering / rendering ------------------------------------------------
function applyFilter() {
  if (state.all.length > 0) els.loader.hidden = true;
  const q = state.query.trim().toLowerCase();
  state.filtered = state.all
    .filter((g) => state.active.has(g.source))
    .filter((g) => !q || g.title.toLowerCase().includes(q))
    .sort((a, b) => a._k - b._k);
  els.grid.innerHTML = "";
  state.rendered = 0;
  renderMore();
  updateCount();
}

function updateCount() {
  const total = state.all.length;
  const shown = state.filtered.length;
  els.count.textContent =
    total === 0
      ? "loading games…"
      : `${shown.toLocaleString()} game${shown === 1 ? "" : "s"}` +
        (shown !== total ? ` of ${total.toLocaleString()}` : "");
  els.empty.hidden = shown !== 0;
}

function renderMore() {
  const next = state.filtered.slice(state.rendered, state.rendered + BATCH);
  const frag = document.createDocumentFragment();
  for (const game of next) frag.appendChild(makeTile(game));
  els.grid.appendChild(frag);
  state.rendered += next.length;
}

function makeTile(game) {
  const tile = document.createElement("button");
  tile.className = "tile";
  tile.title = game.title;

  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = game.title;
  const candidates = (game.img && game.img.slice()) || [];
  let ci = 0;
  const useNext = () => {
    if (ci < candidates.length) img.src = candidates[ci++];
    else {
      img.src = SITE.fallbackIcon;
      img.classList.add("placeholder");
    }
  };
  img.addEventListener("error", useNext);
  useNext();

  const label = document.createElement("span");
  label.className = "tlabel";
  label.textContent = game.title;

  const badge = document.createElement("span");
  badge.className = "tbadge";
  const src = SOURCES.find((s) => s.id === game.source);
  badge.style.setProperty("--c", src ? src.color : "#888");

  tile.append(img, label, badge);
  tile.addEventListener("click", () => openGame(game));
  return tile;
}

// --- search ---------------------------------------------------------------
function wireSearch() {
  let t;
  els.search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.query = els.search.value;
      applyFilter();
    }, 120);
  });
}

// --- infinite scroll ------------------------------------------------------
function wireInfiniteScroll() {
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && state.rendered < state.filtered.length)
        renderMore();
    },
    { rootMargin: "600px" }
  );
  io.observe(els.sentinel);
}

// --- player overlay -------------------------------------------------------
// CDN-hosted games are fetched as text and rendered via iframe.srcdoc (see
// embed.js for why); real hosts (e.g. truffled.lol) load via iframe.src.
// `seq` guards against a slow fetch landing after the user switched games.
const player = { candidates: [], idx: 0, game: null, html: null, blobUrl: null, seq: 0 };

function wirePlayer() {
  els.overlay = document.getElementById("overlay");
  els.frame = document.getElementById("frame");
  els.pTitle = document.getElementById("p-title");
  els.pSource = document.getElementById("p-source");
  els.pMirror = document.getElementById("p-mirror");
  els.pLoading = document.getElementById("p-loading");

  document.getElementById("p-close").addEventListener("click", closeGame);
  document.getElementById("p-new").addEventListener("click", openExternalTab);
  document.getElementById("p-full").addEventListener("click", () => {
    if (els.frame.requestFullscreen) els.frame.requestFullscreen();
  });
  els.pMirror.addEventListener("click", () => {
    if (player.candidates.length < 2) return;
    loadCandidate((player.idx + 1) % player.candidates.length);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.overlay.hidden) closeGame();
  });
}

function updateMirrorLabel() {
  els.pMirror.hidden = player.candidates.length < 2;
  els.pMirror.textContent = `Mirror ${player.idx + 1}/${player.candidates.length}`;
}

function clearFrame() {
  els.frame.removeAttribute("src");
  els.frame.removeAttribute("srcdoc");
}

// Try candidates starting at `start`; CDN URLs are fetched and injected, and a
// failed fetch auto-advances to the next mirror.
async function loadCandidate(start) {
  const seq = ++player.seq;
  const n = player.candidates.length;
  for (let step = 0; step < n; step++) {
    const i = (start + step) % n;
    const url = player.candidates[i];
    player.idx = i;
    updateMirrorLabel();

    if (!needsInject(url)) {
      player.html = null;
      clearFrame();
      els.frame.src = url;
      els.pLoading.hidden = true;
      return;
    }

    try {
      els.pLoading.hidden = false;
      clearFrame();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = withBase(await res.text(), url);
      if (seq !== player.seq) return;
      player.html = html;
      els.frame.srcdoc = html;
      els.pLoading.hidden = true;
      return;
    } catch (err) {
      if (seq !== player.seq) return;
      console.warn(`mirror failed: ${url}`, err);
    }
  }
  els.pLoading.hidden = true;
  player.html = null;
  clearFrame();
  els.frame.srcdoc = `<style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0d12;color:#cac4d0;font:15px system-ui;text-align:center}</style><p>Couldn't load this game from any mirror.<br>Check your connection or try again later.</p>`;
}

function openExternalTab() {
  if (player.html) {
    if (player.blobUrl) URL.revokeObjectURL(player.blobUrl);
    player.blobUrl = URL.createObjectURL(new Blob([player.html], { type: "text/html" }));
    window.open(player.blobUrl, "_blank");
  } else {
    const url = player.candidates[player.idx];
    if (url) window.open(url, "_blank", "noopener");
  }
}

function openGame(game) {
  const src = SOURCES.find((s) => s.id === game.source);
  if ((!game.embed || game.embed.length === 0) && game.external) {
    window.open(game.external, "_blank", "noopener");
    return;
  }
  player.game = game;
  player.candidates = game.embed || (game.external ? [game.external] : []);
  els.pTitle.textContent = game.title;
  els.pSource.textContent = src ? src.label : "";
  els.pSource.style.setProperty("--c", src ? src.color : "#888");
  els.overlay.hidden = false;
  document.body.classList.add("locked");
  loadCandidate(0);
}

function closeGame() {
  player.seq++;
  player.html = null;
  if (player.blobUrl) {
    URL.revokeObjectURL(player.blobUrl);
    player.blobUrl = null;
  }
  els.overlay.hidden = true;
  els.pLoading.hidden = true;
  clearFrame();
  document.body.classList.remove("locked");
}

init();
