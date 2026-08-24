/* Representative data for the local Chromium preview harness ONLY.
 * This is NOT shipped and NOT used by Firefox — the real Start Page reads live
 * Top Sites / Highlights / tracking-protection data from the Redux store. It
 * exists so the Safari components can be rendered and screenshotted without a
 * full browser. */

// Brand-neutral colored favicon: a rounded square with a letter, as a data URI.
function icon(bg, letter) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='64' height='64' rx='14' fill='${bg}'/>
    <text x='32' y='45' font-family='-apple-system,Helvetica,Arial' font-size='40'
      font-weight='600' fill='#fff' text-anchor='middle'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function fav(title, url, iconColor) {
  return {
    title,
    url,
    isPinned: true,
    favicon: iconColor ? icon(iconColor, title.charAt(0)) : null,
    faviconSize: iconColor ? 96 : 0,
  };
}

function suggestion(title, hostname, url, backgroundColor, relativeTime) {
  return {
    title,
    url,
    hostname,
    backgroundColor,
    relativeTime,
    favicon: icon(backgroundColor, title.charAt(0)),
    type: "history",
  };
}

export const MOCK = {
  favorites: [
    fav("Apple", "https://www.apple.com", "#1d1d1f"),
    fav("Bing", "https://www.bing.com", "#008373"),
    fav("Google", "https://www.google.com", "#4285f4"),
    fav("Yahoo", "https://www.yahoo.com", "#5f01d1"),
  ],
  frequentlyVisited: [],
  recentlyViewed: [],
  suggestions: [
    suggestion(
      "Dashboard",
      "preview--synapseub.lovable.app",
      "https://a.com",
      "#e8622c",
      "Today"
    ),
    suggestion(
      "Synapse Cinematic Universe",
      "lovable.dev",
      "https://b.com",
      "#e8622c",
      "Today"
    ),
    suggestion(
      "VidFast",
      "vidfast.vc",
      "https://c.com",
      "#8a8a8e",
      "Yesterday"
    ),
    suggestion(
      "New repository",
      "github.com",
      "https://d.com",
      "#3a3a3c",
      "Yesterday"
    ),
    suggestion(
      "Steam EDU",
      "preview--steam-repl.lovable.app",
      "https://e.com",
      "#e8622c",
      "2 days ago"
    ),
    suggestion(
      "Discord - Group Chat",
      "discord.com",
      "https://f.com",
      "#404a9e",
      "Yesterday"
    ),
  ],
  showFavorites: true,
  showRecentlyViewed: true,
  showSuggestions: true,
  showFrequentlyVisited: false,
  showPrivacyReport: false,
  startPageCardDismissed: false,
  syncCardDismissed: false,
  onOpenLink: e => e.preventDefault(),
  onSetPref: () => {},
};
