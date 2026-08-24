/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState } from "react";
import { SafariSection } from "content-src/components/Safari/SafariSection";
import { SafariTile } from "content-src/components/Safari/SafariTile";
import { SafariPrivacyCard } from "content-src/components/Safari/SafariPrivacyCard";
import { SafariCustomizePopover } from "content-src/components/Safari/SafariCustomizePopover";
import { SafariStartPageCard } from "content-src/components/Safari/SafariStartPageCard";
import { SafariSyncCard } from "content-src/components/Safari/SafariSyncCard";
import { SafariSuggestionCard } from "content-src/components/Safari/SafariSuggestionCard";

function TileGrid({ links, onOpen }) {
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

function SuggestionGrid({ items }) {
  return (
    <div className="safari-suggestions">
      {items.map((item, i) => (
        <SafariSuggestionCard key={item.guid || item.url || i} item={item} />
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
    suggestions = [],
    recentlyViewed = [],
    showFavorites = true,
    showRecentlyViewed = true,
    showSuggestions = true,
    showFrequentlyVisited = false,
    showPrivacyReport = false,
    privacyReport = null,
    wallpaper = null,
    startPageCardDismissed = false,
    syncCardDismissed = false,
    onOpenLink,
    onSetPref = () => {},
  } = props;

  const [customizeOpen, setCustomizeOpen] = useState(false);

  const hasPrivacy =
    showPrivacyReport &&
    privacyReport &&
    typeof privacyReport.trackersBlocked === "number";

  const showRecentlyViewedSection =
    showRecentlyViewed && (recentlyViewed.length > 0 || !syncCardDismissed);

  const customizeSections = [
    { label: "Favorites", pref: "safari.showFavorites", value: showFavorites },
    {
      label: "Recently Viewed",
      pref: "safari.showRecentlyViewed",
      value: showRecentlyViewed,
    },
    {
      label: "Suggestions",
      pref: "safari.showSuggestions",
      value: showSuggestions,
    },
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
          {!startPageCardDismissed ? (
            <SafariStartPageCard
              onCustomize={() => setCustomizeOpen(true)}
              onDismiss={() => onSetPref("safari.startPageCardDismissed", true)}
            />
          ) : null}

          {showFavorites && favorites.length > 0 ? (
            <SafariSection title="Favorites">
              <TileGrid links={favorites} onOpen={onOpenLink} />
            </SafariSection>
          ) : null}

          {showRecentlyViewedSection ? (
            <SafariSection title="Recently Viewed">
              {recentlyViewed.length > 0 ? (
                <SuggestionGrid items={recentlyViewed} />
              ) : (
                <SafariSyncCard
                  onDismiss={() => onSetPref("safari.syncCardDismissed", true)}
                />
              )}
            </SafariSection>
          ) : null}

          {showSuggestions && suggestions.length > 0 ? (
            <SafariSection title="Suggestions">
              <SuggestionGrid items={suggestions} />
            </SafariSection>
          ) : null}

          {showFrequentlyVisited && frequentlyVisited.length > 0 ? (
            <SafariSection title="Frequently Visited">
              <TileGrid links={frequentlyVisited} onOpen={onOpenLink} />
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
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
      />
    </div>
  );
}
