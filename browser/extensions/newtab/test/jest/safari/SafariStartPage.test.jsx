/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { render, screen } from "@testing-library/react";
import { partitionTopSites } from "content-src/components/Safari/SafariStartPage";
import { SafariStartPageInner } from "content-src/components/Safari/SafariStartPageInner";
import { SafariTile } from "content-src/components/Safari/SafariTile";

describe("partitionTopSites", () => {
  it("puts pinned sites in Favorites and the rest in Frequently Visited", () => {
    const rows = [
      { url: "https://a.com", isPinned: true },
      { url: "https://b.com", isPinned: false },
      { url: "https://c.com", isPinned: true },
    ];
    const { favorites, frequentlyVisited } = partitionTopSites(rows);
    expect(favorites.map(r => r.url)).toEqual([
      "https://a.com",
      "https://c.com",
    ]);
    expect(frequentlyVisited.map(r => r.url)).toEqual(["https://b.com"]);
  });

  it("fills Favorites from frecency sites when nothing is pinned", () => {
    const rows = [{ url: "https://a.com" }, { url: "https://b.com" }];
    const { favorites, frequentlyVisited } = partitionTopSites(rows);
    expect(favorites).toHaveLength(2);
    expect(frequentlyVisited).toHaveLength(0);
  });

  it("drops empty slots and sponsored tiles", () => {
    const rows = [
      null,
      { title: "no url" },
      { url: "https://ad.com", isSponsoredTopSite: true },
      { url: "https://real.com" },
    ];
    const { favorites } = partitionTopSites(rows);
    expect(favorites.map(r => r.url)).toEqual(["https://real.com"]);
  });

  it("tolerates undefined input", () => {
    expect(partitionTopSites()).toEqual({
      favorites: [],
      frequentlyVisited: [],
    });
  });
});

describe("SafariTile", () => {
  it("renders the label and a colored letter fallback without a favicon", () => {
    const { container } = render(
      <SafariTile link={{ title: "Example", url: "https://example.com" }} />
    );
    expect(screen.getByText("Example")).toBeInTheDocument();
    const letter = container.querySelector(".safari-tile__letter");
    expect(letter).toBeTruthy();
    expect(letter.textContent).toBe("E");
    expect(letter.getAttribute("style")).toContain("background-color");
  });

  it("renders the favicon image path when a favicon exists", () => {
    const { container } = render(
      <SafariTile
        link={{
          title: "Example",
          url: "https://example.com",
          favicon: "https://example.com/favicon.ico",
          faviconSize: 96,
        }}
      />
    );
    const img = container.querySelector(".safari-tile__img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("style")).toContain("favicon.ico");
  });
});

describe("SafariStartPageInner", () => {
  const favorites = [{ title: "A", url: "https://a.com", isPinned: true }];

  it("shows the Favorites section when data is present", () => {
    render(
      <SafariStartPageInner favorites={favorites} frequentlyVisited={[]} />
    );
    expect(screen.getByText("Favorites")).toBeInTheDocument();
  });

  it("hides the Privacy Report unless a real number is present", () => {
    const { rerender } = render(
      <SafariStartPageInner favorites={favorites} privacyReport={null} />
    );
    expect(screen.queryByText("Privacy Report")).not.toBeInTheDocument();

    rerender(
      <SafariStartPageInner
        favorites={favorites}
        privacyReport={{ trackersBlocked: 5 }}
      />
    );
    expect(screen.getByText("Privacy Report")).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });
});
