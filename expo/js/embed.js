// Helpers for playing games hosted on raw-file CDNs.
//
// jsDelivr and raw.githubusercontent serve .html files as text/plain (with
// nosniff), so pointing an <iframe src> at them shows source code instead of
// the game. For those hosts the player fetches the HTML as text and loads it
// through iframe.srcdoc instead; content-type stops mattering. A <base> tag
// pointing back at the file's CDN directory keeps the game's relative assets
// (scripts, images, wasm) resolving correctly — those have proper
// content-types on the CDN, only .html is neutered.

export const INJECT_HOSTS = new Set([
  "cdn.jsdelivr.net",
  "originfastly.jsdelivr.net",
  "fastly.jsdelivr.net",
  "gcore.jsdelivr.net",
  "raw.githubusercontent.com",
]);

export function needsInject(url) {
  try {
    return INJECT_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function baseDirOf(url) {
  const u = new URL(url);
  u.hash = "";
  u.search = "";
  return u.href.slice(0, u.href.lastIndexOf("/") + 1);
}

// Documents that declare their own <base> (several GN-Math wrappers do) are
// left untouched.
export function withBase(html, url) {
  if (/<base[\s>]/i.test(html)) return html;
  const tag = `<base href="${baseDirOf(url)}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + tag);
  return tag + html;
}
