// Shared helpers for the WebGL enhancements.
// Everything here is framework-free and safe to import from any effect module.

export const REDUCED_MOTION = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Site design tokens (kept in sync with :root in main.css).
export const COLORS = {
  paper: 0xf4f1ea,
  ink: 0x111111,
  accent: 0xff5500,
};

// Cheap, side-effect-free WebGL capability probe.
export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

// Cap device pixel ratio so heavy scenes stay cheap on retina displays.
export function dpr() {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

// Fire onEnter/onLeave as an element scrolls in and out of view.
export function observeVisibility(el, onEnter, onLeave, options = {}) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) onEnter && onEnter(entry);
      else onLeave && onLeave(entry);
    });
  }, options);
  io.observe(el);
  return io;
}

// Small render-loop manager that a scene can start/stop freely.
// The tick callback receives the elapsed seconds since the loop was created.
export function createLoop(tick) {
  let running = false;
  let id = null;
  const start = performance.now();
  const frame = (now) => {
    if (!running) return;
    tick((now - start) / 1000);
    id = requestAnimationFrame(frame);
  };
  return {
    play() {
      if (running) return;
      running = true;
      id = requestAnimationFrame(frame);
    },
    pause() {
      running = false;
      if (id) cancelAnimationFrame(id);
      id = null;
    },
    get running() {
      return running;
    },
  };
}

// Debounce helper for resize handlers.
export function debounce(fn, wait = 150) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
