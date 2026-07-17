// Gallery halftone — a print/newsprint dot-screen over the vector-art gallery.
// At rest each piece renders as a monochrome halftone; on hover it resolves to full
// colour. Progressive enhancement: without WebGL (or under reduced-motion) the existing
// CSS grayscale->colour hover is left untouched.
//
// Performance: ONE shared WebGL context renders off-screen and its output is copied into
// a lightweight 2D <canvas> inside each figure. Only the hovered item animates (its own
// short rAF), so idle cost is zero and we never spin up eight live GL contexts.

import * as THREE from "three";
import { COLORS, REDUCED_MOTION, dpr, supportsWebGL, debounce } from "./util.js";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uProgress;
  uniform float uCell;
  uniform vec3 uPaper;
  uniform vec3 uInk;

  void main() {
    vec4 tex = texture2D(uTex, vUv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

    // Rotated grid for a classic newsprint dot pattern.
    float s = 0.38268343; // sin(22.5deg)
    float c = 0.92387953; // cos(22.5deg)
    mat2 rot = mat2(c, -s, s, c);
    vec2 p = rot * gl_FragCoord.xy;
    vec2 cell = fract(p / uCell) - 0.5;
    float d = length(cell) * 1.41421356;
    float radius = sqrt(clamp(1.0 - lum, 0.0, 1.0));
    float dotMask = smoothstep(radius, radius - 0.15, d);

    vec3 halftone = mix(uPaper, uInk, dotMask);
    vec3 color = mix(halftone, tex.rgb, uProgress);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function initGalleryHalftone(items) {
  if (REDUCED_MOTION || !supportsWebGL() || !items.length) return null;

  const pr = dpr();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(pr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  const paper = new THREE.Color(COLORS.paper);
  const ink = new THREE.Color(COLORS.ink);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTex: { value: null },
      uProgress: { value: 0 },
      uCell: { value: 6.0 * pr },
      uPaper: { value: new THREE.Vector3(paper.r, paper.g, paper.b) },
      uInk: { value: new THREE.Vector3(ink.r, ink.g, ink.b) },
    },
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const loader = new THREE.TextureLoader();
  const records = [];

  const draw = (rec, progress) => {
    rec.progress = progress;
    material.uniforms.uTex.value = rec.texture;
    material.uniforms.uProgress.value = progress;
    renderer.setSize(rec.w, rec.h, false);
    renderer.render(scene, camera);
    rec.ctx.drawImage(renderer.domElement, 0, 0, rec.still.width, rec.still.height);
  };

  const animateHover = (rec) => {
    const tick = () => {
      const diff = rec.target - rec.progress;
      if (Math.abs(diff) < 0.004) {
        draw(rec, rec.target);
        rec.raf = null;
        return;
      }
      draw(rec, rec.progress + diff * 0.14);
      rec.raf = requestAnimationFrame(tick);
    };
    if (!rec.raf) rec.raf = requestAnimationFrame(tick);
  };

  const prepare = (item) => {
    const figure = item.querySelector("figure");
    const img = item.querySelector("img");
    if (!figure || !img) return;

    if (!img.complete || img.naturalWidth === 0) {
      img.addEventListener("load", () => prepare(item), { once: true });
      return;
    }

    const w = Math.round(figure.clientWidth);
    const h = Math.round(figure.clientHeight);
    if (w < 2 || h < 2) return;

    loader.load(img.currentSrc || img.src, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;

      const still = document.createElement("canvas");
      still.className = "halftone-still";
      still.width = Math.max(1, Math.round(w * pr));
      still.height = Math.max(1, Math.round(h * pr));
      figure.appendChild(still);
      item.classList.add("halftone-ready");

      const rec = {
        item,
        figure,
        img,
        still,
        ctx: still.getContext("2d"),
        texture,
        w,
        h,
        progress: 0,
        target: 0,
        raf: null,
      };
      records.push(rec);
      draw(rec, 0);

      item.addEventListener("mouseenter", () => {
        rec.target = 1;
        animateHover(rec);
      });
      item.addEventListener("mouseleave", () => {
        rec.target = 0;
        animateHover(rec);
      });
    });
  };

  // Prepare each item just before it scrolls into view.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          io.unobserve(entry.target);
          prepare(entry.target);
        }
      });
    },
    { rootMargin: "200px" }
  );
  items.forEach((item) => io.observe(item));

  // Re-render stills at the new size when the layout changes.
  const onResize = debounce(() => {
    for (const rec of records) {
      const w = Math.round(rec.figure.clientWidth);
      const h = Math.round(rec.figure.clientHeight);
      if (w < 2 || h < 2) continue;
      rec.w = w;
      rec.h = h;
      rec.still.width = Math.max(1, Math.round(w * pr));
      rec.still.height = Math.max(1, Math.round(h * pr));
      draw(rec, rec.progress);
    }
  }, 200);
  window.addEventListener("resize", onResize);

  return { records };
}
