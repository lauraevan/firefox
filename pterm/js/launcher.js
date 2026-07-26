/* PTerm - game launcher overlay */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const U = PT.util;

  const launcher = {
    _open: false,
    _game: null,
    _iframe: null,
    _watchdog: null,

    init() {
      this.el = document.getElementById("pt-overlay");
      this.titleEl = document.getElementById("pt-overlay-title");
      this.bodyEl = document.getElementById("pt-overlay-body");
      this.statusEl = document.getElementById("pt-overlay-status");

      document.getElementById("pt-overlay-close").addEventListener("click", () => this.close());
      document.getElementById("pt-overlay-newtab").addEventListener("click", () => {
        if (this._game) window.open(this._game.launchUrl, "_blank", "noopener");
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

    launch(game) {
      if (!game || !game.launchUrl) return;
      this._game = game;
      this._open = true;
      this.el.hidden = false;
      this.titleEl.textContent = game.name + "  ::  " + game.sourceLabel;
      document.body.style.overflow = "hidden";

      // clear previous iframe
      const old = this.bodyEl.querySelector("iframe");
      if (old) old.remove();

      this.statusEl.style.display = "flex";
      this.statusEl.innerHTML =
        '<div class="spin">[ loading ]</div>' +
        '<div class="c-dim">booting ' + U.esc(game.name) + " ...</div>";

      const frame = document.createElement("iframe");
      frame.setAttribute("allow", "autoplay; fullscreen; gamepad; accelerometer; gyroscope; " +
        "clipboard-read; clipboard-write; cross-origin-isolated; pointer-lock");
      frame.setAttribute("allowfullscreen", "true");
      frame.referrerPolicy = "no-referrer";
      frame.src = game.launchUrl;
      this._iframe = frame;

      let loaded = false;
      frame.addEventListener("load", () => {
        loaded = true;
        this.statusEl.style.display = "none";
      });

      // Watchdog: if the frame never fires load (X-Frame-Options / CSP), offer a new tab.
      clearTimeout(this._watchdog);
      this._watchdog = setTimeout(() => {
        if (!loaded && this._open) this.showBlocked(game);
      }, 9000);

      this.bodyEl.appendChild(frame);
      frame.focus();
    },

    showBlocked(game) {
      this.statusEl.style.display = "flex";
      const alt = (game.launchAlt && game.launchAlt[0]) || null;
      this.statusEl.innerHTML =
        '<div class="spin">[ ! ]</div>' +
        '<div>this game is taking a while, or it refuses to run in a frame.</div>' +
        '<div class="c-dim">try opening it directly:</div>' +
        '<div><a href="' + U.esc(game.launchUrl) + '" target="_blank" rel="noopener">open ' +
        U.esc(game.name) + " in a new tab &#8599;</a></div>" +
        (alt ? '<div class="c-mute"><a href="' + U.esc(alt) + '" target="_blank" rel="noopener">try mirror &#8599;</a></div>' : "");
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
      if (document.fullscreenElement) {
        (document.exitFullscreen || function () {}).call(document);
      }
      const g = this._game;
      this._game = null;
      if (PT.terminal) {
        PT.terminal.focus();
        if (g) PT.terminal.println('<span class="c-dim">[psh] session for </span>' +
          U.esc(g.name) + '<span class="c-dim"> ended. exit code 0</span>');
        PT.terminal.showPrompt();
      }
    },
  };

  PT.launcher = launcher;
})(window.PTerm);
