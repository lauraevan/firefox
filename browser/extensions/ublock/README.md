# Built-in uBlock Origin

This directory ships uBlock Origin with the browser so ad blocking works
out of the box in every new profile.

## How it works

- `vendor.py` downloads the latest AMO-signed xpi
  (`uBlock0@raymondhill.net.xpi`) into this directory.
- When the xpi is present, configure sets `MOZ_UBLOCK_XPI` (see
  `browser/extensions/moz.configure`) and `moz.build` packages it into the
  application's `distribution/extensions/` directory.
- Firefox installs anything in `distribution/extensions/` into a profile
  on first run, enabled by default. Because the xpi is AMO-signed, uBlock
  Origin keeps receiving automatic updates from addons.mozilla.org
  between our releases, and regular extension management in
  about:addons continues to work normally.

## Updating

Re-run `python3 browser/extensions/ublock/vendor.py` and rebuild.

## Licensing

uBlock Origin is licensed under the GPLv3 (the browser itself is MPL 2.0;
the two remain separate works). Keep the xpi unmodified and its license
and attribution intact. If you ever patch uBlock Origin itself, publish
those patches.
