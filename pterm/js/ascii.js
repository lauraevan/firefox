/* PTerm - ASCII art and banners */
window.PTerm = window.PTerm || {};

(function (PT) {
  "use strict";

  const ascii = {};

  /* Full "PTERM" wordmark (ANSI Shadow style). */
  ascii.banner = [
    " ██████╗ ████████╗███████╗██████╗ ███╗   ███╗",
    " ██╔══██╗╚══██╔══╝██╔════╝██╔══██╗████╗ ████║",
    " ██████╔╝   ██║   █████╗  ██████╔╝██╔████╔██║",
    " ██╔═══╝    ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║",
    " ██║        ██║   ███████╗██║  ██║██║ ╚═╝ ██║",
    " ╚═╝        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝",
  ].join("\n");

  /* Standalone block "P" used by fastfetch. */
  ascii.pLogo = [
    "        ",
    "  ██████╗ ",
    "  ██╔══██╗",
    "  ██████╔╝",
    "  ██╔═══╝ ",
    "  ██║     ",
    "  ██║     ",
    "  ╚═╝     ",
    "        ",
  ];

  /* Big boot P (drawn with a portal ring around it). */
  ascii.bootP = [
    "            .:=+**+=:.            ",
    "        .=*#%@@@@@@@%#*=.         ",
    "      -*%@@%*=--::--=*%@@%*-      ",
    "    -#@@#=.   ██████╗   .=#@@#-   ",
    "   +@@*.      ██╔══██╗      .*@@+ ",
    "  +@@=        ██████╔╝        =@@+",
    "  %@#         ██╔═══╝         #@%",
    "  %@#         ██║             #@%",
    "  +@@=        ██║            =@@+ ",
    "   +@@*.      ╚═╝          .*@@+  ",
    "    -#@@#=.            .=#@@#-    ",
    "      -*%@@%*=--::--=*%@@%*-      ",
    "        .=*#%@@@@@@@%#*=.         ",
    "            .:=+**+=:.            ",
  ];

  ascii.render = function (linesOrStr, cls) {
    const text = Array.isArray(linesOrStr) ? linesOrStr.join("\n") : linesOrStr;
    return '<span class="pt-logo ' + (cls || "") + '">' + PT.util.esc(text) + "</span>";
  };

  PT.ascii = ascii;
})(window.PTerm);
