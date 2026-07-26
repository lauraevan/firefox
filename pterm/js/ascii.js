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

  /* Distro logos for fastfetch. Recognizable, compact, monochrome-friendly. */
  ascii.distros = {
    "pterm": [
      "  ██████╗ ",
      "  ██╔══██╗",
      "  ██████╔╝",
      "  ██╔═══╝ ",
      "  ██║     ",
      "  ██║     ",
      "  ╚═╝     "
    ],
    "arch": [
      "                   -`",
      "                  .o+`",
      "                 `ooo/",
      "                `+oooo:",
      "               `+oooooo:",
      "               -+oooooo+:",
      "             `/:-:++oooo+:",
      "            `/++++/+++++++:",
      "           `/++++++++++++++:",
      "          `/+++ooooooooooooo/`",
      "         ./ooosssso++osssssso+`",
      "        .oossssso-````/ossssss+`",
      "       -osssssso.      :ssssssso.",
      "      :osssssss/        osssso+++.",
      "     /ossssssss/        +ssssooo/-",
      "   `/ossssso+/:-        -:/+osssso+-",
      "  `+sso+:-`                 `.-/+oso:",
      " `++:.                           `-/+/",
      " .`                                 `/"
    ],
    "blackarch": [
      "                    00",
      "                   0000",
      "                  000000",
      "                 00000000",
      "                0000  0000",
      "               000      000",
      "              000        000",
      "             000   0000   000",
      "            000  00000000  000",
      "           000  000    000  000",
      "          000  00        00  000",
      "         000  0    0000    0  000",
      "        00   0   00000000   0   00",
      "       0    0  000      000  0    0",
      "      0   000 00          00 000   0",
      "     00000000                00000000",
      "    B L A C K A R C H  L I N U X"
    ],
    "ubuntu": [
      "            .-/+oossssoo+/-.",
      "        `:+ssssssssssssssssss+:`",
      "      -+ssssssssssssssssssyyssss+-",
      "    .ossssssssssssssssssdMMMNysssso.",
      "   /ssssssssssshdmmNNmmyNMMMMhssssss/",
      "  +ssssssssshmydMMMMMMMNddddyssssssss+",
      " /sssssssshNMMMyhhyyyyhmNMMMNhssssssss/",
      ".ssssssssdMMMNhsssssssssshNMMMdssssssss.",
      "+sssshhhyNMMNyssssssssssssyNMMMysssssss+",
      "ossyNMMMNyMMhsssssssssssssshmmmhssssssso",
      "ossyNMMMNyMMhsssssssssssssshmmmhssssssso",
      "+sssshhhyNMMNyssssssssssssyNMMMysssssss+",
      ".ssssssssdMMMNhsssssssssshNMMMdssssssss.",
      " /sssssssshNMMMyhhyyyyhdNMMMNhssssssss/",
      "  +sssssssssdmydMMMMMMMMddddyssssssss+",
      "   /ssssssssssshdmNNNNmyNMMMMhssssss/",
      "    .ossssssssssssssssssdMMMNysssso.",
      "      -+sssssssssssssssssyyyssss+-",
      "        `:+ssssssssssssssssss+:`",
      "            .-/+oossssoo+/-."
    ],
    "mint": [
      " MMMMMMMMMMMMMMMMMMMMMMMMMmds+.",
      " MMm----::-://////////////oymNMd+`",
      " MMd      /++                -sNMd:",
      " MMNso/`  dMM    `.::-. .-::.` .hMN:",
      " ddddMMh  dMM   :hNMNMNhNMNMNh: `NMm.",
      "     NMm  dMM  .NMN/-+MMM+-/NMN` dMM.",
      "     NMm  dMM  -MMm  `MMM   dMM. dMM.",
      "     NMm  dMM  -MMm  `MMM   dMM. dMM.",
      "     NMm  dMM  .mmd  `mmm   yMM. dMM.",
      "     NMm  dMM`  ..`   ...   ydm. dMM.",
      "     hMM- +MMd/-------...-:sdds  dMM.",
      "     -NMm- :hNMNNNmdddddddddy/`  dMM.",
      "      -dMNs-``-::::-------.``    dMM.",
      "       `/dMNmy+/:-------------:/yMMM.",
      "          ./ydNMMMMMMMMMMMMMMMMMMMMM.",
      "             .MMMMMMMMMMMMMMMMMMM"
    ],
    "debian": [
      "       _,met$$$$$gg.",
      "    ,g$$$$$$$$$$$$$$$P.",
      "  ,g$$P\"     \"\"\"Y$$.\".",
      " ,$$P'              `$$$.",
      "',$$P       ,ggs.     `$$b:",
      "`d$$'     ,$P\"'   .    $$$",
      " $$P      d$'     ,    $$P",
      " $$:      $$.   -    ,d$$'",
      " $$;      Y$b._   _,d$P'",
      " Y$$.    `.`\"Y$$$$P\"'",
      " `$$b      \"-.__",
      "  `Y$$",
      "   `Y$$.",
      "     `$$b.",
      "       `Y$$b.",
      "          `\"Y$b._",
      "              `\"\"\""
    ],
    "fedora": [
      "          /:-------------:\\",
      "       :-------------------::",
      "     :-----------/shhOHbmp---:\\",
      "   /-----------omMMMNNNMMD  ---:",
      "  :-----------sMMMMNMNMP.    ---:",
      " :-----------:MMMdP-------    ---\\",
      ",------------:MMMd--------    ---:",
      ":------------:MMMd-------    .---:",
      ":----    oNMMMMMMMMMNho     .----:",
      ":--     .+shhhMMMmhhy++   .------/",
      ":-    -------:MMMd--------------:",
      ":-   --------/MMMd-------------;",
      ":-    ------/hMMMy------------:",
      ":-- :dMNdhhdNMMNo------------;",
      ":---:sdNMMMMNds:------------:",
      ":------:://:-------------::",
      ":---------------------://"
    ],
    "kali": [
      "..............",
      "            ..,;:ccc,.",
      "          ......''';lxO.",
      ".....''''..........,:ld;",
      "           .';;;:::;,,.x,",
      "      ..'''.            0Xxoc:,.  ...",
      "  ....                ,ONkc;,;cokOdc',.",
      " .                   OMo           ':ddo.",
      "                    dMc               :OO;",
      "                    0M.                 .:o.",
      "                    ;Wd",
      "                     ;XO,",
      "                       ,d0Odlc;,..",
      "                           ..',;:cdOOd::,.",
      "                                    .:d;.':;.",
      "                                       'd,  .'",
      "                                         ;l   ..",
      "                                          .o"
    ],
    "gentoo": [
      "         -/oyddmdhs+:.",
      "     -odNMMMMMMMMNNmhy+-`",
      "   -yNMMMMMMMMMMMNNNmmdhy+-",
      " `omMMMMMMMMMMMMNmdmmmmddhhy/`",
      " omMMMMMMMMMMMNhhyyyohmdddhhhdo`",
      ".ydMMMMMMMMMMdhs++so/smdddhhhhdm+`",
      " oyhdmNMMMMMMMNdyooydmddddhhhhyhNd.",
      "  :oyhhdNNMMMMMMMNNNmmdddhhhhhyymMh",
      "    .:+sydNMMMMMNNNmmmdddhhhhhhmMmy",
      "       /mMMMMMMNNNmmmdddhhhhhmMNhs:",
      "    `oNMMMMMMMNNNmmmddddhhdmMNhs+`",
      "  `sNMMMMMMMMNNNmmmdddddmNMmhs/.",
      " /NMMMMMMMMNNNNmmmdddmNMNdso:`",
      "+MMMMMMMNNNNNmmmmdmNMNdso/-",
      "yMMNNNNNNNmmmmmNNMmhs+/-`",
      "/hMMNNNNNNNNMNdhs++/-`",
      "`/ohdmmddhys+++/:.`",
      "  `-//////:--."
    ],
    "pop": [
      "             /////////////",
      "         /////////////////////",
      "      ///////*767////////////////",
      "    //////7676767676*//////////////",
      "   /////76767//7676767//////////////",
      "  /////767676///*76767///////////////",
      " ///////767676///76767.///7676*///////",
      "/////////767676//76767///767676////////",
      "//////////76767676767////76767/////////",
      "///////////76767676//////7676//////////",
      "////////////,7676,///////767///////////",
      "/////////////*7676///////76////////////",
      "///////////////7676////////////////////",
      " ///////////////7676///767////////////",
      "  //////////////////////'////////////",
      "   //////.7676767676767676767,//////",
      "    /////767676767676767676767/////",
      "      ///////////////////////////",
      "         /////////////////////",
      "             /////////////"
    ],
    "nixos": [
      "          ::::.    ':::::     ::::'",
      "          ':::::    ':::::.  ::::'",
      "            :::::     '::::.:::::",
      "      .......:::::..... ::::::::",
      "     ::::::::::::::::::. ::::::    ::::.",
      "    ::::::::::::::::::::: :::::.  .::::'",
      "           .....           ::::' :::::'",
      "          :::::            '::::.::::'",
      "   ::::::::::::.          ':::::::::",
      "   ::::::::::::::.        ':::::::",
      "   ::::::::::::::::         ::::::",
      "    .....:::::               '::.",
      "   :::::::::::::::::.        :::::.",
      "    ::::::::::::::::::::.  .::::::"
    ],
    "void": [
      "                __.;=====;.__",
      "            _.=+==++=++=+=+===;.",
      "             -=+++=+===+=+=+++++=_",
      "        .     -=:``     `--==+=++==.",
      "       _vi,    `            --+=++++:",
      "      .uvnvi.       _._       -==+==+.",
      "     .vvnvnI`    .;==|==;.     :|=||=|.",
      "+QmmQQmvvnvi,   /QQ WWQQWQV\\_  -=++++++",
      " |QQQQmmQmvvI, |QQ Q  Q_ .Vili;=+=++++",
      "  jQQQQmmmvI,` QW  W  QVii+++==++++++",
      "  jQQQmmvI,`   QW  W  Q\\_+==+=++++++",
      " jQQQmvI,`      QW  W  Q\\_+==+=++++++",
      "  jQQQmvi,`      QW  W  Q\\_+=+=+++++"
    ],
    "tux": [
      "        a8888b.",
      "       d888888b.",
      "       8P\"YP\"Y88",
      "       8|o||o|88",
      "       8'    .88",
      "       8`._.' Y8.",
      "      d/      `8b.",
      "     dP   .    Y8b.",
      "    d8:'  \"  `::88b.",
      "   d8\"         'Y88b",
      "  :8P    '      :888",
      "   8a.   :     _a88P",
      " ._/\"Yaa_:   .| 88P|",
      " \\    YP\"    `| 8P  `.",
      " /     \\.___.d|    .'",
      " `--..__)8888P`._.'"
    ],
    "windows": [
      "        ,.=:!!t3Z3z.,",
      "       :tt:::tt333EE3",
      "       Et:::ztt33EEEL  @Ee.,      ..,",
      "      ;tt:::tt333EE7  ;EEEEEEttttt33#",
      "     :Et:::zt333EEQ.  $EEEEEttttt33QL",
      "     it::::tt333EEF  @EEEEEEttttt33F",
      "    ;3=*^```\"*4EEV  :EEEEEEttttt33@.",
      "    ,.=::::it=.,`  @EEEEEEtttz33QF",
      "   ;::::::::zt33)   \"4EEEtttji3P*",
      "  :t::::::::tt33.:Z3z..  `` ,..g.",
      "  i::::::::zt33F AEEEtttt::::ztF",
      " ;:::::::::t33V ;EEEttttt::::t3",
      " E::::::::zt33L @EEEtttt::::z3F",
      "{3=*^```\"*4E3) ;EEEtttt:::::tZ`",
      "             ` :EEEEtttt::::z7",
      "                 \"VEzjt:;;z>*`"
    ]
  };

  ascii.distroNames = function () { return Object.keys(ascii.distros); };

  ascii.logo = function (name) {
    return ascii.distros[String(name || "").toLowerCase()] || ascii.distros.pterm;
  };

  ascii.render = function (linesOrStr, cls) {
    const text = Array.isArray(linesOrStr) ? linesOrStr.join("\n") : linesOrStr;
    return '<span class="pt-logo ' + (cls || "") + '">' + PT.util.esc(text) + "</span>";
  };

  PT.ascii = ascii;
})(window.PTerm);
