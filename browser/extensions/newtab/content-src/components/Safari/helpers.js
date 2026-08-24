/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Apple-style palette for iconless sites; all read well with white text.
export const LETTER_PALETTE = [
  "#ff3b30",
  "#ff9500",
  "#ff2d55",
  "#af52de",
  "#5856d6",
  "#007aff",
  "#30b0c7",
  "#34c759",
  "#8e8e93",
];

export function colorForKey(key = "") {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return LETTER_PALETTE[Math.abs(hash) % LETTER_PALETTE.length];
}

export function hostnameFor(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return url || "";
  }
}
