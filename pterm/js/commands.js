/* PTerm - command registry and implementations */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const U = PT.util;
  const THEMES = ["green", "amber", "matrix", "ice", "mono"];

  const registry = {};
  const aliasMap = {};

  function register(cmd) {
    registry[cmd.name] = cmd;
    (cmd.aliases || []).forEach((a) => { aliasMap[a] = cmd.name; });
  }

  function resolve(name) {
    if (!name) return null;
    const n = name.toLowerCase();
    if (registry[n]) return registry[n];
    if (aliasMap[n]) return registry[aliasMap[n]];
    return null;
  }

  /* ---------- helpers shared by commands ---------- */

  function gameLink(g) {
    return '<a class="c-link" data-game-id="' + U.esc(g.id) + '">' + U.esc(g.name) + "</a>";
  }

  function sourceTag(g) {
    return '<span class="c-mute">[' + U.esc(g.sourceLabel) + "]</span>";
  }

  function renderList(games, opts) {
    opts = opts || {};
    if (!games.length) return '<span class="c-dim">(nothing to show)</span>';
    const limit = opts.limit || games.length;
    const shown = games.slice(0, limit);
    let html = '<div class="pt-cols">';
    shown.forEach((g, i) => {
      const idx = String((opts.offset || 0) + i + 1).padStart(3, "0");
      html += '<div><span class="idx">' + idx + "</span> " + gameLink(g) +
        (opts.showSource ? " " + sourceTag(g) : "") + "</div>";
    });
    html += "</div>";
    if (games.length > limit) {
      html += '<div class="c-dim">... and ' + (games.length - limit) +
        ' more. narrow it down with <span class="c-accent">search &lt;query&gt;</span>' +
        ' or list everything with <span class="c-accent">ls --all</span>.</div>';
    }
    return html;
  }

  async function ensureLoaded(ctx, sourceKey) {
    const cat = PT.catalog;
    const targets = sourceKey ? [cat.resolveSource(sourceKey)] : cat.SOURCES;
    // when launching without a specific source, don't re-hammer a source that
    // already failed this session (sync retries it); an explicit source always retries
    const need = targets.filter((s) => s && !cat.isLoaded(s.key) && (sourceKey || !cat.state.error[s.key]));
    if (!need.length) return;
    for (const s of need) {
      ctx.print('<span class="c-dim">npm</span> : fetching catalog <span class="c-accent">[' +
        U.esc(s.label) + "]</span> ... ");
      try {
        const g = await cat.load(s.key);
        ctx.appendToLast('<span class="c-ok">ok</span> <span class="c-dim">(' + g.length + " games)</span>");
      } catch (e) {
        ctx.appendToLast('<span class="c-error">failed</span> <span class="c-dim">(' +
          U.esc((e && e.message) || e) + ")</span>");
      }
    }
  }

  /* ---------- game launch flow ---------- */

  /* Easy parsing: game name can be many words with no quotes; the source is an
     optional S=flag, or a trailing word that names a source (e.g. "slope gn"). */
  function resolveNameAndSource(args, flags) {
    let sourceKey = flags.s || flags.source || flags.src || null;
    let parts = args.slice();
    if (!sourceKey && parts.length > 1) {
      const last = parts[parts.length - 1];
      if (PT.catalog.resolveSource(last)) { sourceKey = last; parts = parts.slice(0, -1); }
    }
    return { name: parts.join(" ").trim(), sourceKey: sourceKey };
  }

  async function launchGame(ctx, name, sourceKey) {
    const cat = PT.catalog;
    let source = null;
    if (sourceKey) {
      source = cat.resolveSource(sourceKey);
      if (!source) {
        ctx.printError('unknown source "' + U.esc(sourceKey) + '". run ' +
          '<span class="c-accent">sources</span> to list valid ones.');
        return;
      }
    }

    ctx.println('<span class="c-dim">&gt; pterm@' + PT.env.version + " start</span>");
    ctx.println('<span class="c-dim">&gt; launch </span>"' + U.esc(name) + '"' +
      (source ? ' <span class="c-dim">--source</span> ' + U.esc(source.label) : ""));
    ctx.println("");
    ctx.println('<span class="c-dim">npm</span> : resolving packages...');
    await U.sleep(160);

    await ensureLoaded(ctx, source ? source.key : null);

    const { exact, candidates } = cat.find(name, source ? source.key : null);

    if (!exact && candidates.length === 0) {
      ctx.println("");
      ctx.printError('no game found: "' + U.esc(name) + '"' +
        (source ? " in " + U.esc(source.label) : ""));
      ctx.println('<span class="c-dim">try</span> <span class="c-accent">search ' +
        U.esc(name) + '</span><span class="c-dim">, or</span> <span class="c-accent">help</span> ' +
        '<span class="c-dim">for commands.</span>');
      return;
    }

    if (!exact && candidates.length > 1) {
      ctx.println("");
      ctx.printWarn(candidates.length + ' packages match "' + U.esc(name) + '". be more specific:');
      ctx.printBlock(renderList(candidates, { limit: 24, showSource: !source }));
      ctx.println('<span class="c-dim">then</span> <span class="c-accent">npm start "&lt;exact name&gt;"' +
        (source ? "" : " S=&lt;source&gt;") + "</span>");
      return;
    }

    const game = exact || candidates[0];
    const steps = [
      "resolving assets",
      "verifying integrity",
      "building dependency tree",
      "mounting sandbox /dev/portal0",
    ];
    for (const s of steps) {
      const dots = ".".repeat(18 - Math.min(16, s.length));
      ctx.print('  ' + U.esc(s) + " " + dots + " ");
      await U.sleep(90 + U.randInt(120));
      ctx.appendToLast('<span class="c-ok">done</span>');
    }
    ctx.println('  <span class="c-accent">found</span> ' + U.esc(game.name) +
      "  " + sourceTag(game));
    ctx.println('<span class="c-dim">starting</span> ' + U.esc(game.name) + " ...");
    rememberRecent(game);
    await U.sleep(220);
    PT.launcher.launch(game);
  }

  function rememberRecent(game) {
    const recent = U.store.get("recent") || [];
    const filtered = recent.filter((r) => r.id !== game.id);
    filtered.unshift({ id: game.id, name: game.name, source: game.source });
    U.store.set("recent", filtered.slice(0, 20));
  }

  /* ---------- commands: games ---------- */

  register({
    name: "npm",
    group: "games",
    usage: 'npm start "<Game Name>" S=<Source>',
    desc: "the package manager. start, install, search and update games.",
    async run(ctx, args, flags) {
      const sub = (args[0] || "").toLowerCase();

      if (sub === "-v" || sub === "--version" || sub === "version") {
        ctx.println("npm@" + PT.env.version + " (psh)");
        return;
      }
      if (sub === "start" || sub === "run" || sub === "s") {
        let rest = args.slice(1);
        if (sub === "run" && rest[0] && rest[0].toLowerCase() === "start") rest = rest.slice(1);
        const ns = resolveNameAndSource(rest, flags);
        if (!ns.name) {
          ctx.printError('missing game name.  try <span class="c-accent">npm start cookie clicker</span>');
          return;
        }
        await launchGame(ctx, ns.name, ns.sourceKey);
        return;
      }
      if (sub === "install" || sub === "i" || sub === "add") {
        const nsi = resolveNameAndSource(args.slice(1), flags);
        const name = nsi.name, sourceKey = nsi.sourceKey;
        if (!name) { ctx.printError('usage: <span class="c-accent">npm install &lt;game&gt;</span>'); return; }
        await ensureLoaded(ctx, sourceKey);
        const { exact, candidates } = PT.catalog.find(name, sourceKey);
        const g = exact || (candidates.length === 1 ? candidates[0] : null);
        if (!g) {
          if (candidates.length > 1) {
            ctx.printWarn("multiple matches, pick one:");
            ctx.printBlock(renderList(candidates, { limit: 24, showSource: true }));
          } else {
            ctx.printError('package not found: "' + U.esc(name) + '"');
          }
          return;
        }
        ctx.println('<span class="c-dim">+ ' + U.esc(g.name) + "@latest</span>");
        await U.sleep(140);
        ctx.println("added 1 package from " + U.esc(g.sourceLabel) + " in " + (0.3 + Math.random()).toFixed(1) + "s");
        ctx.println('<span class="c-dim">run</span> <span class="c-accent">npm start "' +
          U.esc(g.name) + '" S=' + g.source + "</span> <span class=\"c-dim\">to play.</span>");
        return;
      }
      if (sub === "search" || sub === "find") {
        return registry.search.run(ctx, args.slice(1), flags);
      }
      if (sub === "update" || sub === "sync" || sub === "up") {
        return registry.sync.run(ctx, [], flags);
      }
      if (sub === "ls" || sub === "list" || sub === "ll") {
        return registry.ls.run(ctx, args.slice(1), flags);
      }
      ctx.println('<span class="c-dim">psh package manager</span>');
      ctx.println("");
      ctx.println("usage:");
      ctx.println('  <span class="c-accent">npm start &lt;game name&gt;</span>       launch a game (no quotes needed)');
      ctx.println('  <span class="c-accent">npm install &lt;game name&gt;</span>     stage a game');
      ctx.println('  <span class="c-accent">npm search &lt;query&gt;</span>          find games');
      ctx.println('  <span class="c-accent">npm ls [source]</span>             list games');
      ctx.println('  <span class="c-accent">npm update</span>                  refresh catalogs');
      ctx.println('<span class="c-dim">tip: you can just type</span> <span class="c-accent">play &lt;game name&gt;</span> <span class="c-dim">or even the name on its own.</span>');
      ctx.println("");
      ctx.println('<span class="c-dim">sources:</span> ' +
        PT.catalog.SOURCES.map((s) => '<span class="c-accent">' + s.label + "</span>").join(", "));
    },
  });

  register({
    name: "play",
    aliases: ["open", "launch", "start", "run", "p"],
    group: "games",
    usage: "play <game name>",
    desc: "launch a game. no quotes needed, source optional.",
    async run(ctx, args, flags) {
      const ns = resolveNameAndSource(args, flags);
      if (!ns.name) { ctx.printError('usage: <span class="c-accent">play &lt;game name&gt;</span>  (e.g. play cookie clicker)'); return; }
      await launchGame(ctx, ns.name, ns.sourceKey);
    },
  });

  register({
    name: "ls",
    aliases: ["games", "list", "dir"],
    group: "games",
    usage: "ls [source] [--all]",
    desc: "list available games (optionally from one source).",
    async run(ctx, args, flags) {
      const srcArg = args.find((a) => PT.catalog.resolveSource(a));
      const source = srcArg ? PT.catalog.resolveSource(srcArg) : null;
      await ensureLoaded(ctx, source ? source.key : null);
      const games = source ? PT.catalog.forSource(source.key) : PT.catalog.all();
      if (!games.length) {
        ctx.printError("no games loaded. try " + '<span class="c-accent">sync</span>' + " to refresh catalogs.");
        return;
      }
      const all = flags.all || flags.a || args.includes("--all");
      const limit = all ? games.length : 80;
      ctx.println('<span class="c-dim">'
        + games.length + " games"
        + (source ? " in " + source.label : " across " + Object.keys(PT.catalog.state.bySource).length + " sources")
        + "</span>");
      ctx.printBlock(renderList(games, { limit: limit, showSource: !source }));
    },
  });

  register({
    name: "search",
    aliases: ["s", "grep"],
    group: "games",
    usage: "search <query> [S=source]",
    desc: "search for games by name.",
    async run(ctx, args, flags) {
      const srcFlag = flags.s || flags.source;
      const q = args.filter((a) => a !== srcFlag).join(" ").trim();
      if (!q) { ctx.printError("usage: search &lt;query&gt;"); return; }
      await ensureLoaded(ctx, srcFlag);
      const results = PT.catalog.search(q, { sourceKey: srcFlag, limit: 60 });
      if (!results.length) {
        ctx.printError('no games match "' + U.esc(q) + '".');
        return;
      }
      ctx.println('<span class="c-dim">' + results.length + ' result' +
        (results.length === 1 ? "" : "s") + ' for "' + U.esc(q) + '"</span>');
      ctx.printBlock(renderList(results, { limit: 60, showSource: !srcFlag }));
      ctx.println('<span class="c-dim">launch with</span> <span class="c-accent">npm start "&lt;name&gt;" S=&lt;source&gt;</span>');
    },
  });

  register({
    name: "info",
    aliases: ["show"],
    group: "games",
    usage: 'info "<Game Name>" [S=source]',
    desc: "show details for a game.",
    async run(ctx, args, flags) {
      const ns = resolveNameAndSource(args, flags);
      const name = ns.name, srcFlag = ns.sourceKey;
      if (!name) { ctx.printError('usage: <span class="c-accent">info &lt;game name&gt;</span>'); return; }
      await ensureLoaded(ctx, srcFlag);
      const { exact, candidates } = PT.catalog.find(name, srcFlag);
      const g = exact || (candidates.length === 1 ? candidates[0] : null);
      if (!g) {
        if (candidates.length > 1) {
          ctx.printWarn("multiple matches:");
          ctx.printBlock(renderList(candidates, { limit: 24, showSource: true }));
        } else ctx.printError('no game named "' + U.esc(name) + '".');
        return;
      }
      ctx.println('<span class="c-accent b">' + U.esc(g.name) + "</span>");
      ctx.println('  <span class="c-dim">source  :</span> ' + U.esc(g.sourceLabel));
      ctx.println('  <span class="c-dim">id      :</span> ' + U.esc(g.id));
      ctx.println('  <span class="c-dim">launch  :</span> <a class="c-link" href="' + U.esc(g.launchUrl) + '" target="_blank" rel="noopener">' + U.esc(g.launchUrl) + "</a>");
      if (g.coverUrl) ctx.println('  <span class="c-dim">cover   :</span> ' + U.esc(g.coverUrl));
      ctx.println("");
      ctx.println('<span class="c-dim">play it:</span> <span class="c-accent">npm start "' +
        U.esc(g.name) + '" S=' + g.source + "</span> " + " or click: " + gameLink(g));
    },
  });

  register({
    name: "random",
    aliases: ["rng", "surprise"],
    group: "games",
    usage: "random [S=source]",
    desc: "launch a random game.",
    async run(ctx, args, flags) {
      const srcFlag = flags.s || flags.source || args.find((a) => PT.catalog.resolveSource(a));
      await ensureLoaded(ctx, srcFlag);
      const pool = srcFlag ? PT.catalog.forSource(srcFlag) : PT.catalog.all();
      if (!pool.length) { ctx.printError("no games loaded."); return; }
      const g = U.pick(pool);
      ctx.println('<span class="c-dim">rolling the dice ...</span> ' + gameLink(g) + " " + sourceTag(g));
      await launchGame(ctx, g.name, g.source);
    },
  });

  register({
    name: "sources",
    aliases: ["src", "repos"],
    group: "games",
    usage: "sources",
    desc: "list configured game sources and their status.",
    async run(ctx) {
      ctx.println('<span class="c-accent b">game sources</span>');
      for (const s of PT.catalog.SOURCES) {
        const loaded = PT.catalog.isLoaded(s.key);
        const count = (PT.catalog.state.bySource[s.key] || []).length;
        const err = PT.catalog.state.error[s.key];
        const status = err ? '<span class="c-error">error</span>'
          : loaded ? '<span class="c-ok">ready</span> <span class="c-dim">(' + count + " games)</span>"
          : '<span class="c-dim">not loaded</span>';
        ctx.println("");
        ctx.println('  <span class="c-accent">' + U.esc(s.label) + '</span> <span class="c-mute">(S=' +
          s.key + ")</span>  " + status);
        ctx.println('    <span class="c-dim">aliases :</span> ' + s.aliases.join(", "));
        ctx.println('    <span class="c-dim">catalog :</span> <span class="c-mute">' + U.esc(s.catalogUrls[0]) + "</span>");
        if (err) ctx.println('    <span class="c-error">' + U.esc(err) + "</span>");
      }
      ctx.println("");
      ctx.println('<span class="c-dim">refresh with</span> <span class="c-accent">sync</span>');
    },
  });

  register({
    name: "sync",
    aliases: ["refresh", "reload"],
    group: "games",
    usage: "sync",
    desc: "re-fetch all game catalogs from the CDN.",
    async run(ctx) {
      ctx.println('<span class="c-dim">syncing catalogs ...</span>');
      for (const s of PT.catalog.SOURCES) {
        ctx.print("  " + U.esc(s.label) + " ... ");
        try {
          const g = await PT.catalog.load(s.key, { force: true });
          ctx.appendToLast('<span class="c-ok">ok</span> <span class="c-dim">(' + g.length + " games)</span>");
        } catch (e) {
          ctx.appendToLast('<span class="c-error">failed</span> <span class="c-dim">(' +
            U.esc((e && e.message) || e) + ")</span>");
        }
      }
      ctx.println('<span class="c-dim">total:</span> ' + PT.catalog.all().length + " games");
    },
  });

  register({
    name: "recent",
    aliases: ["history-games", "played"],
    group: "games",
    usage: "recent",
    desc: "show recently launched games.",
    async run(ctx) {
      const recent = U.store.get("recent") || [];
      if (!recent.length) { ctx.println('<span class="c-dim">no games launched yet.</span>'); return; }
      ctx.println('<span class="c-accent b">recently played</span>');
      recent.forEach((r, i) => {
        ctx.println("  " + String(i + 1).padStart(2, "0") + "  " +
          '<a class="c-link" data-game-id="' + U.esc(r.id) + '">' + U.esc(r.name) + "</a> " +
          '<span class="c-mute">[' + U.esc(r.source) + "]</span>");
      });
    },
  });

  /* ---------- commands: system ---------- */

  register({
    name: "help",
    aliases: ["?", "commands"],
    group: "system",
    usage: "help [command]",
    desc: "show this help, or details for a command.",
    async run(ctx, args) {
      if (args[0]) {
        const c = resolve(args[0]);
        if (!c) { ctx.printError('no help for "' + U.esc(args[0]) + '".'); return; }
        printMan(ctx, c);
        return;
      }
      ctx.println('<span class="c-accent b">PTerm</span> <span class="c-dim">command reference</span>  ' +
        '<span class="c-mute">// tab completes, up/down recalls history</span>');
      const groups = { games: "games", system: "system", shell: "shell", fun: "fun & misc" };
      for (const gk of Object.keys(groups)) {
        const cmds = Object.values(registry).filter((c) => c.group === gk && !c.hidden);
        if (!cmds.length) continue;
        ctx.println("");
        ctx.println('<span class="c-dim">' + groups[gk] + "</span>");
        cmds.forEach((c) => {
          ctx.println('  <span class="c-accent">' + c.name.padEnd(12) + "</span>" +
            '<span class="c-dim">' + U.esc(c.desc) + "</span>");
        });
      }
      ctx.println("");
      ctx.println('<span class="c-dim">easiest way to play:</span> <span class="c-accent">just type a game name</span> ' +
        '<span class="c-dim">-- e.g.</span> <span class="c-accent">retro bowl</span> <span class="c-dim">or</span> <span class="c-accent">play slope</span>');
    },
  });

  function printMan(ctx, c) {
    ctx.println('<span class="c-accent b">' + c.name + "</span>" +
      (c.aliases && c.aliases.length ? '  <span class="c-mute">(aka ' + c.aliases.join(", ") + ")</span>" : ""));
    ctx.println('  <span class="c-dim">usage :</span> <span class="c-accent">' + U.esc(c.usage || c.name) + "</span>");
    ctx.println('  <span class="c-dim">about :</span> ' + U.esc(c.desc || ""));
  }

  register({
    name: "man",
    group: "system",
    usage: "man <command>",
    desc: "manual page for a command.",
    async run(ctx, args) {
      if (!args[0]) { ctx.printError("what manual page do you want?"); return; }
      const c = resolve(args[0]);
      if (!c) { ctx.printError("no manual entry for " + U.esc(args[0])); return; }
      printMan(ctx, c);
    },
  });

  register({
    name: "version",
    aliases: ["-v", "--version", "ver"],
    group: "system",
    usage: "version",
    desc: "show PTerm version and build info.",
    async run(ctx) {
      const e = PT.env;
      ctx.println('<span class="c-accent b">PTerm</span> v' + e.version +
        ' <span class="c-dim">"' + e.codename + '"</span>');
      ctx.println('<span class="c-dim">build   :</span> ' + e.build);
      ctx.println('<span class="c-dim">kernel  :</span> ' + e.kernel);
      ctx.println('<span class="c-dim">shell   :</span> ' + e.shell + " 1.0");
      ctx.println('<span class="c-dim">engine  :</span> ' + navigator.userAgent.split(") ").slice(-1)[0]);
      ctx.println('<span class="c-dim">sources :</span> ' + PT.catalog.SOURCES.map((s) => s.label).join(", "));
    },
  });

  register({
    name: "fastfetch",
    aliases: ["neofetch", "ff"],
    group: "system",
    usage: "fastfetch",
    desc: "display system information the cool way.",
    async run(ctx) {
      const e = PT.env;
      const title = e.user + "@" + e.host;
      const uptime = U.fmtDuration(Date.now() - e.bootTime);
      const games = PT.catalog.all().length;
      const pkgLine = games ? games + " games (npm)" : "run sync to load";
      const srcCount = Object.keys(PT.catalog.state.bySource).length;
      const theme = document.documentElement.getAttribute("data-theme") || "green";
      const mem = navigator.deviceMemory ? navigator.deviceMemory + " GB" : "unknown";
      const cpu = (navigator.hardwareConcurrency || "?") + " vcores";
      const res = window.innerWidth + " x " + window.innerHeight;

      const rows = [
        ["OS", e.os + " x86_64"],
        ["Host", "Portal Terminal (web)"],
        ["Kernel", e.kernel],
        ["Uptime", uptime],
        ["Packages", pkgLine],
        ["Shell", e.shell + " 1.0"],
        ["Resolution", res],
        ["DE", "TTY"],
        ["Terminal", "PTerm"],
        ["CPU", cpu],
        ["Memory", mem],
        ["Sources", srcCount + " (" + PT.catalog.SOURCES.map((s) => s.key).join(", ") + ")"],
        ["Theme", theme],
      ];

      let info = '<div class="pt-fetch-title"><span class="c-accent b">' + U.esc(title) + "</span></div>";
      info += '<div class="pt-fetch-rule">' + "-".repeat(title.length) + "</div>";
      rows.forEach((r) => {
        info += '<div class="k">' + U.esc(r[0]) + "</div><div>" + U.esc(r[1]) + "</div>";
      });
      const pal = ["--fg-mute", "--error", "--warn", "--fg", "--link", "--accent", "--fg-dim"]
        .map((v) => '<span style="color:var(' + v + ')">' + "███" + "</span>").join("");
      info += '<div class="pt-fetch-palette">' + pal + "</div>";

      const logo = '<div class="pt-fetch-logo">' + U.esc(PT.ascii.pLogo.join("\n")) + "</div>";
      ctx.printBlock('<div class="pt-fetch">' + logo + '<div class="pt-fetch-info">' + info + "</div></div>");
    },
  });

  register({
    name: "banner",
    aliases: ["logo", "figlet"],
    group: "system",
    usage: "banner",
    desc: "print the PTerm wordmark.",
    async run(ctx) {
      ctx.printBlock(PT.ascii.render(PT.ascii.banner));
      ctx.println('<span class="c-dim">        a terminal you have to earn // </span><span class="c-accent">help</span>');
    },
  });

  register({
    name: "about",
    aliases: ["credits", "info-pterm"],
    group: "system",
    usage: "about",
    desc: "what is PTerm?",
    async run(ctx) {
      ctx.println('<span class="c-accent b">PTerm</span> <span class="c-dim">// the terminal game launcher</span>');
      ctx.println("");
      ctx.println("PTerm is a fake-Linux terminal that launches browser games from");
      ctx.println("public catalogs. no menus, no big buttons -- you type the command,");
      ctx.println("you get the game. that's the whole bit.");
      ctx.println("");
      ctx.println('<span class="c-dim">catalogs:</span> ' + PT.catalog.SOURCES.map((s) => s.label).join(" . "));
      ctx.println('<span class="c-dim">try:</span> <span class="c-accent">fastfetch</span> . ' +
        '<span class="c-accent">ls</span> . <span class="c-accent">search slope</span> . ' +
        '<span class="c-accent">play cookie clicker</span>');
    },
  });

  register({
    name: "theme",
    group: "system",
    usage: "theme [" + THEMES.join("|") + "]",
    desc: "change the color theme.",
    async run(ctx, args) {
      const cur = document.documentElement.getAttribute("data-theme") || "green";
      if (!args[0]) {
        ctx.println('<span class="c-dim">current theme:</span> <span class="c-accent">' + cur + "</span>");
        ctx.println('<span class="c-dim">available:</span> ' + THEMES.map((t) =>
          t === cur ? '<span class="c-accent">' + t + "</span>" : t).join(", "));
        return;
      }
      const t = args[0].toLowerCase();
      if (THEMES.indexOf(t) < 0) { ctx.printError('unknown theme "' + U.esc(t) + '". options: ' + THEMES.join(", ")); return; }
      document.documentElement.setAttribute("data-theme", t);
      U.store.set("theme", t);
      ctx.println("theme set to " + '<span class="c-accent">' + t + "</span>");
    },
  });

  register({
    name: "crt",
    group: "system",
    usage: "crt [on|off]",
    desc: "toggle the CRT scanline effect.",
    async run(ctx, args) {
      const root = document.documentElement;
      let on = root.getAttribute("data-nocrt") !== "1";
      if (args[0]) on = /^(on|1|true|yes)$/i.test(args[0]);
      else on = !on;
      root.setAttribute("data-nocrt", on ? "0" : "1");
      U.store.set("nocrt", on ? "0" : "1");
      ctx.println("crt effect " + (on ? '<span class="c-ok">on</span>' : '<span class="c-dim">off</span>'));
    },
  });

  register({
    name: "clear",
    aliases: ["cls"],
    group: "system",
    usage: "clear",
    desc: "clear the screen.",
    async run(ctx) { ctx.clear(); },
  });

  register({
    name: "reboot",
    aliases: ["restart"],
    group: "system",
    usage: "reboot",
    desc: "replay the boot sequence (re-locks).",
    async run(ctx) {
      ctx.clear();
      await PT.boot.replay(ctx);
    },
  });

  register({
    name: "history",
    aliases: ["hist"],
    group: "system",
    usage: "history",
    desc: "show command history.",
    async run(ctx) {
      const h = ctx.getHistory();
      if (!h.length) { ctx.println('<span class="c-dim">(empty)</span>'); return; }
      h.forEach((line, i) => {
        ctx.println('  <span class="idx">' + String(i + 1).padStart(4, " ") + "</span>  " + U.esc(line));
      });
    },
  });

  /* ---------- commands: shell flavor ---------- */

  register({ name: "echo", group: "shell", usage: "echo <text>", desc: "print text.",
    async run(ctx, args, flags, raw) { ctx.println(U.esc(raw.replace(/^echo\s?/, ""))); } });

  register({ name: "whoami", group: "shell", usage: "whoami", desc: "print current user.",
    async run(ctx) { ctx.println(PT.env.user); } });

  register({ name: "hostname", group: "shell", usage: "hostname", desc: "print host name.",
    async run(ctx) { ctx.println(PT.env.host); } });

  register({ name: "uname", group: "shell", usage: "uname [-a]", desc: "print system info.",
    async run(ctx, args) {
      if (args.includes("-a") || args.includes("--all")) {
        ctx.println([PT.env.os, PT.env.host, PT.env.kernel, "#1 SMP PREEMPT", "x86_64", "Portal/psh"].join(" "));
      } else ctx.println(PT.env.os);
    } });

  register({ name: "date", group: "shell", usage: "date", desc: "print the current date.",
    async run(ctx) { ctx.println(new Date().toString()); } });

  register({ name: "uptime", group: "shell", usage: "uptime", desc: "how long PTerm has been up.",
    async run(ctx) {
      const up = U.fmtDuration(Date.now() - PT.env.bootTime);
      ctx.println(new Date().toLocaleTimeString() + "  up " + up + ",  1 user,  load average: 0.07, 0.03, 0.00");
    } });

  register({ name: "pwd", group: "shell", usage: "pwd", desc: "print working directory.",
    async run(ctx) { ctx.println("/home/" + PT.env.user); } });

  register({ name: "cd", group: "shell", hidden: true, usage: "cd <dir>", desc: "change directory.",
    async run(ctx, args) {
      if (!args[0] || args[0] === "~" || args[0] === "/home/" + PT.env.user) return;
      ctx.println('<span class="c-dim">psh: cd: ' + U.esc(args[0]) + ": this is not that kind of filesystem</span>");
    } });

  register({ name: "ls-files", group: "shell", hidden: true, usage: "ls-files", desc: "",
    async run(ctx) { ctx.println("games/  bin/  dev/  etc/  .secret"); } });

  const FILES = {
    "/etc/os-release": [
      'NAME="PTerm Linux"', 'PRETTY_NAME="PTerm Linux (Portal)"', "ID=pterm",
      "VERSION=\"1.0 (Portal)\"", "HOME_URL=\"about:pterm\"",
    ].join("\n"),
    "/etc/motd": "welcome to PTerm. games are earned, not clicked.",
    "readme": "type `help`. the magic word is `npm start`.",
    "/home/guest/.secret": "there is no secret. (ok fine: try `theme matrix`)",
  };

  register({ name: "cat", group: "shell", usage: "cat <file>", desc: "print a file.",
    async run(ctx, args) {
      const f = (args[0] || "").toLowerCase();
      if (!f) { ctx.printError("usage: cat &lt;file&gt;"); return; }
      const key = Object.keys(FILES).find((k) => k.toLowerCase() === f || k.toLowerCase().endsWith("/" + f));
      if (key) ctx.println(U.esc(FILES[key]));
      else ctx.println('<span class="c-dim">cat: ' + U.esc(args[0]) + ": No such file or directory</span>");
    } });

  register({ name: "sudo", group: "fun", usage: "sudo <command>", desc: "you are not root.",
    async run(ctx, args) {
      if (args.join(" ").toLowerCase().indexOf("rm") >= 0) {
        ctx.println('<span class="c-warn">nice try.</span>');
        return;
      }
      ctx.println('<span class="c-dim">[sudo] password for ' + PT.env.user + ": </span>");
      await U.sleep(500);
      ctx.println(PT.env.user + " is not in the sudoers file.  This incident will be reported.");
    } });

  register({ name: "motd", group: "fun", usage: "motd", desc: "message of the day.",
    async run(ctx) { ctx.println(U.esc(FILES["/etc/motd"])); } });

  register({ name: "exit", aliases: ["quit"], group: "fun", usage: "exit", desc: "there is no escape.",
    async run(ctx) {
      ctx.println('<span class="c-dim">logout</span>');
      await U.sleep(400);
      ctx.println("there is no exit from PTerm. only more games. try " + '<span class="c-accent">ls</span>' + ".");
    } });

  register({
    name: "stats",
    aliases: ["count"],
    group: "games",
    usage: "stats",
    desc: "library totals per source.",
    async run(ctx) {
      await ensureLoaded(ctx);
      let total = 0;
      ctx.println('<span class="c-accent b">library stats</span>');
      for (const s of PT.catalog.SOURCES) {
        const n = (PT.catalog.state.bySource[s.key] || []).length;
        total += n;
        const err = PT.catalog.state.error[s.key];
        ctx.println("  " + s.label.padEnd(14) + ' <span class="c-accent">' + String(n).padStart(5) +
          "</span>" + (err ? ' <span class="c-error">(error)</span>' : ""));
      }
      ctx.println("  " + "TOTAL".padEnd(14) + ' <span class="c-accent b">' + String(total).padStart(5) + "</span> games");
    },
  });

  function getFavs() { return U.store.get("favorites") || []; }
  function setFavs(f) { U.store.set("favorites", f); }

  register({
    name: "fav",
    aliases: ["favorite", "star"],
    group: "games",
    usage: 'fav "<Game>" [S=source]',
    desc: "star a game for quick access.",
    async run(ctx, args, flags) {
      const ns = resolveNameAndSource(args, flags);
      const name = ns.name, srcFlag = ns.sourceKey;
      if (!name) { ctx.printError('usage: <span class="c-accent">fav &lt;game name&gt;</span>'); return; }
      await ensureLoaded(ctx, srcFlag);
      const { exact, candidates } = PT.catalog.find(name, srcFlag);
      const g = exact || (candidates.length === 1 ? candidates[0] : null);
      if (!g) {
        if (candidates.length > 1) { ctx.printWarn("be more specific:"); ctx.printBlock(renderList(candidates, { limit: 20, showSource: true })); }
        else ctx.printError('no game named "' + U.esc(name) + '".');
        return;
      }
      const favs = getFavs();
      if (favs.some((f) => f.id === g.id)) { ctx.println('<span class="c-dim">already starred:</span> ' + U.esc(g.name)); return; }
      favs.push({ id: g.id, name: g.name, source: g.source });
      setFavs(favs);
      ctx.println('<span class="c-warn">*</span> starred ' + U.esc(g.name) + ' <span class="c-dim">(' + favs.length + " total)</span>");
    },
  });

  register({
    name: "unfav",
    aliases: ["unstar"],
    group: "games",
    usage: 'unfav "<Game>"',
    desc: "remove a star.",
    async run(ctx, args) {
      const name = args.join(" ").trim();
      if (!name) { ctx.printError('usage: <span class="c-accent">unfav &lt;game name&gt;</span>'); return; }
      let favs = getFavs();
      const before = favs.length;
      const q = name.toLowerCase();
      favs = favs.filter((f) => f.name.toLowerCase() !== q);
      setFavs(favs);
      ctx.println(before === favs.length
        ? '<span class="c-dim">not in favorites: ' + U.esc(name) + "</span>"
        : "removed " + U.esc(name) + " from favorites");
    },
  });

  register({
    name: "favorites",
    aliases: ["favs", "stars"],
    group: "games",
    usage: "favorites",
    desc: "list your starred games.",
    async run(ctx) {
      const favs = getFavs();
      if (!favs.length) {
        ctx.println('<span class="c-dim">no favorites yet. star one with</span> <span class="c-accent">fav "&lt;Game&gt;"</span>');
        return;
      }
      ctx.println('<span class="c-accent b">favorites</span>');
      favs.forEach((f, i) => {
        ctx.println('  <span class="c-warn">*</span> ' + String(i + 1).padStart(2) + "  " +
          '<a class="c-link" data-game-id="' + U.esc(f.id) + '">' + U.esc(f.name) + "</a> " +
          '<span class="c-mute">[' + U.esc(f.source) + "]</span>");
      });
    },
  });

  register({ name: "fortune", group: "fun", usage: "fortune", desc: "a fortune cookie.",
    async run(ctx) { ctx.println(U.esc(U.pick(FORTUNES))); } });

  register({ name: "cowsay", group: "fun", usage: "cowsay <text>", desc: "the cow has opinions.",
    async run(ctx, args, flags, raw) {
      const t = raw.replace(/^cowsay\s?/, "") || "moo";
      ctx.printBlock('<span class="pt-logo">' + U.esc(cowsay(t)) + "</span>");
    } });

  register({ name: "calc", aliases: ["bc"], group: "fun", usage: "calc <expr>", desc: "a tiny calculator.",
    async run(ctx, args, flags, raw) {
      const expr = raw.replace(/^(calc|bc)\s?/, "").trim();
      if (!expr) { ctx.printError("usage: calc &lt;expression&gt;"); return; }
      if (!/^[-+*/%().\s\d]+$/.test(expr)) { ctx.printError("only numbers and + - * / % ( ) allowed"); return; }
      try { ctx.println(String(Function("return (" + expr + ")")())); }
      catch (e) { ctx.printError("could not evaluate that."); }
    } });

  register({ name: "roll", aliases: ["dice"], group: "fun", usage: "roll [NdM]", desc: "roll dice, e.g. roll 2d6.",
    async run(ctx, args) {
      const m = (args[0] || "1d6").match(/^(\d*)d(\d+)$/i);
      if (!m) { ctx.printError("usage: roll NdM (e.g. 2d6)"); return; }
      const n = Math.min(100, parseInt(m[1] || "1", 10) || 1);
      const faces = Math.min(1000, parseInt(m[2], 10));
      if (!faces) { ctx.printError("those dice have no faces."); return; }
      const rolls = []; let sum = 0;
      for (let i = 0; i < n; i++) { const r = 1 + U.randInt(faces); rolls.push(r); sum += r; }
      ctx.println(rolls.join(" + ") + '  ->  <span class="c-accent b">' + sum + "</span>");
    } });

  register({ name: "flip", aliases: ["coin"], group: "fun", usage: "flip", desc: "flip a coin.",
    async run(ctx) { ctx.println('<span class="c-accent">' + (Math.random() < 0.5 ? "heads" : "tails") + "</span>"); } });

  register({ name: "ping", group: "fun", usage: "ping <host>", desc: "pretend to ping a host.",
    async run(ctx, args) {
      const host = args[0] || "portal.pterm";
      ctx.println("PING " + U.esc(host) + " (127.0.0.1): 56 data bytes");
      for (let i = 0; i < 4; i++) {
        await U.sleep(280);
        ctx.println("64 bytes from " + U.esc(host) + ": icmp_seq=" + i + " ttl=64 time=" + (0.1 + Math.random() * 9).toFixed(3) + " ms");
      }
      ctx.println("--- " + U.esc(host) + " ping statistics ---");
      ctx.println("4 packets transmitted, 4 received, 0% packet loss");
    } });

  register({ name: "top", aliases: ["ps", "htop"], group: "fun", usage: "top", desc: "list running processes.",
    async run(ctx) {
      ctx.println('<span class="c-dim">  PID USER      %CPU %MEM  COMMAND</span>');
      const procs = [
        ["1", "root", "0.0", "0.1", "/sbin/portal-init"],
        ["7", "guest", "0.3", "0.4", "psh"],
        ["42", "guest", "1.2", "2.1", "gamed --catalogs=" + PT.catalog.SOURCES.length],
        ["108", "guest", "0.7", "1.4", "portald --overlay"],
        ["256", "guest", (Math.random() * 20).toFixed(1), "3.3", "fastfetch"],
        ["777", "guest", "0.0", "0.2", "coffee-daemon"],
      ];
      procs.forEach((p) => ctx.println("  " + p[0].padStart(4) + " " + p[1].padEnd(9) + " " +
        p[2].padStart(4) + " " + p[3].padStart(4) + "  " + U.esc(p[4])));
    } });

  register({ name: "weather", group: "fun", usage: "weather", desc: "today's forecast.",
    async run(ctx) {
      ctx.println('<span class="c-accent">portal:</span> cloudy with a 100% chance of games. ' +
        "UV index: " + U.randInt(11) + ". you should be doing homework.");
    } });

  register({ name: "colors", aliases: ["palette", "colortest"], group: "fun", usage: "colors", desc: "show the theme palette.",
    async run(ctx) {
      const vars = [["fg", "--fg"], ["dim", "--fg-dim"], ["mute", "--fg-mute"], ["accent", "--accent"],
        ["warn", "--warn"], ["error", "--error"], ["link", "--link"]];
      ctx.printBlock(vars.map((v) => '<span style="color:var(' + v[1] + ')">&#9608;&#9608;&#9608; ' + v[0] + "</span>").join("   "));
      ctx.println('<span class="c-dim">themes:</span> ' + THEMES.join(", ") + ' <span class="c-dim">// theme &lt;name&gt;</span>');
    } });

  register({ name: "matrix", group: "fun", usage: "matrix", desc: "follow the white rabbit. (any key exits)",
    async run(ctx) {
      ctx.println('<span class="c-dim">wake up...</span>');
      await U.sleep(300);
      await runMatrix();
    } });

  register({ name: "hack", group: "fun", usage: "hack [target]", desc: "h4ck the planet.",
    async run(ctx, args) {
      const tgt = args[0] || "the-mainframe";
      const steps = ["establishing uplink to " + tgt, "bypassing firewall", "injecting payload",
        "cracking sha-256", "escalating privileges", "exfiltrating cat pictures"];
      for (const s of steps) {
        ctx.print("  " + U.esc(s) + " ");
        for (let i = 0; i < 10; i++) { await U.sleep(35); ctx.appendToLast('<span class="c-ok">#</span>'); }
        ctx.appendToLast(' <span class="c-accent">ok</span>');
      }
      await U.sleep(200);
      ctx.println('<span class="c-warn b">ACCESS GRANTED</span> <span class="c-dim">(kidding. this is just PTerm.)</span>');
    } });

  register({ name: "passwd", group: "system", usage: "passwd", desc: "change the login password.",
    async run(ctx) {
      const n1 = await ctx.readLine({ prompt: '<span class="c-dim">New password:</span> ', mask: true });
      if (!n1) { ctx.printError("password unchanged (empty)."); return; }
      const n2 = await ctx.readLine({ prompt: '<span class="c-dim">Retype new password:</span> ', mask: true });
      if (n1 !== n2) { ctx.printError("passwords do not match. unchanged."); return; }
      U.store.set("password", n1);
      ctx.println('<span class="c-ok">password updated.</span> <span class="c-dim">applies next time you</span> ' +
        '<span class="c-accent">lock</span> <span class="c-dim">or reload.</span>');
    } });

  register({ name: "lock", aliases: ["logout"], group: "system", usage: "lock", desc: "lock the terminal (require the password).",
    async run(ctx) {
      ctx.clear();
      ctx.printBlock(PT.ascii.render(PT.ascii.banner));
      ctx.println("");
      await PT.boot.login(ctx);
      PT.boot.welcome(ctx);
    } });

  register({ name: "mode", group: "games", usage: "mode [frame|tab]", desc: "play in the overlay or a new browser tab.",
    async run(ctx, args) {
      const m = (args[0] || "").toLowerCase();
      if (m !== "frame" && m !== "tab") {
        const cur = U.store.get("launchMode") || "frame";
        ctx.println('<span class="c-dim">launch mode:</span> <span class="c-accent">' + cur + "</span>");
        ctx.println('<span class="c-dim">frame = in-terminal overlay . tab = new browser tab (better for games that block framing)</span>');
        ctx.println('<span class="c-dim">set with</span> <span class="c-accent">mode tab</span> <span class="c-dim">or</span> <span class="c-accent">mode frame</span>');
        return;
      }
      U.store.set("launchMode", m);
      ctx.println("launch mode set to " + '<span class="c-accent">' + m + "</span>");
    } });

  register({ name: "retry", aliases: ["relaunch"], group: "games", usage: "retry", desc: "relaunch the last game (tries other mirrors).",
    async run(ctx) {
      const g = PT.launcher._lastGame;
      if (!g) { ctx.printError("no game launched yet."); return; }
      ctx.println('<span class="c-dim">retrying</span> ' + U.esc(g.name) + " ...");
      PT.launcher.launch(g);
    } });

  register({ name: "df", group: "fun", usage: "df", desc: "disk usage.",
    async run(ctx) {
      ctx.println('<span class="c-dim">Filesystem      Size  Used Avail Use% Mounted on</span>');
      ctx.println("/dev/portal0    9.0P  8.9P   64K 100% /");
      ctx.println("gamefs      " + String((PT.catalog.all().length || "?")).padStart(8) + " games   -   -  /mnt/games");
      ctx.println("tmpfs           1.0G     0  1.0G   0% /dev/coffee");
    } });

  register({ name: "free", group: "fun", usage: "free", desc: "memory usage.",
    async run(ctx) {
      const total = navigator.deviceMemory ? navigator.deviceMemory * 1024 : 8192;
      const used = Math.floor(total * (0.5 + Math.random() * 0.2));
      ctx.println('<span class="c-dim">              total        used        free</span>');
      ctx.println("Mem:   " + String(total).padStart(11) + String(used).padStart(12) + String(total - used).padStart(12));
      ctx.println("Swap:            0           0           0");
    } });

  register({ name: "su", group: "fun", usage: "su [user]", desc: "switch user.",
    async run(ctx) {
      await ctx.readLine({ prompt: '<span class="c-dim">Password:</span> ', mask: true });
      await U.sleep(400);
      ctx.println("su: Authentication failure");
    } });

  const FORTUNES = [
    "you will play one more game before you finish that assignment.",
    "the best time to touch grass was 20 minutes ago. the second best time is never.",
    "a wise gamer once said: S=GN-Math.",
    "your high score is safe. no one is coming.",
    "404: motivation not found.",
    "he who types npm start shall receive.",
    "the cake is a lie, but the games are real.",
    "you miss 100% of the games you don't launch.",
    "somewhere, a teacher is refreshing the network logs. play faster.",
    "loading... loading... have you tried `random`?",
  ];

  function cowsay(text) {
    const t = String(text);
    const top = " " + "_".repeat(t.length + 2);
    const bot = " " + "-".repeat(t.length + 2);
    return [top, "< " + t + " >", bot,
      "        \\   ^__^",
      "         \\  (oo)\\_______",
      "            (__)\\       )\\/\\",
      "                ||----w |",
      "                ||     ||"].join("\n");
  }

  /* Full-screen matrix rain; resolves on any key/click (or after a safety timeout). */
  function runMatrix() {
    return new Promise((resolve) => {
      const cv = document.createElement("canvas");
      cv.style.cssText = "position:fixed;inset:0;z-index:60;background:#000;";
      document.body.appendChild(cv);
      const g = cv.getContext("2d");
      const fontSize = 14;
      let drops = [];
      function size() {
        cv.width = window.innerWidth; cv.height = window.innerHeight;
        const cols = Math.ceil(cv.width / fontSize);
        drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * cv.height / fontSize));
      }
      size();
      const chars = "アイウエオ0123456789ABCDEF$+*<>=".split("");
      const rainColor = (getComputedStyle(document.documentElement).getPropertyValue("--fg") || "#e6e6e6").trim() || "#e6e6e6";
      let raf;
      function draw() {
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(0, 0, cv.width, cv.height);
        g.fillStyle = rainColor;
        g.font = fontSize + "px monospace";
        for (let i = 0; i < drops.length; i++) {
          g.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > cv.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
        raf = requestAnimationFrame(draw);
      }
      draw();
      function done() {
        cancelAnimationFrame(raf);
        window.removeEventListener("keydown", done, true);
        window.removeEventListener("mousedown", done, true);
        window.removeEventListener("resize", size);
        clearTimeout(safety);
        cv.remove();
        resolve();
      }
      const safety = setTimeout(done, 30000);
      window.addEventListener("keydown", done, true);
      window.addEventListener("mousedown", done, true);
      window.addEventListener("resize", size);
    });
  }

  const commands = {
    registry,
    register,
    resolve,
    names() { return Object.keys(registry).concat(Object.keys(aliasMap)); },
    commandNames() { return Object.keys(registry).filter((n) => !registry[n].hidden); },
  };

  PT.commands = commands;
})(window.PTerm);
