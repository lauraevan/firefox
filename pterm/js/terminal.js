/* PTerm - terminal engine: I/O, input line, history, tab completion */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const U = PT.util;

  const terminal = {
    _buffer: "",
    _cursor: 0,
    _history: [],
    _histIdx: -1,
    _draft: "",
    _busy: false,
    _lastLine: null,

    init() {
      this.screen = document.getElementById("pt-screen");
      this.output = document.getElementById("pt-output");
      this.inputLine = document.getElementById("pt-inputline");
      this.promptEl = document.getElementById("pt-prompt");
      this.renderedEl = document.getElementById("pt-rendered");
      this.capture = document.getElementById("pt-capture");

      this._history = U.store.get("history") || [];
      this._histIdx = this._history.length;

      this.promptHTML =
        '<span class="c-dim">' + PT.env.user + "@" + PT.env.host + "</span>" +
        '<span class="c-mute">:</span><span class="c-accent">~</span>' +
        '<span class="c-mute">$</span> ';
      this.promptEl.innerHTML = this.promptHTML;

      this._bindKeys();

      const refocus = (e) => {
        if (PT.launcher.isOpen()) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return; // don't steal an active selection
        this.focus();
      };
      this.screen.addEventListener("mouseup", refocus);
      this.screen.addEventListener("touchend", refocus);

      // launch games when their names are clicked in listings
      this.output.addEventListener("click", (e) => {
        const el = e.target.closest("[data-game-id]");
        if (!el) return;
        e.preventDefault();
        const id = el.getAttribute("data-game-id");
        const game = PT.catalog.all().find((g) => g.id === id);
        if (game) {
          this.println(this.promptHTML + '<span class="c-dim">click</span> ' + U.esc(game.name));
          PT.launcher.launch(game);
        }
      });
    },

    /* ---------- output ---------- */

    _appendLine(html, cls) {
      const div = document.createElement("div");
      div.className = "pt-line" + (cls ? " " + cls : "");
      div.innerHTML = html == null ? "" : html;
      this.output.appendChild(div);
      this._lastLine = div;
      this._scroll();
      return div;
    },

    print(html) { return this._appendLine(html); },
    println(html) { return this._appendLine(html); },
    printLines(arr) { arr.forEach((l) => this._appendLine(l)); },
    printBlock(html) { return this._appendLine(html); },

    appendToLast(html) {
      if (this._lastLine) { this._lastLine.innerHTML += html; this._scroll(); }
      else this._appendLine(html);
    },

    printError(msg) { this._appendLine('<span class="c-error">error:</span> ' + msg); },
    printWarn(msg) { this._appendLine('<span class="c-warn">warning:</span> ' + msg); },

    clear() { this.output.innerHTML = ""; this._lastLine = null; },

    _scroll() {
      this.screen.scrollTop = this.screen.scrollHeight;
    },

    /* typewriter for boot text (plain text only) */
    async typeText(text, opts) {
      opts = opts || {};
      const div = this._appendLine("", opts.cls);
      const speed = opts.speed == null ? 6 : opts.speed;
      if (speed <= 0) { div.innerHTML = U.esc(text); this._scroll(); return; }
      for (let i = 0; i < text.length; i++) {
        div.textContent += text[i];
        if (text[i] !== " ") { this._scroll(); await U.sleep(speed); }
      }
    },

    /* ---------- prompt / input line ---------- */

    showPrompt() {
      this._busy = false;
      this.inputLine.hidden = false;
      this._render();
      this.focus();
      this._scroll();
    },

    hidePrompt() {
      this.inputLine.hidden = true;
    },

    focus() {
      if (this.capture) { try { this.capture.focus({ preventScroll: true }); } catch (e) { this.capture.focus(); } }
    },

    getHistory() { return this._history.slice(); },

    _render() {
      const b = this._buffer;
      const pos = this._cursor;
      let html;
      if (pos >= b.length) {
        html = U.esc(b) + '<span class="pt-cursor"></span>';
      } else {
        html = U.esc(b.slice(0, pos)) +
          '<span class="pt-cursor pt-cursor-mid">' + U.esc(b[pos] || " ") + "</span>" +
          U.esc(b.slice(pos + 1));
      }
      this.renderedEl.innerHTML = html;
    },

    _setBuffer(str, cursor) {
      this._buffer = str;
      this._cursor = cursor == null ? str.length : Math.max(0, Math.min(cursor, str.length));
      this._render();
    },

    /* ---------- key handling ---------- */

    _bindKeys() {
      this.capture.addEventListener("keydown", (e) => this._onKey(e));
      this.capture.addEventListener("paste", (e) => {
        if (this._busy) return;
        const text = (e.clipboardData || window.clipboardData).getData("text");
        if (text) {
          e.preventDefault();
          this._insert(text.replace(/\r?\n/g, " "));
        }
      });
    },

    _insert(str) {
      const b = this._buffer;
      this._buffer = b.slice(0, this._cursor) + str + b.slice(this._cursor);
      this._cursor += str.length;
      this._render();
    },

    _onKey(e) {
      if (PT.launcher.isOpen()) return;
      const key = e.key;

      if (this._busy) {
        // allow Ctrl+C to at least drop a fresh line visually
        if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "C")) e.preventDefault();
        return;
      }

      // printable
      if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this._insert(key);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (key.toLowerCase()) {
          case "l": e.preventDefault(); this.clear(); return;
          case "c": e.preventDefault(); this._cancelLine(); return;
          case "u": e.preventDefault(); this._setBuffer(this._buffer.slice(this._cursor), 0); return;
          case "k": e.preventDefault(); this._setBuffer(this._buffer.slice(0, this._cursor)); return;
          case "a": e.preventDefault(); this._cursor = 0; this._render(); return;
          case "e": e.preventDefault(); this._cursor = this._buffer.length; this._render(); return;
          case "w": e.preventDefault(); this._deleteWord(); return;
          default: return;
        }
      }

      switch (key) {
        case "Enter":
          e.preventDefault();
          this._submit();
          return;
        case "Backspace":
          e.preventDefault();
          if (this._cursor > 0) {
            this._buffer = this._buffer.slice(0, this._cursor - 1) + this._buffer.slice(this._cursor);
            this._cursor--;
            this._render();
          }
          return;
        case "Delete":
          e.preventDefault();
          this._buffer = this._buffer.slice(0, this._cursor) + this._buffer.slice(this._cursor + 1);
          this._render();
          return;
        case "ArrowLeft":
          e.preventDefault();
          if (this._cursor > 0) { this._cursor--; this._render(); }
          return;
        case "ArrowRight":
          e.preventDefault();
          if (this._cursor < this._buffer.length) { this._cursor++; this._render(); }
          return;
        case "ArrowUp":
          e.preventDefault(); this._historyPrev(); return;
        case "ArrowDown":
          e.preventDefault(); this._historyNext(); return;
        case "Home":
          e.preventDefault(); this._cursor = 0; this._render(); return;
        case "End":
          e.preventDefault(); this._cursor = this._buffer.length; this._render(); return;
        case "Tab":
          e.preventDefault(); this._complete(); return;
        default:
          return;
      }
    },

    _deleteWord() {
      let i = this._cursor;
      while (i > 0 && this._buffer[i - 1] === " ") i--;
      while (i > 0 && this._buffer[i - 1] !== " ") i--;
      this._buffer = this._buffer.slice(0, i) + this._buffer.slice(this._cursor);
      this._cursor = i;
      this._render();
    },

    _cancelLine() {
      this._appendLine(this.promptHTML + U.esc(this._buffer) + '<span class="c-dim">^C</span>');
      this._setBuffer("", 0);
      this._histIdx = this._history.length;
    },

    /* ---------- history ---------- */

    _historyPrev() {
      if (!this._history.length) return;
      if (this._histIdx === this._history.length) this._draft = this._buffer;
      this._histIdx = Math.max(0, this._histIdx - 1);
      this._setBuffer(this._history[this._histIdx]);
    },

    _historyNext() {
      if (this._histIdx >= this._history.length) return;
      this._histIdx++;
      if (this._histIdx === this._history.length) this._setBuffer(this._draft || "");
      else this._setBuffer(this._history[this._histIdx]);
    },

    _pushHistory(line) {
      if (!line.trim()) return;
      if (this._history[this._history.length - 1] !== line) {
        this._history.push(line);
        if (this._history.length > 200) this._history.shift();
        U.store.set("history", this._history);
      }
      this._histIdx = this._history.length;
      this._draft = "";
    },

    /* ---------- completion ---------- */

    _complete() {
      const b = this._buffer.slice(0, this._cursor);
      const tokens = U.tokenize(b);
      const endsSpace = /\s$/.test(b);
      const isFirst = tokens.length === 0 || (tokens.length === 1 && !endsSpace);

      if (isFirst) {
        const prefix = (tokens[0] || "").toLowerCase();
        const names = PT.commands.commandNames().filter((n) => n.startsWith(prefix));
        this._applyCompletion(prefix, names, false);
        return;
      }

      const wordRaw = endsSpace ? "" : (tokens[tokens.length - 1] || "");

      // S= source completion
      const sMatch = wordRaw.match(/^(s|source)=(.*)$/i);
      if (sMatch) {
        const p = sMatch[2].toLowerCase();
        const labels = PT.catalog.SOURCES.map((s) => s.key).filter((k) => k.startsWith(p));
        this._applyCompletion(sMatch[2], labels.map((k) => sMatch[1] + "=" + k), false, sMatch[2]);
        return;
      }

      // game name completion for game-aware commands
      const cmd = (tokens[0] || "").toLowerCase();
      const gameAware = ["npm", "play", "open", "launch", "search", "s", "info", "show",
        "install", "fav", "favorite", "star", "unfav"];
      if (gameAware.indexOf(cmd) >= 0 && PT.catalog.all().length) {
        const p = wordRaw.replace(/^["']|["']$/g, "").toLowerCase();
        if (!p) return;
        const matches = PT.catalog.all().filter((g) => g.name.toLowerCase().startsWith(p));
        if (!matches.length) return;
        if (matches.length === 1) {
          this._replaceLastWord(wordRaw, quoteIfNeeded(matches[0].name));
        } else {
          const common = commonPrefix(matches.map((g) => g.name));
          if (common.length > p.length) this._replaceLastWord(wordRaw, common);
          this._appendLine('<span class="c-dim">' +
            matches.slice(0, 16).map((g) => U.esc(g.name)).join("   ") +
            (matches.length > 16 ? "   ..." : "") + "</span>");
        }
      }
    },

    _applyCompletion(prefix, matches, quote, replaceWord) {
      if (!matches.length) return;
      if (matches.length === 1) {
        if (replaceWord != null) this._replaceLastWord(prefix, matches[0]);
        else this._setBuffer(matches[0] + " ");
      } else {
        const common = commonPrefix(matches);
        if (common.length > prefix.length) {
          if (replaceWord != null) this._replaceLastWord(prefix, common);
          else this._setBuffer(common);
        }
        this._appendLine('<span class="c-dim">' + matches.map((m) => U.esc(m)).join("   ") + "</span>");
      }
    },

    _replaceLastWord(oldWord, newWord) {
      const b = this._buffer;
      const idx = b.lastIndexOf(oldWord, this._cursor);
      if (idx < 0) { this._insert(newWord); return; }
      const before = b.slice(0, idx);
      const after = b.slice(idx + oldWord.length);
      this._buffer = before + newWord + after;
      this._cursor = (before + newWord).length;
      this._render();
    },

    /* ---------- submit / dispatch ---------- */

    _submit() {
      const line = this._buffer;
      this._appendLine(this.promptHTML + U.esc(line));
      this._setBuffer("", 0);
      if (!line.trim()) { this._scroll(); return; }
      this._pushHistory(line);
      this.runLine(line);
    },

    async runLine(line) {
      const tokens = U.tokenize(line);
      const name = tokens[0];
      const cmd = PT.commands.resolve(name);
      if (!cmd) {
        this.printError("command not found: " + U.esc(name) +
          '. type <span class="c-accent">help</span> for a list.');
        this.showPrompt();
        return;
      }
      const { args, flags } = U.parseFlags(tokens.slice(1));
      this._busy = true;
      this.hidePrompt();
      try {
        await cmd.run(this, args, flags, line);
      } catch (err) {
        this.printError(U.esc((err && err.message) || String(err)));
        if (window.console) console.error(err);
      }
      this.showPrompt();
    },
  };

  function commonPrefix(arr) {
    if (!arr.length) return "";
    let p = arr[0];
    for (const s of arr) {
      let i = 0;
      while (i < p.length && i < s.length && p[i].toLowerCase() === s[i].toLowerCase()) i++;
      p = p.slice(0, i);
      if (!p) break;
    }
    return p;
  }

  function quoteIfNeeded(s) {
    return /\s/.test(s) ? '"' + s + '"' : s;
  }

  PT.terminal = terminal;
})(window.PTerm);
