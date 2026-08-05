/* Arkeus - boot sequence and wiring */
window.Arkeus = window.Arkeus || {};

(function (PT) {
  "use strict";

  const U = PT.util;

  function buildHash(seed) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ("0000000" + h.toString(16)).slice(-7);
  }

  function setupEnv() {
    PT.env = {
      version: "2.0.0",
      codename: "Aegis",
      build: buildHash("Arkeus-2.0.0-Aegis"),
      user: "guest",
      host: "arkeus",
      shell: "ash",
      kernel: "6.6.6-aegis",
      os: "Arkeus Linux",
      bootTime: Date.now(),
    };
  }

  function restorePrefs() {
    const theme = U.store.get("theme");
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    const nocrt = U.store.get("nocrt");
    if (nocrt === "1") document.documentElement.setAttribute("data-nocrt", "1");
  }

  const boot = {
    async sequence(ctx) {
      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const spd = reduce ? 0 : 2;

      ctx.println('<span class="c-dim">Arkeus BIOS v1.0 -- Aegis Systems, Inc.</span>');
      const lines = [
        "[    0.000000] aegis: cold boot, seeding entropy from /dev/coffee",
        "[    0.014287] cpu: mounting virtual cores ....... ok",
        "[    0.041902] mem: paging games into orbit ...... ok",
        "[    0.088331] net: linking CDN mirrors .......... ok",
        "[    0.132004] fs: mounting /dev/games ........... ok",
        "[    0.170553] auth: session opened for guest",
        "[    0.201120] ash: starting aegis shell ........ ok",
      ];
      for (const l of lines) {
        await ctx.typeText(l, { speed: spd, cls: "c-dim" });
      }
      ctx.println("");
      ctx.printBlock(PT.ascii.render(PT.ascii.banner));
      ctx.println('<span class="c-dim">        v' + PT.env.version + ' "' + PT.env.codename +
        '"  //  a terminal you have to earn</span>');
      ctx.println("");
    },

    async login(ctx) {
      if (!PT.auth.available()) {
        ctx.println('<span class="c-warn">secure context unavailable -- serve over https to enable the login gate.</span>');
        return;
      }
      const custom = PT.auth.isCustom();
      ctx.println('<span class="c-dim">arkeus secure shell -- authentication required</span>');
      ctx.println("login: " + '<span class="c-accent">' + PT.env.user + "</span>");
      if (!custom) {
        ctx.println('<span class="c-mute">(first run: password is "arkeus" -- change it immediately with </span>' +
          '<span class="c-accent">passwd</span><span class="c-mute">)</span>');
      }
      for (let tries = 0; ; tries++) {
        const entry = await ctx.readLine({ prompt: '<span class="c-dim">Password:</span> ', mask: true });
        if (await PT.auth.verify(entry)) { ctx.println('<span class="c-ok">access granted.</span>'); await U.sleep(220); return; }
        ctx.println('<span class="c-error">access denied.</span>');
        await U.sleep(400 + Math.min(tries, 5) * 200);
      }
    },

    welcome(ctx) {
      ctx.println("");
      ctx.println('welcome to <span class="c-accent b">Arkeus</span>. games are launched, not clicked.');
      ctx.println('<span class="c-dim">just type a game name to play it -- e.g.</span> <span class="c-accent">cookie clicker</span>');
      ctx.println('<span class="c-dim">or:</span> <span class="c-accent">games</span> <span class="c-dim">browse .</span> ' +
        '<span class="c-accent">search slope</span> <span class="c-dim">find .</span> ' +
        '<span class="c-accent">help</span> <span class="c-dim">everything .</span> ' +
        '<span class="c-accent">ls</span> <span class="c-dim">files</span>');
      ctx.println("");
    },

    async replay(ctx) {
      await this.sequence(ctx);
      await this.login(ctx);
      this.welcome(ctx);
    },

    async start() {
      setupEnv();
      restorePrefs();
      PT.launcher.init();
      PT.terminal.init();

      await this.sequence(PT.terminal);
      await this.login(PT.terminal);
      this.welcome(PT.terminal);
      PT.terminal.showPrompt();

      // warm the catalogs in the background; commands also load on demand
      PT.catalog.loadAll().catch(() => {});
    },
  };

  PT.boot = boot;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot.start());
  } else {
    boot.start();
  }
})(window.Arkeus);
