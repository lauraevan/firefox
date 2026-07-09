/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Aurora Start page. Runs privileged as the new tab page; every privileged
 * call is guarded so the page also renders standalone (demos, tests). */

const DEFAULT_FAVORITES = [
  {
    label: "YouTube",
    url: "https://www.youtube.com",
    glyph: "Y",
    color: "#e53935",
  },
  {
    label: "Reddit",
    url: "https://www.reddit.com",
    glyph: "R",
    color: "#ff5722",
  },
  { label: "GitHub", url: "https://github.com", glyph: "G", color: "#30363d" },
  {
    label: "Wikipedia",
    url: "https://www.wikipedia.org",
    glyph: "W",
    color: "#5c6bc0",
  },
  { label: "X", url: "https://x.com", glyph: "X", color: "#1d9bf0" },
  {
    label: "Figma",
    url: "https://www.figma.com",
    glyph: "F",
    color: "#a259ff",
  },
  {
    label: "Notion",
    url: "https://www.notion.so",
    glyph: "N",
    color: "#3b4252",
  },
];

const FAVORITES_PREF = "browser.aurora.favorites";

// Services and Components are ChromeOnly globals, present only when the
// page runs privileged as the new tab page.
function services() {
  return globalThis.Services || null;
}

function loadFavorites() {
  let svc = services();
  if (svc) {
    try {
      let raw = svc.prefs.getStringPref(FAVORITES_PREF, "");
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
  }
  return DEFAULT_FAVORITES;
}

function saveFavorites(favs) {
  let svc = services();
  if (svc) {
    try {
      svc.prefs.setStringPref(FAVORITES_PREF, JSON.stringify(favs));
    } catch (e) {}
  }
}

function renderFavorites() {
  let grid = document.getElementById("fav-grid");
  grid.textContent = "";
  let favs = loadFavorites();
  for (let fav of favs) {
    let a = document.createElement("a");
    a.className = "fav";
    a.href = fav.url;
    let tile = document.createElement("div");
    tile.className = "tile";
    let dot = document.createElement("div");
    dot.className = "dot";
    dot.style.background = fav.color || "#3b4252";
    dot.textContent = (fav.glyph || fav.label[0] || "?").slice(0, 1);
    tile.appendChild(dot);
    let label = document.createElement("span");
    label.textContent = fav.label;
    a.append(tile, label);
    grid.appendChild(a);
  }
  let add = document.createElement("a");
  add.className = "fav";
  add.href = "#";
  let tile = document.createElement("div");
  tile.className = "tile";
  tile.textContent = "+";
  let label = document.createElement("span");
  label.textContent = "Add";
  add.append(tile, label);
  add.addEventListener("click", event => {
    event.preventDefault();
    let url = prompt("Site address (https://...)");
    if (!url) {
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      url = "https://" + url;
    }
    let siteName =
      prompt("Name") || new URL(url).hostname.replace(/^www\./, "");
    saveFavorites(
      loadFavorites().concat({
        label: siteName,
        url,
        glyph: siteName[0].toUpperCase(),
        color: "#5c6bc0",
      })
    );
    renderFavorites();
  });
  grid.appendChild(add);
}

const URL_LIKE = /^(https?:\/\/|about:)|^[\w-]+(\.[\w-]+)+(\/|$)/;

async function submitSearch(event) {
  event.preventDefault();
  let query = document.getElementById("search-input").value.trim();
  if (!query) {
    return;
  }
  if (URL_LIKE.test(query)) {
    let url = /^(https?:\/\/|about:)/.test(query) ? query : "https://" + query;
    window.location.href = url;
    return;
  }
  let svc = services();
  if (svc) {
    try {
      let engine = await svc.search.getDefault();
      window.location.href = engine.getSubmission(query).uri.spec;
      return;
    } catch (e) {}
  }
  window.location.href =
    "https://duckduckgo.com/?q=" + encodeURIComponent(query);
}

async function updatePrivacy() {
  try {
    let components = globalThis.Components;
    let trackingDB = components.classes[
      "@mozilla.org/tracking-db-service;1"
    ].getService(components.interfaces.nsITrackingDBService);
    let total = await trackingDB.sumAllEvents();
    let sub = document.getElementById("privacy-sub");
    sub.textContent =
      total == 1
        ? "1 tracker blocked so far"
        : `${total.toLocaleString()} trackers blocked so far`;

    let weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    let rows = await trackingDB.getEventsByDateRange(weekAgo, Date.now());
    let perDay = new Map();
    for (let row of rows) {
      let day = row.getResultByName("timestamp").slice(0, 10);
      perDay.set(day, (perDay.get(day) || 0) + row.getResultByName("count"));
    }
    let weekTotal = [...perDay.values()].reduce((a, b) => a + b, 0);
    document.getElementById("insights-title").textContent =
      `${weekTotal.toLocaleString()} trackers blocked this week`;
    renderChart([...perDay.values()]);
  } catch (e) {
    renderChart([]);
  }
}

function renderChart(values) {
  let chart = document.getElementById("mini-chart");
  chart.textContent = "";
  if (!values.length) {
    values = [3, 6, 4, 8, 5, 9, 7];
  }
  let max = Math.max(...values, 1);
  for (let value of values.slice(-7)) {
    let bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(10, Math.round((value / max) * 100))}%`;
    chart.appendChild(bar);
  }
}

function openAssistant() {
  try {
    let win = window.browsingContext.topChromeWindow;
    win.SidebarController.show("viewGenaiChatSidebar");
  } catch (e) {
    window.location.href = "about:preferences#ai";
  }
}

document.getElementById("search-form").addEventListener("submit", submitSearch);
document
  .getElementById("open-assistant")
  .addEventListener("click", openAssistant);
document.getElementById("scroll-down").addEventListener("click", () => {
  document.querySelector(".favorites").scrollIntoView({ behavior: "smooth" });
});

renderFavorites();
updatePrivacy();
