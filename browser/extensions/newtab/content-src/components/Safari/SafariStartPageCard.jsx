/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

// Original illustration approximating Safari's Start Page onboarding artwork:
// two stacked "new tab" cards over a wallpaper, showing mock Favorites and
// Suggestions rows.
function StartPageIllustration() {
  return (
    <svg
      className="safari-startcard__art"
      viewBox="0 0 200 156"
      width="200"
      height="156"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="safari-wp" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6c9a4" />
          <stop offset="0.5" stopColor="#e59aa6" />
          <stop offset="1" stopColor="#7ea6a0" />
        </linearGradient>
        <clipPath id="safari-card-clip">
          <rect x="34" y="18" width="150" height="120" rx="12" />
        </clipPath>
      </defs>

      {/* Back card, slightly rotated */}
      <g transform="rotate(-6 60 70)">
        <rect
          x="16"
          y="26"
          width="150"
          height="120"
          rx="12"
          fill="url(#safari-wp)"
          opacity="0.55"
        />
      </g>

      {/* Front card */}
      <g clipPath="url(#safari-card-clip)">
        <rect x="34" y="18" width="150" height="120" fill="url(#safari-wp)" />
        {/* mountains */}
        <path
          d="M34 118 L74 88 L104 112 L134 82 L184 122 L184 138 L34 138 Z"
          fill="rgba(60,70,90,0.35)"
        />
        {/* Favorites label + tiles */}
        <text x="46" y="44" fill="#fff" fontSize="9" fontWeight="600">
          Favorites
        </text>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect
            key={`f${i}`}
            x={46 + i * 18}
            y={50}
            width="13"
            height="13"
            rx="3.5"
            fill="rgba(255,255,255,0.9)"
          />
        ))}
        {/* Suggestions label + cards */}
        <text x="46" y="86" fill="#fff" fontSize="9" fontWeight="600">
          Suggestions
        </text>
        {[0, 1, 2, 3].map(i => (
          <rect
            key={`s${i}`}
            x={46 + i * 32}
            y={92}
            width="27"
            height="20"
            rx="4"
            fill="rgba(255,255,255,0.55)"
          />
        ))}
      </g>
      <rect
        x="34"
        y="18"
        width="150"
        height="120"
        rx="12"
        fill="none"
        stroke="rgba(0,0,0,0.12)"
      />
    </svg>
  );
}

// The intro / customize card at the top of the Start Page. Dismissible (state
// is persisted through onDismiss -> a real pref) and its button opens the same
// customize controls as the floating button.
export function SafariStartPageCard({ onCustomize, onDismiss }) {
  return (
    <div className="safari-startcard">
      <button
        type="button"
        className="safari-startcard__close"
        aria-label="Hide Start Page card"
        onClick={onDismiss}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="safari-startcard__inner">
        <StartPageIllustration />
        <div className="safari-startcard__body">
          <h2 className="safari-startcard__title">Start Page</h2>
          <p className="safari-startcard__desc">
            Customize your wallpaper and sections that appear when creating new
            tabs.
          </p>
          <button
            type="button"
            className="safari-startcard__button"
            onClick={onCustomize}
          >
            Customize Start Page
          </button>
        </div>
      </div>
    </div>
  );
}
