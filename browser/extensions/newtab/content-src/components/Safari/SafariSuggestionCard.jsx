/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import {
  colorForKey,
  hostnameFor,
} from "content-src/components/Safari/helpers";

// One "Suggestions" card, built from a real Highlights row (recent history /
// bookmark). Uses the page preview image when available, otherwise a derived
// color plus the site favicon/letter. Text is overlaid at the bottom the way
// Safari renders these cards.
export function SafariSuggestionCard({ item }) {
  const host = item.hostname || hostnameFor(item.url);
  const title = item.title || host;
  const image = item.image || item.preview_image_url || null;
  const favicon = item.tippyTopIcon || item.favicon || null;
  const bg = item.backgroundColor || colorForKey(host);
  const letter = (title || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <a
      className="safari-suggestion"
      href={item.url}
      title={title}
      draggable="false"
    >
      <span
        className="safari-suggestion__thumb"
        style={
          image
            ? { backgroundImage: `url("${image}")` }
            : { backgroundColor: bg }
        }
      >
        {!image ? (
          favicon ? (
            <span
              className="safari-suggestion__favicon"
              style={{ backgroundImage: `url("${favicon}")` }}
            />
          ) : (
            <span className="safari-suggestion__letter" aria-hidden="true">
              {letter}
            </span>
          )
        ) : null}
        <span className="safari-suggestion__scrim" />
        <span className="safari-suggestion__meta">
          <span className="safari-suggestion__title">{title}</span>
          <span className="safari-suggestion__host">{host}</span>
          {item.relativeTime ? (
            <span className="safari-suggestion__time">{item.relativeTime}</span>
          ) : null}
        </span>
      </span>
    </a>
  );
}
