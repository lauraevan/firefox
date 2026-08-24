/* Representative data for the local Chromium preview harness ONLY.
 * This is NOT shipped and NOT used by Firefox — the real Start Page reads live
 * Top Sites / tracking-protection data from the Redux store. It exists so the
 * Safari components can be rendered and screenshotted without a full browser. */

// Brand-neutral colored favicon: a rounded square with a letter, as a data URI.
function icon(bg, letter) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='64' height='64' rx='14' fill='${bg}'/>
    <text x='32' y='44' font-family='-apple-system,Helvetica,Arial' font-size='38'
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

function freq(title, url, iconColor) {
  return {
    title,
    url,
    isPinned: false,
    favicon: iconColor ? icon(iconColor, title.charAt(0)) : null,
    faviconSize: iconColor ? 96 : 0,
  };
}

export const MOCK = {
  favorites: [
    fav("Apple", "https://www.apple.com", "#1d1d1f"),
    fav("iCloud", "https://www.icloud.com", "#3693f3"),
    fav("Wikipedia", "https://www.wikipedia.org", "#54595d"),
    fav("GitHub", "https://github.com", "#24292f"),
    fav("YouTube", "https://www.youtube.com", "#ff0033"),
    fav("Maps", "https://maps.apple.com", "#34c759"),
    fav("News", "https://news.example.com", null),
    fav("Weather", "https://weather.example.com", "#0a84ff"),
  ],
  frequentlyVisited: [
    freq("Reddit", "https://www.reddit.com", "#ff4500"),
    freq("Hacker News", "https://news.ycombinator.com", "#ff6600"),
    freq("MDN", "https://developer.mozilla.org", "#000000"),
    freq("Amazon", "https://www.amazon.com", "#ff9900"),
    freq("The Verge", "https://www.theverge.com", "#5200ff"),
    freq("Figma", "https://www.figma.com", "#f24e1e"),
    freq("Notion", "https://www.notion.so", null),
    freq("Stack Overflow", "https://stackoverflow.com", "#f48024"),
    freq("Dribbble", "https://dribbble.com", "#ea4c89"),
    freq("Linear", "https://linear.app", "#5e6ad2"),
  ],
  showFavorites: true,
  showFrequentlyVisited: true,
  showPrivacyReport: true,
  privacyReport: {
    trackersBlocked: 68,
    mostRecentDomain: "theverge.com",
  },
  onOpenLink: e => e.preventDefault(),
  onSetPref: () => {},
};
