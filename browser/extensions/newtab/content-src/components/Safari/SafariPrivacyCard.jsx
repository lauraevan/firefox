/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import {
  ShieldIcon,
  ChevronRightIcon,
} from "content-src/components/Safari/icons";

// `report.trackersBlocked` is a real count sourced from PrivacyMetricsService
// (the same tracking-protection data behind about:protections). The card is
// only rendered when a real number is available, so the figure is never
// fabricated. The count is a per-day total, so the copy says "Today".
export function SafariPrivacyCard({ report, onOpen }) {
  const count = report?.trackersBlocked || 0;

  return (
    <a
      className="safari-privacy-card"
      href="about:protections"
      onClick={onOpen}
    >
      <span className="safari-privacy-card__glyph">
        <ShieldIcon />
      </span>
      <span className="safari-privacy-card__text">
        Today, Safari has prevented <strong>{count.toLocaleString()}</strong>{" "}
        {count === 1 ? "tracker" : "trackers"} from profiling you.
      </span>
      <span className="safari-privacy-card__chevron" aria-hidden="true">
        <ChevronRightIcon />
      </span>
    </a>
  );
}
