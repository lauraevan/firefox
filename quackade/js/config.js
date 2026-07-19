// Central configuration for the catalog. Everything a maintainer is likely to
// tweak (site name, CDN mirrors, which sources are enabled) lives here.

export const SITE = {
  name: "Quackade",
  tagline: "the pond's arcade",
  // Shown when no cover art is available; a neutral game-controller glyph.
  fallbackIcon:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#1b2130"/>
        <path d="M7.5 9.5h9a3.5 3.5 0 0 1 3.44 2.86l.53 2.9A2.4 2.4 0 0 1 18.1 18c-.7 0-1.36-.3-1.82-.83L15 15.7a1.5 1.5 0 0 0-1.13-.5h-3.74A1.5 1.5 0 0 0 9 15.7l-1.28 1.47A2.43 2.43 0 0 1 5.9 18a2.4 2.4 0 0 1-2.37-2.74l.53-2.9A3.5 3.5 0 0 1 7.5 9.5Z" fill="#2b3446" stroke="#4b5875" stroke-width="1"/>
        <circle cx="9" cy="12.6" r="0.5" fill="#ffd34d"/>
        <path d="M8 11.4v2.4M6.8 12.6h2.4" stroke="#ffd34d" stroke-width="1.1" stroke-linecap="round"/>
        <circle cx="15.4" cy="11.9" r="0.9" fill="#ffd34d"/>
        <circle cx="17.1" cy="13.6" r="0.9" fill="#7bd88f"/>
      </svg>`
    ),
};

// Ordered CDN mirrors. jsDelivr and Fastly serve GitHub files with correct
// content-types (so game HTML renders inside an iframe); raw.githubusercontent
// serves HTML as text/plain, so it is only ever used as an *image* fallback,
// never for a game frame.
export const MIRRORS = {
  // {u} is replaced by "gh/<owner>/<repo>@<ref>/<path>"
  embed: [
    "https://cdn.jsdelivr.net/{u}",
    "https://originfastly.jsdelivr.net/{u}",
  ],
  image: [
    "https://cdn.jsdelivr.net/{u}",
    "https://originfastly.jsdelivr.net/{u}",
    "https://raw.githubusercontent.com/{r}", // {r} = "<owner>/<repo>/<ref>/<path>"
  ],
};

// Build a jsDelivr-style ("gh/owner/repo@ref/path") and a raw-style
// ("owner/repo/ref/path") locator from parts, then expand against a mirror list.
export function ghLocator(owner, repo, ref, path) {
  const clean = String(path)
    .replace(/^\/+/, "")
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return {
    u: `gh/${owner}/${repo}@${ref}/${clean}`,
    r: `${owner}/${repo}/${ref}/${clean}`,
  };
}

export function expand(list, loc) {
  return list.map((m) => m.replace("{u}", loc.u).replace("{r}", loc.r));
}

// Enabled catalog sources. Each has a color used for its filter chip / badge.
export const SOURCES = [
  { id: "gnmath", label: "GN-Math", color: "#5ec8ff", enabled: true },
  { id: "strongdog", label: "Strongdog XP", color: "#ff8f5e", enabled: true },
  { id: "noah", label: "Noah's Tutoring", color: "#c08cff", enabled: true },
  { id: "truffled", label: "Truffled", color: "#7bd88f", enabled: true },
  { id: "ugs", label: "UGS", color: "#ffd34d", enabled: true },
];
