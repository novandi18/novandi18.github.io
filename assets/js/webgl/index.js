// WebGL entry point. Feature-gates every effect and only initialises the ones whose
// DOM hooks exist. If WebGL is unavailable the whole module is a no-op and the site
// falls back to its original CSS behaviour.

import { supportsWebGL } from "./util.js";
import { initReconGrid } from "./recon-grid.js";
import { initGalleryHalftone } from "./gallery-halftone.js";
import { initMonogram } from "./monogram.js";

function boot() {
  if (!supportsWebGL()) return;

  const canvas = document.querySelector(".recon-grid");
  const hero = document.querySelector("#home");
  if (canvas && hero) {
    try {
      initReconGrid(canvas, hero);
    } catch (e) {
      console.warn("Recon Grid failed to start:", e);
    }
  }

  const items = document.querySelectorAll(".portofolio-item");
  if (items.length) {
    try {
      initGalleryHalftone(items);
    } catch (e) {
      console.warn("Gallery halftone failed to start:", e);
    }
  }

  // Skip the monogram when its mount is hidden (e.g. narrow screens where CSS sets
  // display:none) so we don't waste a WebGL context or a font fetch.
  const monogram = document.querySelector(".monogram");
  if (monogram && monogram.offsetParent !== null) {
    try {
      initMonogram(monogram);
    } catch (e) {
      console.warn("Monogram failed to start:", e);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
