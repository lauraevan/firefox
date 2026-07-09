/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Preferences } from "chrome://global/content/preferences/Preferences.mjs";
import { SettingGroupManager } from "chrome://browser/content/preferences/config/SettingGroupManager.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
  BuiltInThemes: "resource:///modules/BuiltInThemes.sys.mjs",
});

const AURORA_THEME_ID = "firefox-aurora@mozilla.org";
const GLASS_THEME_ID = "firefox-aurora-glass@mozilla.org";

async function enableBuiltInTheme(id) {
  await lazy.BuiltInThemes.ensureBuiltInThemes();
  let addon = await lazy.AddonManager.getAddonByID(id);
  if (addon) {
    await addon.enable();
  }
}

Preferences.addAll([
  { id: "browser.aurora.skin.enabled", type: "bool" },
  { id: "browser.aurora.liquidGlass.enabled", type: "bool" },
  { id: "browser.aurora.wallpaper", type: "string" },
  { id: "browser.aurora.accent", type: "string" },
]);

// Turning Liquid Glass on switches to the frosted built-in theme along with
// the blur/depth CSS; turning it off returns to the Aurora theme.
Preferences.addSetting({
  id: "aurora-liquid-glass",
  pref: "browser.aurora.liquidGlass.enabled",
  set(val) {
    enableBuiltInTheme(val ? GLASS_THEME_ID : AURORA_THEME_ID);
    return !!val;
  },
});

Preferences.addSetting({
  id: "aurora-effects",
  pref: "browser.aurora.skin.enabled",
});

Preferences.addSetting({
  id: "aurora-wallpaper",
  pref: "browser.aurora.wallpaper",
  get(val) {
    return val || "default";
  },
});

// Accent color for the tab line, glows, and focus rings. An empty pref
// means the active theme's own accent.
Preferences.addSetting({
  id: "aurora-accent",
  pref: "browser.aurora.accent",
  get(val) {
    return val || "#8a9bff";
  },
});

Preferences.addSetting({
  id: "aurora-wallpaper-custom",
  onUserClick(event) {
    event.preventDefault();
    // @ts-ignore topChromeWindow global
    let win = window.browsingContext.topChromeWindow;
    let fp = win.Cc["@mozilla.org/filepicker;1"].createInstance(
      win.Ci.nsIFilePicker
    );
    fp.init(win.browsingContext, "", win.Ci.nsIFilePicker.modeOpen);
    fp.appendFilters(win.Ci.nsIFilePicker.filterImages);
    fp.open(result => {
      if (result == win.Ci.nsIFilePicker.returnOK && fp.fileURL) {
        Services.prefs.setStringPref(
          "browser.aurora.wallpaper",
          fp.fileURL.spec
        );
      }
    });
  },
});

SettingGroupManager.registerGroups({
  aurora: {
    l10nId: "aurora-appearance-group",
    iconSrc: "chrome://browser/skin/customize.svg",
    headingLevel: 2,
    items: [
      {
        id: "aurora-liquid-glass",
        l10nId: "aurora-liquid-glass-toggle",
        control: "moz-toggle",
      },
      {
        id: "aurora-effects",
        l10nId: "aurora-effects-toggle",
        control: "moz-toggle",
      },
      {
        id: "aurora-accent",
        l10nId: "aurora-accent-picker",
        control: "moz-input-color",
      },
      {
        id: "aurora-wallpaper",
        l10nId: "aurora-wallpaper-picker",
        control: "moz-visual-picker",
        options: [
          {
            value: "default",
            l10nId: "aurora-wallpaper-choice-default",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc:
                "resource://builtin-themes/aurora/background-aurora.svg",
            },
          },
          {
            value: "aurora",
            l10nId: "aurora-wallpaper-choice-aurora",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc:
                "resource://builtin-themes/aurora/background-aurora.svg",
            },
          },
          {
            value: "glass",
            l10nId: "aurora-wallpaper-choice-glass",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc:
                "resource://builtin-themes/aurora-glass/background-glass.svg",
            },
          },
          {
            value: "dusk",
            l10nId: "aurora-wallpaper-choice-dusk",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc: "chrome://browser/content/aurora/wallpapers/dusk.svg",
            },
          },
          {
            value: "midnight",
            l10nId: "aurora-wallpaper-choice-midnight",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc:
                "chrome://browser/content/aurora/wallpapers/midnight.svg",
            },
          },
          {
            value: "aurora-flow",
            l10nId: "aurora-wallpaper-choice-flow",
            controlAttrs: {
              class: "setting-chooser-item",
              imagesrc:
                "chrome://browser/content/aurora/wallpapers/aurora-flow.svg",
            },
          },
        ],
      },
      {
        id: "aurora-wallpaper-custom",
        l10nId: "aurora-wallpaper-custom-button",
        control: "moz-box-button",
      },
    ],
  },
});
