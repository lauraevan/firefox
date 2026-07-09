/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A toolbar button showing the number of trackers blocked by tracking
 * protection, backed by the same database as about:protections. Clicking
 * it opens the full protections report.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  CustomizableUI: "resource:///modules/CustomizableUI.sys.mjs",
  setInterval: "resource://gre/modules/Timer.sys.mjs",
});

const WIDGET_ID = "aurora-shield-button";
const REFRESH_MS = 5 * 60 * 1000;

function formatCount(count) {
  if (count >= 10000) {
    return `${Math.round(count / 1000)}k`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

export const AuroraShield = {
  _initialized: false,
  _nodes: new Set(),

  init() {
    if (this._initialized) {
      return;
    }
    this._initialized = true;

    let shield = this;
    lazy.CustomizableUI.createWidget({
      id: WIDGET_ID,
      label: "Aurora Shield",
      tooltiptext: "Trackers blocked by Aurora - open the full report",
      defaultArea: lazy.CustomizableUI.AREA_NAVBAR,
      localized: false,
      onCreated(node) {
        node.classList.add("badged-button");
        shield._nodes.add(node);
        shield.refreshBadges();
      },
      onDestroyed(node) {
        shield._nodes.delete(node);
      },
      onCommand(event) {
        event.target.ownerGlobal.openTrustedLinkIn?.(
          "about:protections",
          "tab"
        );
      },
    });

    lazy.setInterval(() => this.refreshBadges(), REFRESH_MS);
  },

  async refreshBadges() {
    let total = 0;
    try {
      let trackingDB = Cc["@mozilla.org/tracking-db-service;1"].getService(
        Ci.nsITrackingDBService
      );
      total = await trackingDB.sumAllEvents();
    } catch (e) {
      return;
    }
    let badge = total ? formatCount(total) : "";
    for (let node of this._nodes) {
      if (node.isConnected) {
        node.setAttribute("badge", badge);
      }
    }
  },
};
