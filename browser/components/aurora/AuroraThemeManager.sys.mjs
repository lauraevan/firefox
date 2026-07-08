/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Applies the user-selected Aurora wallpaper to browser windows by
 * overriding the lightweight theme background variables. The wallpaper is
 * chosen via the browser.aurora.wallpaper pref: either the name of a
 * bundled wallpaper, "default" to keep the active theme's own background,
 * or a file:// URL for a custom image.
 */

const PREF_WALLPAPER = "browser.aurora.wallpaper";
const PREF_ACCENT = "browser.aurora.accent";

const BUNDLED_WALLPAPERS = new Map([
  ["aurora", "resource://builtin-themes/aurora/background-aurora.svg"],
  ["glass", "resource://builtin-themes/aurora-glass/background-glass.svg"],
  ["dusk", "chrome://browser/content/aurora/wallpapers/dusk.svg"],
  ["midnight", "chrome://browser/content/aurora/wallpapers/midnight.svg"],
  ["aurora-flow", "chrome://browser/content/aurora/wallpapers/aurora-flow.svg"],
]);

const THEME_VARIABLES = [
  "--lwt-additional-images",
  "--lwt-background-alignment",
  "--lwt-background-tiling",
  "--lwt-background-size",
];

const ACCENT_VARIABLES = ["--aurora-accent", "--lwt-tab-line-color"];

export const AuroraThemeManager = {
  _initialized: false,

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;
    Services.prefs.addObserver(PREF_WALLPAPER, this);
    Services.prefs.addObserver(PREF_ACCENT, this);
    Services.obs.addObserver(this, "browser-delayed-startup-finished");
    Services.obs.addObserver(this, "lightweight-theme-styling-update");
  },

  observe(subject, topic) {
    switch (topic) {
      case "browser-delayed-startup-finished":
        this.applyTo(subject);
        break;
      case "nsPref:changed":
        this.applyAll();
        break;
      case "lightweight-theme-styling-update":
        // LightweightThemeConsumer rewrites the inline theme variables when
        // the theme changes; re-apply our override after it has run.
        Services.tm.dispatchToMainThread(() => this.applyAll());
        break;
    }
  },

  resolveAccent() {
    let value = Services.prefs.getStringPref(PREF_ACCENT, "");
    // Accept only simple color syntax; anything else falls back to the
    // theme's own accent.
    if (/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/.test(value)) {
      return value;
    }
    return null;
  },

  resolveWallpaperURL() {
    let value = Services.prefs.getStringPref(PREF_WALLPAPER, "default");
    if (!value || value == "default") {
      return null;
    }
    if (BUNDLED_WALLPAPERS.has(value)) {
      return BUNDLED_WALLPAPERS.get(value);
    }
    if (value.startsWith("file://")) {
      return value;
    }
    return null;
  },

  applyAll() {
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      this.applyTo(win);
    }
  },

  applyTo(win) {
    let root = win.document?.documentElement;
    if (!root) {
      return;
    }
    let url = this.resolveWallpaperURL();
    if (url) {
      root.style.setProperty(
        "--lwt-additional-images",
        `url("${url.replaceAll('"', '\\"')}")`
      );
      root.style.setProperty("--lwt-background-alignment", "center top");
      root.style.setProperty("--lwt-background-tiling", "no-repeat");
      root.style.setProperty("--lwt-background-size", "cover");
    } else {
      for (let variable of THEME_VARIABLES) {
        root.style.removeProperty(variable);
      }
    }

    let accent = this.resolveAccent();
    if (accent) {
      for (let variable of ACCENT_VARIABLES) {
        root.style.setProperty(variable, accent);
      }
    } else {
      for (let variable of ACCENT_VARIABLES) {
        root.style.removeProperty(variable);
      }
    }
  },
};
