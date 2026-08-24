/* Entry for the local Chromium preview harness (not shipped). */

import React from "react";
import { createRoot } from "react-dom/client";
import { SafariStartPageInner } from "content-src/components/Safari/SafariStartPageInner";
import { MOCK } from "./mockData";

const root = createRoot(document.getElementById("root"));
root.render(<SafariStartPageInner {...MOCK} />);
