// Stand-alone model of the wash-hand vanity (nothing to do with the house data): sage painted console on legs,
// two raised-panel drawers with oak knobs, slatted lower shelf, walnut top, boat-shaped light-blue glass vessel, bronze faucet, frameless mirror.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const W = 110, D = 40, H = 82;                      // cm: width (x), depth (z), height of the top surface (y)
const SAGE = 0x7fc5c3, OAK = 0xc8a46a;

function woodTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${40 + Math.random() * 40},${20 + Math.random() * 20},10,${0.15 + Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); g.bezierCurveTo(150, y + (Math.random() - .5) * 14, 350, y + (Math.random() - .5) * 14, 512, y + (Math.random() - .5) * 10); g.stroke(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(i * 85, 0, 2, 128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// a box with softly rounded edges (extrude of a rounded rectangle with bevel)
function rbox(w, h, d, r, mat) {
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const bev = Math.min(0.25, d / 4);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * bev) / 2);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const place = (m, x, y, z) => { m.position.set(x, y, z); return m; };

export function buildVanity(bowlColor = 0x35a2e0) {
  const root = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: SAGE, roughness: 0.55 });
  const paintL = new THREE.MeshStandardMaterial({ color: 0x96d1cf, roughness: 0.55 });
  const oak = new THREE.MeshStandardMaterial({ color: OAK, roughness: 0.6 });
  const wt = woodTexture(); wt.wrapS = THREE.RepeatWrapping;
  const walnut = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.5 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3b2a1f, metalness: 0.95, roughness: 0.3 });
  const bronzeBand = new THREE.MeshStandardMaterial({ color: 0xb8793a, metalness: 0.95, roughness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: bowlColor, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.82, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });

  const top = H - 4;                                             // underside of the walnut top
  // legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(place(rbox(5, top, 5, 0.4, paint), sx * (W / 2 - 3.6), top / 2, sz * (D / 2 - 3.6)));
  // drawer case under the top (front rail zone) + back/side aprons
  const caseH = 17, caseY = top - caseH / 2;
  root.add(place(rbox(W - 12, caseH, D - 8, 0.3, paint), 0, caseY, 0));
  // drawer fronts with raised panels and oak knobs
  const dw = (W - 12 - 3) / 2 - 1, dh = caseH - 3;
  for (const sx of [-1, 1]) {
    const x = sx * (dw / 2 + 0.8), z = D / 2 - 3.8 + 1.2;
    root.add(place(rbox(dw, dh, 1.6, 0.3, paint), x, caseY, z));
    root.add(place(rbox(dw - 4, dh - 4, 0.8, 0.25, paintL), x, caseY, z + 1));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), oak); knob.position.set(x, caseY, z + 2.6); knob.castShadow = true; root.add(knob);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 10), oak); stem.rotation.x = Math.PI / 2; stem.position.set(x, caseY, z + 1.8); root.add(stem);
  }
  // lower rails + slatted shelf
  const shelfY = 13;
  root.add(place(rbox(W - 12, 6, 2.2, 0.3, paint), 0, shelfY - 1.5, D / 2 - 3.6)); root.add(place(rbox(W - 12, 6, 2.2, 0.3, paint), 0, shelfY - 1.5, -(D / 2 - 3.6)));
  for (const sx of [-1, 1]) root.add(place(rbox(2.2, 6, D - 8, 0.3, paint), sx * (W / 2 - 3.6), shelfY - 1.5, 0));
  const n = 15, slotW = (W - 14) / n;
  for (let i = 0; i < n; i++) root.add(place(rbox(slotW * 0.62, 1.6, D - 9, 0.2, paint), -(W - 14) / 2 + slotW * (i + 0.5), shelfY + 0.3, 0));
  // walnut top with a small overhang
  const topSlab = rbox(W + 4, 3.6, D + 3, 0.5, walnut); topSlab.position.set(0, H - 1.8, 1); root.add(topSlab);

  // vessel bowl: elongated boat shape, ends swept up like the photo (lathe stretched along x, then bent)
  const prof = [[0, 0], [3, 0.1], [7, 0.9], [11, 2.6], [14.5, 5.4], [16, 8.5], [16.3, 11.2], [15.6, 12.6], [15.2, 12.2], [15.7, 11], [15.4, 8.8], [13.7, 6], [10.2, 3.3], [6, 1.5], [2.6, 0.9], [0, 0.9]].map(([r, y]) => new THREE.Vector2(r, y));
  const bg = new THREE.LatheGeometry(prof, 72); const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i) * 1.55, y = bp.getY(i), z = bp.getZ(i) * 0.92;
    const u = x / 25;                                              // -1..1 along the bowl
    y += 3.2 * Math.pow(Math.abs(u), 2.6) * (0.4 + y / 14) + (u > 0 ? 1.2 * u : 0);  // ends rise, right end a little higher
    bp.setXYZ(i, x, y, z);
  }
  bg.computeVertexNormals();
  const bowl = new THREE.Mesh(bg, glass); bowl.position.set(0, H + 0.2, 6); bowl.castShadow = true; root.add(bowl);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })); drain.position.set(0, H + 1.4, 6); root.add(drain);

  // bronze pillar faucet like the photo: bulbous banded column, swan-neck spout, lever on top
  const fx = 30, fz = -4, fy = H;
  const colProf = [[0, 0], [3.4, 0], [3.4, 1.3], [2.3, 1.8], [2.0, 3.5], [2.7, 6], [3.1, 8.5], [2.6, 11], [2.0, 13], [2.0, 15], [2.8, 17.5], [2.9, 19.5], [2.1, 21.5], [1.8, 24], [0, 24.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const col = new THREE.Mesh(new THREE.LatheGeometry(colProf, 36), bronze); col.position.set(fx, fy, fz); col.castShadow = true; root.add(col);
  for (const yy of [3.2, 12.4, 21.2]) { const b = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.3, 10, 28), bronzeBand); b.rotation.x = Math.PI / 2; b.position.set(fx, fy + yy, fz); root.add(b); }
  const curve = new THREE.CatmullRomCurve3([[fx, fy + 17.5, fz], [fx - 3.5, fy + 18.2, fz + 0.3], [fx - 8, fy + 20, fz + 1.4], [fx - 12, fy + 19.5, fz + 3], [fx - 14, fy + 16.5, fz + 4], [fx - 14.4, fy + 13.5, fz + 4.2]].map((p) => new THREE.Vector3(...p)));
  const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 1.3, 14), bronze); neck.castShadow = true; root.add(neck);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 2.2, 18), bronze); lip.position.set(fx - 14.4, fy + 13, fz + 4.2); root.add(lip);
  const lipBand = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 8, 20), bronzeBand); lipBand.rotation.x = Math.PI / 2; lipBand.position.set(fx - 14.4, fy + 13.9, fz + 4.2); root.add(lipBand);
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 11, 14), bronze); lever.rotation.z = -1.1; lever.position.set(fx + 4.2, fy + 27.2, fz); root.add(lever);
  const leverTip = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), bronze); leverTip.position.set(fx + 9.4, fy + 29.4, fz); root.add(leverTip);
  return root;
}


// tall mirror in a flat frame of weathered reclaimed boards (silvery-brown, cracks, knots, nail holes)
function weathered(vertical) {
  const L = 1024, S = 256, c = document.createElement('canvas'); c.width = vertical ? S : L; c.height = vertical ? L : S; const g = c.getContext('2d');
  g.fillStyle = '#85715b'; g.fillRect(0, 0, c.width, c.height);
  const P = (u, v) => (vertical ? [v, u] : [u, v]);                           // u along the board, v across it
  for (let i = 0; i < 40; i++) { const v = Math.random() * S, u = Math.random() * L, w = 80 + Math.random() * 380; g.fillStyle = 'rgba(' + (150 + Math.random() * 40) + ',' + (130 + Math.random() * 30) + ',' + (105 + Math.random() * 25) + ',0.22)'; const [x, y] = P(u, v), [x2, y2] = P(w, 6 + Math.random() * 40); g.fillRect(x, y, x2, y2); }
  for (let i = 0; i < 230; i++) { const v = Math.random() * S, u0 = Math.random() * L, len = 60 + Math.random() * 360; g.strokeStyle = 'rgba(' + (45 + Math.random() * 45) + ',' + (34 + Math.random() * 30) + ',24,' + (0.18 + Math.random() * 0.5) + ')'; g.lineWidth = 0.5 + Math.random() * 1.8; g.beginPath(); let [x, y] = P(u0, v); g.moveTo(x, y); for (let k = 1; k <= 4; k++) { [x, y] = P(u0 + (len * k) / 4, v + (Math.random() - 0.5) * 7); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 5; i++) { const [x, y] = P(Math.random() * L, 30 + Math.random() * (S - 60)); const r = g.createRadialGradient(x, y, 1, x, y, 14 + Math.random() * 12); r.addColorStop(0, 'rgba(25,17,10,0.9)'); r.addColorStop(1, 'rgba(25,17,10,0)'); g.fillStyle = r; g.fillRect(x - 30, y - 30, 60, 60); }
  for (let i = 0; i < 400; i++) { const [x, y] = P(Math.random() * L, Math.random() * S); g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '20,14,8' : '200,185,160') + ',' + Math.random() * 0.16 + ')'; g.fillRect(x, y, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let rs = 11; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647 - 0.5;
function board(w, h, d, mat) {                                                // flat board, edges very slightly uneven
  const g = new THREE.BoxGeometry(w, h, d, 6, 6, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) + rr() * 0.25); p.setY(i, p.getY(i) + rr() * 0.25 + Math.sin(p.getX(i) * 0.12) * 0.12); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
export function buildMirror() {
  const grp = new THREE.Group();
  const mh = new THREE.MeshStandardMaterial({ map: weathered(false), roughness: 0.92 }), mv = new THREE.MeshStandardMaterial({ map: weathered(true), roughness: 0.92 });
  const W2 = 100, Hh = 64, bt = 8.5, bs = 7, d = 3.6, cy = 165;               // overall width / height, board sizes (cm)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W2 - 2 * bs + 1, Hh - 2 * bt + 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xcfdadd, metalness: 0.35, roughness: 0.05 })); glass.position.set(0, cy, -0.8); grp.add(glass);
  const T = board(W2, bt, d, mh); T.position.set(0, cy + Hh / 2 - bt / 2, 0); grp.add(T);
  const B = board(W2, bt + 0.8, d, mh); B.position.set(0, cy - Hh / 2 + (bt + 0.8) / 2, 0); grp.add(B);
  const L = board(bs, Hh - 2 * bt, d, mv); L.position.set(-(W2 / 2 - bs / 2), cy, 0); grp.add(L);
  const R = board(bs + 0.5, Hh - 2 * bt, d + 0.2, mv); R.position.set(W2 / 2 - (bs + 0.5) / 2, cy, 0); grp.add(R);
  return grp;
}

export function buildScene(view) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e5df);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(300, 260), new THREE.MeshStandardMaterial({ color: 0xdcd8d1, roughness: 0.9 })); wall.position.set(0, 130, -D / 2 - 1); wall.receiveShadow = true; scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: 0xcdbfa8, roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 40); floor.receiveShadow = true; scene.add(floor);
  const mirror = buildMirror(); mirror.position.z = -D / 2 + 3; scene.add(mirror);
  const v = buildVanity(); v.position.z = 0; scene.add(v);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(60, 190, 130); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -90, right: 90, top: 150, bottom: -20, near: 10, far: 500 }); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcdbfa8, 0.6));
  const cam = new THREE.PerspectiveCamera(32, 4 / 3, 1, 1000);
  if (view === 'front') { cam.position.set(0, 128, 430); cam.lookAt(0, 122, 0); } else if (view === 'top') { cam.position.set(0, 230, 120); cam.lookAt(0, 70, 0); } else { cam.position.set(150, 140, 360); cam.lookAt(0, 112, 0); }
  return { scene, cam };
}

export function render(view) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1200, 900); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.7; r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
  const { scene, cam } = buildScene(view);
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  r.render(scene, cam); document.title = 'ready';
}
render((location.hash || '#3q').slice(1));
