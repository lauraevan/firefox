/* Arkeus - game launcher overlay */
window.Arkeus = window.Arkeus || {};

(function (PT) {
  "use strict";

  const U = PT.util;

  /* Probe candidate URLs and return the first that actually responds. Games get
     removed from source repos (404) and CDNs rate-limit, so we don't just trust
     the first URL. A 404/5xx is skipped; a CORS/405 is "unknown" (might still
     work in a frame) and kept as a fallback. */
  async function pickWorkingUrl(cands) {
    let unknown = null;
    for (const u of cands) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4500);
        const res = await fetch(u, { method: "HEAD", mode: "cors", credentials: "omit", signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) return u;
        if ((res.status === 405 || res.status === 403) && unknown === null) unknown = u;
      } catch (e) {
        if (unknown === null) unknown = u;
      }
    }
    return unknown || cands[0];
  }

  const launcher = {
    _open: false,
    _game: null,
    _lastGame: null,
    _iframe: null,
    _watchdog: null,
    _resolvedUrl: null,

    init() {
      this.el = document.getElementById("pt-overlay");
      this.titleEl = document.getElementById("pt-overlay-title");
      this.bodyEl = document.getElementById("pt-overlay-body");
      this.statusEl = document.getElementById("pt-overlay-status");

      document.getElementById("pt-overlay-close").addEventListener("click", () => this.close());
      document.getElementById("pt-overlay-newtab").addEventListener("click", () => {
        window.open(this._resolvedUrl || (this._game && this._game.launchUrl), "_blank", "noopener");
      });
      document.getElementById("pt-overlay-full").addEventListener("click", () => this.toggleFullscreen());

      document.addEventListener("keydown", (e) => {
        if (!this._open) return;
        if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && (e.key === "q" || e.key === "Q"))) {
          e.preventDefault();
          this.close();
        }
      });
    },

    isOpen() { return this._open; },

    candidates(game) {
      return [game.launchUrl].concat(game.launchAlt || []).filter(Boolean);
    },

    launch(game) {
      if (!game || !game.launchUrl) return;
      this._lastGame = game;
      const mode = U.store.get("launchMode") || "frame";
      const cands = this.candidates(game);

      if (mode === "tab") {
        if (PT.terminal) PT.terminal.println('<span class="c-dim">finding a working server ...</span>');
        pickWorkingUrl(cands).then((url) => {
          this._resolvedUrl = url;
          const w = window.open(url, "_blank", "noopener");
          if (PT.terminal) {
            if (!w) PT.terminal.printError('pop-up blocked. allow pop-ups for this site, or run <span class="c-accent">mode frame</span>.');
            else PT.terminal.println('<span class="c-dim">launched</span> ' + U.esc(game.name) + ' <span class="c-dim">in a new tab.</span>');
          }
        });
        return;
      }

      this._game = game;
      this._open = true;
      this._resolvedUrl = null;
      this.el.hidden = false;
      this.titleEl.textContent = game.name + "  ::  " + game.sourceLabel;
      document.body.style.overflow = "hidden";
      const old = this.bodyEl.querySelector("iframe");
      if (old) old.remove();
      this.statusEl.style.display = "flex";
      this.statusEl.innerHTML = '<div class="spin">[ connecting ]</div>' +
        '<div class="c-dim">finding a working server for ' + U.esc(game.name) + " ...</div>";

      pickWorkingUrl(cands).then((url) => {
        if (!this._open || this._game !== game) return;
        this._resolvedUrl = url;
        this._mount(url, game);
      });
    },

    _mount(url, game) {
      const old = this.bodyEl.querySelector("iframe");
      if (old) old.remove();
      this.statusEl.style.display = "flex";
      this.statusEl.innerHTML = '<div class="spin">[ loading ]</div>' +
        '<div class="c-dim">booting ' + U.esc(game.name) + " ...</div>";

      const frame = document.createElement("iframe");
      frame.setAttribute("allow", "autoplay; fullscreen; gamepad; accelerometer; gyroscope; " +
        "clipboard-read; clipboard-write; cross-origin-isolated; pointer-lock");
      frame.setAttribute("allowfullscreen", "true");
      frame.referrerPolicy = "no-referrer";
      frame.src = url;
      this._iframe = frame;

      let loaded = false;
      frame.addEventListener("load", () => { loaded = true; this.statusEl.style.display = "none"; });

      clearTimeout(this._watchdog);
      this._watchdog = setTimeout(() => { if (!loaded && this._open) this.showBlocked(game); }, 12000);

      this.bodyEl.appendChild(frame);
      frame.focus();
    },

    showBlocked(game) {
      this.statusEl.style.display = "flex";
      const url = this._resolvedUrl || game.launchUrl;
      this.statusEl.innerHTML =
        '<div class="spin">[ ! ]</div>' +
        "<div>this game is slow to load, or it refuses to run inside a frame.</div>" +
        '<div class="c-dim">open it directly, or press esc and try <span class="c-accent">mode tab</span>:</div>' +
        '<div><a href="' + U.esc(url) + '" target="_blank" rel="noopener">open ' +
        U.esc(game.name) + " in a new tab &#8599;</a></div>";
    },

    toggleFullscreen() {
      const el = this.el;
      if (!document.fullscreenElement) {
        (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      }
    },

    close() {
      if (!this._open) return;
      clearTimeout(this._watchdog);
      this._open = false;
      this.el.hidden = true;
      const frame = this.bodyEl.querySelector("iframe");
      if (frame) frame.remove();
      this._iframe = null;
      document.body.style.overflow = "";
      if (document.fullscreenElement) (document.exitFullscreen || function () {}).call(document);
      const g = this._game;
      this._game = null;
      if (PT.terminal) {
        PT.terminal.focus();
        if (g) PT.terminal.println('<span class="c-dim">[ash] session for </span>' +
          U.esc(g.name) + '<span class="c-dim"> ended. exit code 0</span>');
        PT.terminal.showPrompt();
      }
    },
  };

  PT.launcher = launcher;
})(window.Arkeus);
