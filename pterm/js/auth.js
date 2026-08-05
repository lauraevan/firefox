/* Arkeus - authentication via Web Crypto (PBKDF2 + AES-GCM).
   The password is NEVER stored -- not in the source, not in localStorage. Only a
   salted verification token is kept; login derives a key from the typed password
   and succeeds only if it decrypts the token (auth tag verifies). So inspecting the
   source or storage reveals no password to steal. */
window.Arkeus = window.Arkeus || {};

(function (PT) {
  "use strict";

  const subtle = (window.crypto && window.crypto.subtle) || null;
  const VERIFY = "arkeus-authenticated";
  const enc = (s) => new TextEncoder().encode(s);

  /* First-run default (password derived, no plaintext). Regenerate to change the
     shipped default; users override it with `passwd` (stored per-browser). */
  const DEFAULT = {"v":1,"salt":"3jQ228Wt2zuoJynt4zwcGA==","iv":"wrPWuJo2RpzD2VTC","iterations":210000,"ct":"XyozQhhSbP8OwKcR5p5QqFGmP/0F3REyYyWRx3D9VKd+j8pr"};

  function b64d(s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function b64e(buf) {
    const u = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }

  async function deriveKey(password, salt, iterations) {
    const km = await subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  const auth = {
    available() { return !!subtle; },
    isCustom() { return !!PT.util.store.get("auth"); },
    config() { return PT.util.store.get("auth") || DEFAULT; },

    async verify(password) {
      if (!subtle) return false;
      const cfg = this.config();
      try {
        const key = await deriveKey(password, b64d(cfg.salt), cfg.iterations);
        const pt = await subtle.decrypt({ name: "AES-GCM", iv: b64d(cfg.iv) }, key, b64d(cfg.ct));
        return new TextDecoder().decode(pt) === VERIFY;
      } catch (e) { return false; }
    },

    async setPassword(password) {
      if (!subtle) throw new Error("secure context (https) required");
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const iterations = 210000;
      const key = await deriveKey(password, salt, iterations);
      const ct = await subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc(VERIFY));
      PT.util.store.set("auth", { v: 1, salt: b64e(salt), iv: b64e(iv), iterations: iterations, ct: b64e(ct) });
      return true;
    },

    reset() { PT.util.store.del("auth"); },
  };

  PT.auth = auth;
})(window.Arkeus);
