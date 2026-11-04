// Stand-alone model of the L sofa (chaise on the left, as in the reference photo): light-turquoise woven fabric, slim square arms,
// three loose back cushions, two seat cushions + chaise cushion, tapered dark-wood legs. Not connected to the house data.
import * as THREE from 'three';
import linenDiff from './tex/rough_linen_diff.jpg';
import linenNor from './tex/rough_linen_nor.jpg';
import jerseyDiff from './tex/jersey_melange_diff.jpg';
import jerseyNor from './tex/jersey_melange_nor.jpg';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// real photographed fabric (Poly Haven, CC0): diffuse + normal map, ~27 cm per tile
async function fabricMaps(variant) {
  const [d, n] = variant === 'jersey' ? [jerseyDiff, jerseyNor] : [linenDiff, linenNor], L = new THREE.TextureLoader();
  const [map, normal] = await Promise.all([L.loadAsync(d), L.loadAsync(n)]);
  for (const x of [map, normal]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(1 / 27, 1 / 27); x.anisotropy = 8; x.needsUpdate = true; }
  map.colorSpace = THREE.SRGBColorSpace; return { map, normal };
}
function fabricMat(color, maps) {                                              // matte cloth: no gloss, faint fuzzy edge sheen
  return new THREE.MeshPhysicalMaterial({ color, map: maps.map, normalMap: maps.normal, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 1, metalness: 0, sheen: 0.25, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xcfeaf0), envMapIntensity: 0.08 });
}
// cushion / block with soft rounded edges (rounded-rect extrude with a generous bevel)
function soft(w, h, d, r, mat, puffTop = 0, puffFront = 0) {
  const rr = Math.min(r, w / 2 - 0.1, h / 2 - 0.1), s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + rr, y); s.lineTo(x + w - rr, y); s.quadraticCurveTo(x + w, y, x + w, y + rr); s.lineTo(x + w, y + h - rr); s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const bev = Math.min(2.2, d / 3);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -(d - 2 * bev) / 2);
  if (puffTop || puffFront) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const nx = p.getX(i) / (w / 2), nz = p.getZ(i) / (d / 2), ny = p.getY(i) / (h / 2);
      if (puffTop && p.getY(i) > h * 0.2) p.setY(i, p.getY(i) + puffTop * Math.max(0, 1 - nx * nx) * Math.max(0, 1 - nz * nz));
      if (puffFront && p.getZ(i) > 0) p.setZ(i, p.getZ(i) + puffFront * Math.max(0, 1 - nx * nx) * Math.max(0, 1 - ny * ny));
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export function buildSofa(maps) {
  const root = new THREE.Group();
    const fab = fabricMat(0xb4ffe6, maps), fabD = fabricMat(0x9ee0cd, maps);
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a281f, roughness: 0.5 });
  const BZ = -47, FZ = 48, CF = 112;                       // back / front of the main body, front of the chaise (z)
  // legs (tapered, splayed slightly): 6 pieces
  for (const [lx, lz] of [[-142, BZ + 8], [-142, CF - 8], [-52, CF - 8], [-52, BZ + 8], [60, BZ + 8], [142, BZ + 8], [60, FZ - 8], [142, FZ - 8]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.5, 16, 16), wood); leg.position.set(lx, 8, lz); leg.rotation.z = lx < 0 ? 0.08 : -0.08; leg.castShadow = true; root.add(leg);
  }
  // base frame: main body + chaise
  root.add(at(soft(300, 14, FZ - BZ, 1.6, fabD), 0, 23, (BZ + FZ) / 2));
  root.add(at(soft(98, 14, CF - FZ, 1.6, fabD), -101, 23, (FZ + CF) / 2 - 0.5));
  // arms (slim, square), only at the two outer ends of the back section
  root.add(at(soft(11, 38, FZ - BZ, 2.2, fab), -144.5, 49, (BZ + FZ) / 2));
  root.add(at(soft(11, 38, FZ - BZ, 2.2, fab), 144.5, 49, (BZ + FZ) / 2));
  // back frame
  root.add(at(soft(278, 34, 12, 2, fabD), 0, 47, BZ + 6));
  // seat cushions: chaise + two seats
  root.add(at(soft(90, 15, CF - BZ - 14, 3, fab, 5), -95, 37.5, (BZ + 14 + CF) / 2 + 0.5));
  root.add(at(soft(91, 15, FZ - BZ - 14, 3, fab, 5), 2, 37.5, (BZ + 14 + FZ) / 2 + 0.5));
  root.add(at(soft(91, 15, FZ - BZ - 14, 3, fab, 5), 94, 37.5, (BZ + 14 + FZ) / 2 + 0.5));
  // back cushions, leaning back a little
  for (const bx of [-95, 2, 94]) { const b = soft(90, 42, 22, 6, fab, 0, 6); b.position.set(bx, 66, BZ + 22); b.rotation.x = -0.13; root.add(b); }
  root.scale.x = -1;                                          // chaise on the right
  return root;
}

export async function render(view, variant) {
  const maps = await fabricMaps(variant);
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1200, 800); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8; r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeeece8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), new THREE.MeshStandardMaterial({ color: 0xe2ded6, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(900, 400), new THREE.MeshStandardMaterial({ color: 0xf1efeb, roughness: 0.95 })); wall.position.set(0, 200, -75); wall.receiveShadow = true; scene.add(wall);
  scene.add(buildSofa(maps));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(120, 260, 220); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -100, near: 10, far: 900 }); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdcd6cc, 0.6));
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(30, 1200 / 800, 1, 3000);
  if (view === 'front') { cam.position.set(0, 80, 640); cam.lookAt(0, 48, 20); } else if (view === 'side') { cam.position.set(-420, 90, 330); cam.lookAt(-30, 45, 20); } else { cam.position.set(320, 150, 500); cam.lookAt(-10, 45, 20); }
  r.render(scene, cam); document.title = 'ready';
}
{ const [v, p] = (location.hash || '#3q:linen').slice(1).split(':'); render(v, p); }
