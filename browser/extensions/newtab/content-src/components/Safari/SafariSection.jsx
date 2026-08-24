/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

export function SafariSection({ title, children }) {
  return (
    <section className="safari-section">
      {title ? <h2 className="safari-section__title">{title}</h2> : null}
      {children}
    </section>
  );
}
