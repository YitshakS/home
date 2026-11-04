// Stand-alone model, sofa 2 (reference: deep-teal velvet three-seater with a wrap-around shell back, plump rounded cushions, slim brass legs).
// Throw pillows are chosen to suit the house: mint patterned satin, a dark lumbar pillow and two dark-teal corner pillows with cream piping.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function velvetNormal() {                                               // very fine pile: soft noise used as a bump map
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) { const v = 100 + Math.random() * 56; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.08, 0.08); return t;
}
function spots() {                                                      // mint satin with leopard-like spots
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#9fe0d2'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 6 + Math.random() * 14; g.save(); g.translate(x, y); g.rotate(Math.random() * 3); g.scale(1, 0.6 + Math.random() * 0.4); g.fillStyle = 'rgba(40,120,120,0.85)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = 'rgba(150,225,212,0.9)'; g.beginPath(); g.arc(0, 0, r * 0.5, 0, 7); g.fill(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// rounded block: rounded-rectangle profile (w x h) extruded by d with a generous bevel; optional puff bulges the big faces
function soft(w, h, d, r, mat, puffTop = 0, puffFront = 0) {
  const rr = Math.min(r, w / 2 - 0.1, h / 2 - 0.1), s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + rr, y); s.lineTo(x + w - rr, y); s.quadraticCurveTo(x + w, y, x + w, y + rr); s.lineTo(x + w, y + h - rr); s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h); s.quadraticCurveTo(x, y + h, x, y + h - rr); s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const bev = Math.min(3.2, d / 3.2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 6, curveSegments: 10 });
  g.translate(0, 0, -(d - 2 * bev) / 2);
  if (puffTop || puffFront) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const nx = p.getX(i) / (w / 2), nz = p.getZ(i) / (d / 2), ny = p.getY(i) / (h / 2);
      if (puffTop && p.getY(i) > h * 0.2) p.setY(i, p.getY(i) + puffTop * Math.max(0, 1 - nx * nx) * Math.max(0, 1 - nz * nz));
      if (puffFront && p.getZ(i) > 0) p.setZ(i, p.getZ(i) + puffFront * Math.max(0, 1 - nx * nx) * Math.max(0, 1 - ny * ny));
    }
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// throw pillow: a squarish pillow (flattened superellipsoid, so the corners pinch like a stuffed pillow), planar UVs for the pattern, optional cream piping
function pillowGeo(w, h, th) {
  const g = new THREE.SphereGeometry(1, 48, 36), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.62), sy = Math.sign(y) * Math.pow(Math.abs(y), 0.62);
    const e = Math.max(0, 1 - 0.55 * Math.abs(sx) * Math.abs(sy));         // thinner towards the corners
    p.setXYZ(i, sx * w / 2, sy * h / 2, z * th * e);
    uv.setXY(i, sx / 2 + 0.5, sy / 2 + 0.5);
  }
  g.computeVertexNormals(); return g;
}
function pillow(w, h, mat, piping) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(pillowGeo(w, h, 6.5), mat); m.castShadow = m.receiveShadow = true; g.add(m);
  if (piping) { const pm = new THREE.Mesh(pillowGeo(w + 2.2, h + 2.2, 3.2), new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.8 })); pm.position.z = -1.4; g.add(pm); }
  return g;
}

export function buildSofa2() {
  const root = new THREE.Group();
  const bump = velvetNormal();
  const velvet = (c) => new THREE.MeshPhysicalMaterial({ color: c, bumpMap: bump, bumpScale: 0.6, roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x6fb4c2), envMapIntensity: 0.08 });
  const vel = velvet(0x174a5d), velD = velvet(0x113c4b);
  const brass = new THREE.MeshStandardMaterial({ color: 0xd9bb7a, metalness: 0.85, roughness: 0.3 });
  const W = 250, BZ = -46, FZ = 46;                                    // width, back and front z of the body
  // slim brass legs
  for (const [lx, lz] of [[-W / 2 + 14, BZ + 14], [W / 2 - 14, BZ + 14], [-W / 2 + 14, FZ - 14], [W / 2 - 14, FZ - 14]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 16, 14), brass); l.position.set(lx, 8, lz); l.castShadow = true; root.add(l); }
  // low rounded base frame
  root.add(at(soft(W, 16, FZ - BZ, 7, velD), 0, 24, (BZ + FZ) / 2));
  // wrap-around shell: back + two curved side walls, rounded and slightly tapered at the top
  root.add(at(soft(W, 60, 15, 9, vel), 0, 62, BZ + 7.5));
  for (const sx of [-1, 1]) { const arm = soft(17, 56, FZ - BZ - 4, 8, vel); arm.position.set(sx * (W / 2 - 8.5), 60, (BZ + FZ) / 2 - 2); arm.rotation.z = sx * 0.04; root.add(arm); }
  // three plump seat cushions and three back cushions
  const cw = (W - 2 * 17 - 2) / 3;
  for (let k = 0; k < 3; k++) {
    const cx = -(W - 34) / 2 + cw / 2 + k * (cw + 1);
    root.add(at(soft(cw, 22, FZ - BZ - 22, 10, vel, 7), cx, 42, (BZ + 14 + FZ) / 2 + 3));
    const bk = soft(cw, 46, 22, 11, vel, 0, 8); bk.position.set(cx, 76, BZ + 27); bk.rotation.x = -0.12; root.add(bk);
  }
  // throw pillows (leaning on the back cushions)
  const satin = new THREE.MeshPhysicalMaterial({ map: spots(), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xbdeee3), envMapIntensity: 0.15 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.45, metalness: 0.05 });
  const dark = velvet(0x153f4e);
  const mint = (x, rz) => { const p = pillow(45, 45, satin, false); p.position.set(x, 78, BZ + 50); p.rotation.set(-0.18, 0, rz); root.add(p); };
  mint(-W / 2 + 62, 0.15); mint(W / 2 - 62, -0.15);
  const lumbar = pillow(48, 28, leather, false); lumbar.position.set(0, 66, BZ + 49); lumbar.rotation.x = -0.18; root.add(lumbar);
  for (const sx of [-1, 1]) { const c = pillow(50, 50, dark, true); c.position.set(sx * (W / 2 - 34), 80, BZ + 44); c.rotation.set(-0.15, -sx * 0.5, sx * 0.12); root.add(c); }
  return root;
}

export function render(view) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(1200, 800); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.8; r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeeece8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), new THREE.MeshStandardMaterial({ color: 0xe2ded6, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(900, 400), new THREE.MeshStandardMaterial({ color: 0xf1efeb, roughness: 0.95 })); wall.position.set(0, 200, -75); wall.receiveShadow = true; scene.add(wall);
  scene.add(buildSofa2());
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(120, 260, 220); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -100, near: 10, far: 900 }); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdcd6cc, 0.7));
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(30, 1200 / 800, 1, 3000);
  if (view === 'front') { cam.position.set(0, 85, 560); cam.lookAt(0, 52, 0); } else { cam.position.set(260, 150, 430); cam.lookAt(0, 48, 0); }
  r.render(scene, cam); document.title = 'ready';
}
render((location.hash || '#3q').slice(1));
