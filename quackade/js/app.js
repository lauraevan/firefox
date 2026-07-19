import { SITE, SOURCES } from "./config.js";
import { PROVIDERS } from "./providers.js";

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

  buildChips();
  wireSearch();
  wirePlayer();
  wireInfiniteScroll();
  loadAll();
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
  SOURCES.filter((s) => s.enabled).forEach((s) => {
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
      });
  });
}

// --- filtering / rendering ------------------------------------------------
function applyFilter() {
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
      ? "loading the pond…"
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
const player = { candidates: [], idx: 0, game: null };

function wirePlayer() {
  els.overlay = document.getElementById("overlay");
  els.frame = document.getElementById("frame");
  els.pTitle = document.getElementById("p-title");
  els.pSource = document.getElementById("p-source");
  els.pMirror = document.getElementById("p-mirror");

  document.getElementById("p-close").addEventListener("click", closeGame);
  document.getElementById("p-new").addEventListener("click", () => {
    const url = player.candidates[player.idx];
    if (url) window.open(url, "_blank", "noopener");
  });
  document.getElementById("p-full").addEventListener("click", () => {
    if (els.frame.requestFullscreen) els.frame.requestFullscreen();
  });
  els.pMirror.addEventListener("click", () => {
    if (player.candidates.length < 2) return;
    player.idx = (player.idx + 1) % player.candidates.length;
    els.frame.src = player.candidates[player.idx];
    updateMirrorLabel();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.overlay.hidden) closeGame();
  });
}

function updateMirrorLabel() {
  els.pMirror.hidden = player.candidates.length < 2;
  els.pMirror.textContent = `Mirror ${player.idx + 1}/${player.candidates.length}`;
}

function openGame(game) {
  const src = SOURCES.find((s) => s.id === game.source);
  if ((!game.embed || game.embed.length === 0) && game.external) {
    window.open(game.external, "_blank", "noopener");
    return;
  }
  player.game = game;
  player.candidates = game.embed || (game.external ? [game.external] : []);
  player.idx = 0;
  els.pTitle.textContent = game.title;
  els.pSource.textContent = src ? src.label : "";
  els.pSource.style.setProperty("--c", src ? src.color : "#888");
  els.frame.src = player.candidates[0] || "about:blank";
  updateMirrorLabel();
  els.overlay.hidden = false;
  document.body.classList.add("locked");
}

function closeGame() {
  els.overlay.hidden = true;
  els.frame.src = "about:blank";
  document.body.classList.remove("locked");
}

init();
