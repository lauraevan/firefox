/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef, useState } from "react";
import {
  AdjustmentsIcon,
  CheckIcon,
} from "content-src/components/Safari/icons";

function CheckRow({ label, checked, onToggle }) {
  return (
    <button
      type="button"
      className={`safari-customize__row${checked ? " is-checked" : ""}`}
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={onToggle}
    >
      <span className="safari-customize__check">
        {checked ? <CheckIcon /> : null}
      </span>
      <span className="safari-customize__label">{label}</span>
    </button>
  );
}

// Each toggle is bound to a real, persisted preference through `onSetPref`, so
// the popover controls actual browser state rather than decorative switches.
export function SafariCustomizePopover({ sections, onSetPref }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocClick = event => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = event => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="safari-customize" ref={wrapperRef}>
      {open ? (
        <div className="safari-customize__popover" role="menu">
          {sections.map(item => (
            <CheckRow
              key={item.pref}
              label={item.label}
              checked={item.value}
              onToggle={() => onSetPref(item.pref, !item.value)}
            />
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={`safari-customize__button${open ? " is-open" : ""}`}
        aria-label="Edit start page"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <AdjustmentsIcon />
      </button>
    </div>
  );
}
