// Recon Grid — the signature hero backdrop.
// A monochrome field of ink nodes on the cream paper, linked by hairlines into a
// shifting topology. A periodic orange "scan sweep" crosses the field and lights up
// the nodes it passes — a nod to reconnaissance / port scanning.
//
// Stays behind all content (pointer-events:none, low z-index) so the custom cursor
// and magnetic buttons keep working. Honors reduced-motion and pauses off-screen.

import * as THREE from "three";
import {
  COLORS,
  REDUCED_MOTION,
  dpr,
  createLoop,
  observeVisibility,
  debounce,
} from "./util.js";

const LINK_DIST = 0.15; // world-space distance below which two nodes connect
const SWEEP_BAND = 0.045; // half-width of the scan sweep highlight band
const CYCLE = 10; // seconds between scan sweeps
const SWEEP_DUR = 2.2; // seconds a single sweep takes to cross the field

export function initReconGrid(canvas, hero) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(dpr());

  let width = window.innerWidth;
  let height = window.innerHeight;
  let aspect = width / height;
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
  camera.position.z = 2;

  const ink = new THREE.Color(COLORS.ink);
  const accent = new THREE.Color(COLORS.accent);
  const tmp = new THREE.Color();

  // Node count scales with viewport area, generously capped.
  const small = width < 700;
  const COUNT = small
    ? 26
    : Math.min(64, Math.max(40, Math.round((width * height) / 24000)));

  const nodes = [];
  for (let i = 0; i < COUNT; i++) {
    nodes.push({
      x: (Math.random() * 2 - 1) * aspect,
      y: Math.random() * 2 - 1,
      vx: (Math.random() * 2 - 1) * 0.0007,
      vy: (Math.random() * 2 - 1) * 0.0007,
      accent: Math.random() < 0.04, // a few nodes glow orange at rest
      flash: 0, // transient highlight from the scan sweep
    });
  }

  // Points ---------------------------------------------------------------
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({
    size: 3.5,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // Links ----------------------------------------------------------------
  const MAX_LINKS = COUNT * 6;
  const lPos = new Float32Array(MAX_LINKS * 2 * 3);
  const lCol = new Float32Array(MAX_LINKS * 2 * 3);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
  lGeo.setAttribute("color", new THREE.BufferAttribute(lCol, 3));
  const lMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.15,
  });
  const lines = new THREE.LineSegments(lGeo, lMat);
  scene.add(lines);

  // Pointer (normalized to world space) ----------------------------------
  let pointerX = 999;
  let pointerY = 999;
  const onMove = (e) => {
    pointerX = (e.clientX / width) * 2 - 1;
    pointerX *= aspect;
    pointerY = -((e.clientY / height) * 2 - 1);
  };
  const onLeave = () => {
    pointerX = 999;
    pointerY = 999;
  };
  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseout", onLeave);

  // Simulation -----------------------------------------------------------
  let frame = 0;

  function step(elapsed, animate) {
    const cyclePos = elapsed % CYCLE;
    const sweeping = animate && cyclePos < SWEEP_DUR;
    const sweepX = -aspect + (cyclePos / SWEEP_DUR) * (2 * aspect);

    for (let i = 0; i < COUNT; i++) {
      const n = nodes[i];

      if (animate) {
        n.x += n.vx;
        n.y += n.vy;

        // Gentle repulsion away from the cursor.
        const dx = n.x - pointerX;
        const dy = n.y - pointerY;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.09) {
          const d = Math.sqrt(d2) || 0.0001;
          const force = (1 - d / 0.3) * 0.02;
          n.x += (dx / d) * force;
          n.y += (dy / d) * force;
        }

        // Wrap around the visible field.
        if (n.x > aspect) n.x = -aspect;
        else if (n.x < -aspect) n.x = aspect;
        if (n.y > 1) n.y = -1;
        else if (n.y < -1) n.y = 1;

        // Scan sweep highlight + decay.
        if (sweeping && Math.abs(n.x - sweepX) < SWEEP_BAND) n.flash = 1;
        else n.flash *= 0.9;
      }

      pos[i * 3] = n.x;
      pos[i * 3 + 1] = n.y;
      pos[i * 3 + 2] = 0;

      const mix = n.accent ? 1 : n.flash;
      tmp.copy(ink).lerp(accent, mix);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // Rebuild links every few frames — the expensive O(n^2) part.
    if (!animate || frame % 3 === 0) {
      let li = 0;
      for (let i = 0; i < COUNT && li < MAX_LINKS; i++) {
        for (let j = i + 1; j < COUNT && li < MAX_LINKS; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > LINK_DIST) continue;

          const o = li * 6;
          lPos[o] = nodes[i].x;
          lPos[o + 1] = nodes[i].y;
          lPos[o + 2] = 0;
          lPos[o + 3] = nodes[j].x;
          lPos[o + 4] = nodes[j].y;
          lPos[o + 5] = 0;

          const glow = Math.max(nodes[i].flash, nodes[j].flash);
          tmp.copy(ink).lerp(accent, glow);
          for (let k = 0; k < 2; k++) {
            lCol[o + k * 3] = tmp.r;
            lCol[o + k * 3 + 1] = tmp.g;
            lCol[o + k * 3 + 2] = tmp.b;
          }
          li++;
        }
      }
      lGeo.setDrawRange(0, li * 2);
      lGeo.attributes.position.needsUpdate = true;
      lGeo.attributes.color.needsUpdate = true;
    }

    renderer.render(scene, camera);
    frame++;
  }

  // Loop + gating --------------------------------------------------------
  const loop = createLoop((elapsed) => step(elapsed, true));
  let onScreen = true;
  let pageVisible = !document.hidden;

  const sync = () => {
    if (onScreen && pageVisible) loop.play();
    else loop.pause();
  };

  if (REDUCED_MOTION) {
    step(0, false); // one static frame, no animation
  } else {
    observeVisibility(
      hero,
      () => {
        onScreen = true;
        sync();
      },
      () => {
        onScreen = false;
        sync();
      }
    );
    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      sync();
    });
    sync();
  }

  // Resize ---------------------------------------------------------------
  const onResize = debounce(() => {
    width = window.innerWidth;
    height = window.innerHeight;
    aspect = width / height;
    camera.left = -aspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    // Keep nodes inside the new horizontal range.
    for (const n of nodes) {
      if (n.x > aspect) n.x = aspect;
      else if (n.x < -aspect) n.x = -aspect;
    }
    if (REDUCED_MOTION || !loop.running) step(0, false);
  });
  window.addEventListener("resize", onResize);

  return { loop };
}
