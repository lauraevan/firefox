/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";

// Cross-device onboarding card shown in the Recently Viewed section when there
// are no recent cross-device items yet. "Turn On" opens the real Firefox
// account / sync setup (the genuine equivalent of the iCloud feature); "Not
// Now" persists a dismissal through onDismiss.
export function SafariSyncCard({ onDismiss }) {
  return (
    <div className="safari-synccard">
      <h3 className="safari-synccard__title">
        Include topics from other devices
      </h3>
      <p className="safari-synccard__desc">
        Safari can include topics on your other devices signed into this iCloud
        account.{" "}
        <a
          className="safari-link"
          href="https://support.mozilla.org/products/firefox/sync"
        >
          About Safari &amp; Privacy...
        </a>
      </p>
      <div className="safari-synccard__actions">
        <button
          type="button"
          className="safari-btn safari-btn--neutral"
          onClick={onDismiss}
        >
          Not Now
        </button>
        <a
          className="safari-btn safari-btn--primary"
          href="about:preferences#sync"
        >
          Turn On
        </a>
      </div>
    </div>
  );
}
