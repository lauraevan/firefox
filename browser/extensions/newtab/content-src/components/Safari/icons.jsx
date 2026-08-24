/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

// Original SVG glyphs drawn to approximate the geometry and stroke weight of
// the corresponding SF Symbols. currentColor is used so each icon inherits the
// surrounding text color and adapts to light/dark automatically.

export function ShieldIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2.75c2.2 1.3 4.4 2 6.75 2.1.3 0 .5.24.5.55v6.1c0 3.9-2.5 7.2-7.03 9.05a.6.6 0 0 1-.44 0C7.25 20.7 4.75 17.4 4.75 13.5V5.4c0-.31.2-.55.5-.55 2.35-.1 4.55-.8 6.75-2.1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 12.2 2.1 2.1L15.2 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      {...props}
    >
      <path
        d="m9.5 5.5 6.2 6.5-6.2 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdjustmentsIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <circle cx="9" cy="8" r="2.4" fill="var(--safari-popover-bg, #fff)" />
        <circle cx="15" cy="16" r="2.4" fill="var(--safari-popover-bg, #fff)" />
      </g>
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      {...props}
    >
      <path
        d="m3.5 8.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
