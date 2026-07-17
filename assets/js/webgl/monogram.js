// Monogram — an interactive extruded "NR" that signs off the footer.
// Solid ink faces with a thin orange wireframe (mono block + one accent line — the same
// hairline-and-single-accent language as the rest of the site). It leans toward the
// cursor and drifts gently; under reduced-motion it renders one still pose.

import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { COLORS, REDUCED_MOTION, dpr, createLoop, observeVisibility } from "./util.js";

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json";

export function initMonogram(mount) {
  const pr = dpr();
  let w = mount.clientWidth || 150;
  let h = mount.clientHeight || 150;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(w, h);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  camera.position.set(0, 0, 6);

  const group = new THREE.Group();
  scene.add(group);

  let pointerX = 0;
  let pointerY = 0;
  const onMove = (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  const render = () => renderer.render(scene, camera);

  const loop = createLoop((elapsed) => {
    const targetY = pointerX * 0.7 + Math.sin(elapsed * 0.3) * 0.25;
    const targetX = pointerY * 0.45;
    group.rotation.y += (targetY - group.rotation.y) * 0.06;
    group.rotation.x += (targetX - group.rotation.x) * 0.06;
    render();
  });

  let onScreen = true;
  let pageVisible = !document.hidden;
  let ready = false;
  const sync = () => {
    if (ready && !REDUCED_MOTION && onScreen && pageVisible) loop.play();
    else loop.pause();
  };

  new FontLoader().load(
    FONT_URL,
    (font) => {
      const geo = new TextGeometry("NR", {
        font,
        size: 1.7,
        depth: 0.55,
        height: 0.55, // older three uses `height` for extrusion depth
        curveSegments: 5,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 1,
      });
      geo.center();

      const faces = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: COLORS.ink })
      );
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 22),
        new THREE.LineBasicMaterial({ color: COLORS.accent })
      );
      group.add(faces, edges);

      ready = true;
      if (REDUCED_MOTION) {
        group.rotation.set(-0.12, -0.5, 0);
        render();
      } else {
        window.addEventListener("mousemove", onMove, { passive: true });
        observeVisibility(
          mount,
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
    },
    undefined,
    () => {
      // Font failed to load — leave the footer clean.
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }
  );

  window.addEventListener("resize", () => {
    w = mount.clientWidth || w;
    h = mount.clientHeight || h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (ready && (REDUCED_MOTION || !loop.running)) render();
  });

  return { loop };
}
