/* Arkeus - a small in-memory virtual filesystem so the shell feels real:
   cd / ls / pwd / cat / tree / mkdir / touch / rm all operate on this tree.
   It resets on reload (like a fresh shell). */
window.Arkeus = window.Arkeus || {};

(function (PT) {
  "use strict";

  const USER = "guest";
  const HOME = "/home/" + USER;

  function dir(children) { return { type: "dir", children: children || {} }; }
  function file(content) { return { type: "file", content: content || "" }; }

  const binNames = ["ls", "cd", "cat", "echo", "games", "play", "fastfetch",
    "help", "passwd", "lock", "diag", "ash", "grep", "tree"];
  const bin = {};
  binNames.forEach((n) => (bin[n] = file("")));

  const root = dir({
    home: dir({ guest: dir({
      "readme.txt": file("welcome to Arkeus.\ntype `help`. launch a game by name, e.g. `slope`.\n"),
      games: dir({ "HOWTO.txt": file("run `games` to list the catalog, or just type a game name.\n") }),
      ".secret": file("there is no secret. ok fine: try `theme green`, `matrix`, or `hack`.\n"),
      "todo.md": file("- [x] boot arkeus\n- [ ] finish homework\n- [x] play one more game\n- [ ] touch grass\n"),
    }) }),
    bin: dir(bin),
    etc: dir({
      "os-release": file('NAME="Arkeus Linux"\nPRETTY_NAME="Arkeus Linux (Aegis)"\nID=arkeus\nVERSION="2.0 (Aegis)"\nHOME_URL="about:arkeus"\n'),
      motd: file("welcome to Arkeus. games are earned, not clicked.\n"),
      hostname: file("arkeus\n"),
      shells: file("/bin/ash\n"),
      passwd: file("root:x:0:0:root:/root:/bin/ash\nguest:x:1000:1000:guest:/home/guest:/bin/ash\n"),
    }),
    dev: dir({ null: file(""), random: file(""), aegis0: file(""), coffee: file("") }),
    proc: dir({ version: file("Arkeus Linux version 6.6.6-aegis (ash)\n") }),
  });

  let cwd = HOME;

  function norm(path) {
    if (!path) path = ".";
    if (path === "~") path = HOME;
    else if (path.indexOf("~/") === 0) path = HOME + path.slice(1);
    const base = path[0] === "/" ? [] : cwd.split("/").filter(Boolean);
    for (const part of path.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") base.pop();
      else base.push(part);
    }
    return "/" + base.join("/");
  }

  function nodeAt(path) {
    const abs = norm(path);
    if (abs === "/") return root;
    let node = root;
    for (const part of abs.split("/").filter(Boolean)) {
      if (node.type !== "dir" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  function parentAndName(path) {
    const abs = norm(path);
    const parts = abs.split("/").filter(Boolean);
    const name = parts.pop();
    return { parent: nodeAt("/" + parts.join("/")), name: name, abs: abs };
  }

  const vfs = {
    USER: USER, HOME: HOME,
    cwd() { return cwd; },
    cwdDisplay() {
      if (cwd === HOME) return "~";
      if (cwd.indexOf(HOME + "/") === 0) return "~" + cwd.slice(HOME.length);
      return cwd;
    },
    node: nodeAt,
    norm: norm,

    cd(path) {
      const n = nodeAt(path);
      if (!n) return { err: "no such file or directory" };
      if (n.type !== "dir") return { err: "not a directory" };
      cwd = norm(path);
      return { ok: true };
    },
    list(path) {
      const n = nodeAt(path || ".");
      if (!n) return { err: "no such file or directory" };
      if (n.type === "file") return { ok: true, entries: [{ name: (path || "").split("/").pop() || path, node: n }] };
      return { ok: true, entries: Object.keys(n.children).sort().map((name) => ({ name: name, node: n.children[name] })) };
    },
    read(path) {
      const n = nodeAt(path);
      if (!n) return { err: "no such file or directory" };
      if (n.type === "dir") return { err: "is a directory" };
      return { ok: true, content: n.content };
    },
    mkdir(path) {
      const p = parentAndName(path);
      if (!p.parent || p.parent.type !== "dir") return { err: "no such file or directory" };
      if (p.parent.children[p.name]) return { err: "file exists" };
      p.parent.children[p.name] = dir({});
      return { ok: true };
    },
    touch(path) {
      const p = parentAndName(path);
      if (!p.parent || p.parent.type !== "dir") return { err: "no such file or directory" };
      if (!p.parent.children[p.name]) p.parent.children[p.name] = file("");
      return { ok: true };
    },
    write(path, content) {
      const p = parentAndName(path);
      if (!p.parent || p.parent.type !== "dir") return { err: "no such file or directory" };
      p.parent.children[p.name] = file(content);
      return { ok: true };
    },
    rm(path) {
      const p = parentAndName(path);
      if (!p.parent || !p.parent.children[p.name]) return { err: "no such file or directory" };
      if (p.abs === HOME || p.abs === "/") return { err: "refusing to remove " + p.abs };
      delete p.parent.children[p.name];
      return { ok: true };
    },
    isDir(path) { const n = nodeAt(path); return !!(n && n.type === "dir"); },
  };

  PT.vfs = vfs;
})(window.Arkeus);
