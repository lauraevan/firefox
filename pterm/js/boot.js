/* PTerm - boot sequence and wiring */
window.PTerm = window.PTerm || {};

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
      version: "1.1.0",
      codename: "Portal",
      build: buildHash("PTerm-1.1.0-Portal"),
      user: "guest",
      host: "pterm",
      shell: "psh",
      kernel: "6.6.6-portal",
      os: "PTerm Linux",
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

      ctx.println('<span class="c-dim">PTerm BIOS v1.0 -- Portal Systems, Inc.</span>');
      const lines = [
        "[    0.000000] portal: cold boot, seeding entropy from /dev/coffee",
        "[    0.014287] cpu: mounting virtual cores ....... ok",
        "[    0.041902] mem: paging games into orbit ...... ok",
        "[    0.088331] net: linking CDN mirrors .......... ok",
        "[    0.132004] fs: mounting /dev/games ........... ok",
        "[    0.170553] auth: session opened for guest",
        "[    0.201120] psh: starting portal shell ........ ok",
      ];
      for (const l of lines) {
        await ctx.typeText(l, { speed: spd, cls: "c-dim" });
      }
      ctx.println("");
      ctx.printBlock(PT.ascii.render(PT.ascii.banner));
      ctx.println('<span class="c-dim">        v' + PT.env.version + ' "' + PT.env.codename +
        '"  //  a terminal you have to earn</span>');
      ctx.println("");
      ctx.println('welcome to <span class="c-accent b">PTerm</span>. games are launched, not clicked.');
      ctx.println('type <span class="c-accent">help</span> to see commands, ' +
        '<span class="c-accent">fastfetch</span> to show off, or dive straight in:');
      ctx.println('  <span class="c-accent">npm start "Cookie Clicker" S=GN-Math</span>');
      ctx.println("");
    },

    async start() {
      setupEnv();
      restorePrefs();
      PT.launcher.init();
      PT.terminal.init();

      await this.sequence(PT.terminal);
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
})(window.PTerm);
