/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { SafariSection } from "content-src/components/Safari/SafariSection";
import { SafariTile } from "content-src/components/Safari/SafariTile";
import { SafariPrivacyCard } from "content-src/components/Safari/SafariPrivacyCard";
import { SafariCustomizePopover } from "content-src/components/Safari/SafariCustomizePopover";

function Grid({ links, onOpen }) {
  return (
    <div className="safari-grid">
      {links.map((link, i) => (
        <SafariTile
          key={link.guid || link.url || i}
          link={link}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

// Presentational start page. Deliberately free of Redux so it can be rendered
// directly from a preview/test harness with representative data. All browser
// state arrives via props; the connected container lives in SafariStartPage.jsx.
export function SafariStartPageInner(props) {
  const {
    favorites = [],
    frequentlyVisited = [],
    showFavorites = true,
    showFrequentlyVisited = true,
    showPrivacyReport = true,
    privacyReport = null,
    wallpaper = null,
    onOpenLink,
    onSetPref = () => {},
  } = props;

  const hasPrivacy =
    showPrivacyReport &&
    privacyReport &&
    typeof privacyReport.trackersBlocked === "number";

  const customizeSections = [
    { label: "Favorites", pref: "safari.showFavorites", value: showFavorites },
    {
      label: "Frequently Visited",
      pref: "safari.showFrequentlyVisited",
      value: showFrequentlyVisited,
    },
    {
      label: "Privacy Report",
      pref: "safari.showPrivacyReport",
      value: showPrivacyReport,
    },
  ];

  return (
    <div className="safari-startpage">
      <div
        className={`safari-startpage__background${wallpaper?.url ? " has-wallpaper" : ""}`}
        style={
          wallpaper?.url
            ? { backgroundImage: `url("${wallpaper.url}")` }
            : undefined
        }
      />
      <div className="safari-startpage__scroll">
        <div className="safari-startpage__content">
          {showFavorites && favorites.length > 0 ? (
            <SafariSection title="Favorites">
              <Grid links={favorites} onOpen={onOpenLink} />
            </SafariSection>
          ) : null}

          {showFrequentlyVisited && frequentlyVisited.length > 0 ? (
            <SafariSection title="Frequently Visited">
              <Grid links={frequentlyVisited} onOpen={onOpenLink} />
            </SafariSection>
          ) : null}

          {hasPrivacy ? (
            <SafariSection title="Privacy Report">
              <SafariPrivacyCard report={privacyReport} />
            </SafariSection>
          ) : null}
        </div>
      </div>
      <SafariCustomizePopover
        sections={customizeSections}
        onSetPref={onSetPref}
      />
    </div>
  );
}
