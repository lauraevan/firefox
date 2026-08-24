/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { actionCreators as ac } from "common/Actions.mjs";
import { connect } from "react-redux";
import { SafariStartPageInner } from "content-src/components/Safari/SafariStartPageInner";

// Split real Top Sites rows into Safari's two buckets. When the user has pinned
// sites they become Favorites and everything else is Frequently Visited; on a
// fresh profile with nothing pinned, the frecency-ranked sites fill Favorites
// so the page is never empty.
export function partitionTopSites(rows = []) {
  const usable = rows.filter(row => row && row.url && !row.isSponsoredTopSite);
  const pinned = usable.filter(row => row.isPinned);
  const unpinned = usable.filter(row => !row.isPinned);
  if (pinned.length) {
    return { favorites: pinned, frequentlyVisited: unpinned };
  }
  return { favorites: unpinned, frequentlyVisited: [] };
}

// Real tracker-blocking data reuses the existing PrivacyFeed / PrivacyWidget
// pipeline (PrivacyMetricsService), so the count is genuine and never faked.
function privacyReportFrom(state) {
  const widget = state.PrivacyWidget;
  if (!widget?.initialized || typeof widget.trackersToday !== "number") {
    return null;
  }
  return {
    trackersBlocked: widget.trackersToday,
    lastUpdated: widget.lastUpdated,
  };
}

function mapStateToProps(state) {
  const prefs = state.Prefs.values;
  const { favorites, frequentlyVisited } = partitionTopSites(
    state.TopSites?.rows
  );
  const showPrivacyReport = prefs["safari.showPrivacyReport"] !== false;
  return {
    favorites,
    frequentlyVisited,
    showFavorites: prefs["safari.showFavorites"] !== false,
    showFrequentlyVisited: prefs["safari.showFrequentlyVisited"] !== false,
    showPrivacyReport,
    privacyReport: showPrivacyReport ? privacyReportFrom(state) : null,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onSetPref: (name, value) => dispatch(ac.SetPref(name, value)),
  };
}

export const SafariStartPage = connect(
  mapStateToProps,
  mapDispatchToProps
)(SafariStartPageInner);
