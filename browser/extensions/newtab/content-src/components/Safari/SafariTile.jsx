/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import {
  colorForKey,
  hostnameFor,
} from "content-src/components/Safari/helpers";

function labelFor(link) {
  return link.label || link.title || link.hostname || hostnameFor(link.url);
}

// Decide how to paint the icon square from the real Top Sites `link` fields.
// Safari renders the site icon (or a letter fallback) on an elevated rounded
// square, so we never use full-bleed screenshots here.
function resolveIcon(link) {
  const iconUrl = link.tippyTopIcon || link.favicon || link.iconUri || null;
  if (link.searchTopSite && link.tippyTopIcon) {
    return {
      kind: "image",
      url: link.tippyTopIcon,
      backgroundColor: link.backgroundColor,
    };
  }
  if (iconUrl) {
    return { kind: "image", url: iconUrl, backgroundColor: null };
  }
  return { kind: "letter" };
}

export function SafariTile({ link, onOpen }) {
  const label = labelFor(link);
  const icon = resolveIcon(link);
  const letter = (label || "?").trim().charAt(0).toUpperCase() || "?";

  const handleClick = event => {
    if (onOpen) {
      onOpen(event, link);
    }
  };

  return (
    <a
      className="safari-tile"
      href={link.url}
      title={label}
      onClick={handleClick}
      draggable="false"
    >
      <span className="safari-tile__icon">
        {icon.kind === "image" ? (
          <span
            className={`safari-tile__img${icon.backgroundColor ? " has-bg" : ""}`}
            style={{
              backgroundImage: `url("${icon.url}")`,
              ...(icon.backgroundColor
                ? { backgroundColor: icon.backgroundColor }
                : null),
            }}
          />
        ) : (
          <span
            className="safari-tile__letter"
            aria-hidden="true"
            style={{ backgroundColor: colorForKey(label || link.url || "?") }}
          >
            {letter}
          </span>
        )}
      </span>
      <span className="safari-tile__label">{label}</span>
    </a>
  );
}
