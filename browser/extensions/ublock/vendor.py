#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""Fetch the latest AMO-signed uBlock Origin xpi into this directory.

Run from anywhere:

    python3 browser/extensions/ublock/vendor.py

Re-run to update to the latest release, then rebuild. The build only
packages uBlock Origin when the xpi is present (see
browser/extensions/moz.configure).
"""

import os
import sys
import urllib.request

AMO_URL = "https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi"
XPI_NAME = "uBlock0@raymondhill.net.xpi"


def main():
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), XPI_NAME)
    print(f"Downloading {AMO_URL}")
    with urllib.request.urlopen(AMO_URL) as resp:
        data = resp.read()
    if not data.startswith(b"PK"):
        print("Downloaded file is not a zip archive; aborting.", file=sys.stderr)
        return 1
    with open(dest, "wb") as f:
        f.write(data)
    print(f"Saved {len(data)} bytes to {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
