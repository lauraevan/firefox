/* Arkeus build: concatenate the readable js/*.js sources and obfuscate them into
   dist/arkeus.min.js (what index.html actually deploys). Game data (js/catalogs.js)
   is loaded separately and is not obfuscated -- it's public game listings.

   Usage:  npm install javascript-obfuscator   &&   node build.js
   Moderate settings: identifiers mangled + strings base64'd, but property names and
   control flow are left intact so the app keeps working (obfuscation deters casual
   source-reading; it is not, and cannot be, real security on its own). */
const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const DIR = path.join(__dirname, "js");
const ORDER = ["util", "ascii", "auth", "vfs", "catalog", "launcher", "commands", "terminal", "boot"];

const src = ORDER.map((n) => fs.readFileSync(path.join(DIR, n + ".js"), "utf8")).join("\n;\n");

const result = JavaScriptObfuscator.obfuscate(src, {
  compact: true,
  simplify: true,
  target: "browser",
  identifierNamesGenerator: "mangled-shuffled",
  renameGlobals: false,
  renameProperties: false,          // must stay off: PT.util, crypto.subtle, DOM props
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayWrappersType: "variable",
  splitStrings: true,
  splitStringsChunkLength: 10,
  numbersToExpressions: true,
  transformObjectKeys: false,
  controlFlowFlattening: false,     // off: avoids breakage + slowdown
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  unicodeEscapeSequence: false,
}).getObfuscatedCode();

const distDir = path.join(__dirname, "dist");
fs.mkdirSync(distDir, { recursive: true });
const banner = "/* Arkeus - obfuscated bundle. Built from js/*.js by build.js. */\n";
fs.writeFileSync(path.join(distDir, "arkeus.min.js"), banner + result);
console.log("built dist/arkeus.min.js (" + ((banner.length + result.length) / 1024).toFixed(0) +
  " KB) from " + ORDER.length + " source files");
