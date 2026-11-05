// Stand-alone model of the wash-hand vanity (nothing to do with the house data): sage painted console on legs,
// two raised-panel drawers with antique-bronze knobs, slatted lower shelf, honey-oak top, boat-shaped marbled-blue glass vessel, bronze faucet,
// mirror (a real reflection) in a frame of reclaimed boards.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

export const W = 110, D = 40, H = 82;                      // cm: width (x), depth (z), height of the top surface (y)
const SAGE = 0x8fbfa6, HANDLE = 0x8a6a3c;                      // sage-green paint, antique bronze handles

function woodTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#c4924a'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${120 + Math.random() * 40},${75 + Math.random() * 25},${25 + Math.random() * 15},${0.12 + Math.random() * 0.22})`; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); g.bezierCurveTo(150, y + (Math.random() - .5) * 14, 350, y + (Math.random() - .5) * 14, 512, y + (Math.random() - .5) * 10); g.stroke(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(i * 85, 0, 2, 128); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// marbled deep-blue / teal glass like a hand-painted vessel bowl: u runs round the bowl, v along the lathe profile
// (outer wall 0..0.5 a little darker, inside 0.5..1 lighter; soft clouds only, no lines)
function bowlTexture() {
  const Wd = 1024, Hd = 512, c = document.createElement('canvas'); c.width = Wd; c.height = Hd; const g = c.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const row = (v) => (1 - v) * Hd;
  // base: inside a deep blue that gets lighter towards the middle, outside darker
  const base = g.createLinearGradient(0, row(1), 0, row(0));
  base.addColorStop(0, '#2b9fd0'); base.addColorStop(0.18, '#0f6fa6'); base.addColorStop(0.4, '#0b5a92'); base.addColorStop(0.5, '#0c5f96');
  base.addColorStop(0.62, '#0c5f96'); base.addColorStop(1, '#1d86bd');
  g.fillStyle = base; g.fillRect(0, 0, Wd, Hd);
  // soft clouds (drawn twice so that they wrap round the seam)
  const cloud = (x, y, r, col) => { for (const dx of [-Wd, 0, Wd]) { const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y - r, 2 * r, 2 * r); } };
  const cols = ['rgba(20,150,190,0.55)', 'rgba(70,200,220,0.40)', 'rgba(10,60,110,0.55)', 'rgba(150,225,240,0.28)', 'rgba(2,25,60,0.45)'];
  for (let i = 0; i < 90; i++) cloud(rnd() * Wd, row(0.5 + rnd() * 0.5), 25 + rnd() * 70, cols[Math.floor(rnd() * cols.length)]);
  for (let i = 0; i < 60; i++) cloud(rnd() * Wd, row(rnd() * 0.5), 30 + rnd() * 60, i % 2 ? 'rgba(10,80,130,0.45)' : 'rgba(5,45,85,0.45)');
  // fine speckle in the inside
  for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,' + rnd() * 0.5 + ')'; const r = 0.5 + rnd() * 1.6; g.fillRect(rnd() * Wd, row(0.5 + rnd() * 0.49), r, r); }
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(0,20,45,' + rnd() * 0.5 + ')'; const r = 1 + rnd() * 3; g.fillRect(rnd() * Wd, row(0.5 + rnd() * 0.49), r, r); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

// painted wood: faint vertical grain and a few scuffs, so that the paint does not look like smooth plastic (multiplies the paint colour)
function paintTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, S, S);
  let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 170; i++) { const x = r() * S, w = 0.6 + r() * 2.2, v = Math.round(222 + r() * 30); g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.2 + r() * 0.35) + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, S * 0.3, x + (r() - 0.5) * 8, S * 0.7, x + (r() - 0.5) * 4, S); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(120,110,95,' + (0.05 + r() * 0.12) + ')'; g.fillRect(r() * S, r() * S, 1 + r() * 2.5, 3 + r() * 10); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 40, 1 / 40); t.anisotropy = 8; return t;
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

// W, D: width along the wall and depth of the cabinet body (the top slab is a little bigger); the bowl and faucet keep a real size and are only
// made smaller (down to 70 %) on a narrow cabinet
export function buildVanity(W = 110, D = 40) {
  const root = new THREE.Group();
  const pt = paintTexture();
  const paint = new THREE.MeshStandardMaterial({ color: SAGE, map: pt, roughness: 0.88 });
  const paintL = new THREE.MeshStandardMaterial({ color: 0xa6cfba, map: pt, roughness: 0.88 });
  const handle = new THREE.MeshStandardMaterial({ color: HANDLE, metalness: 0.65, roughness: 0.42 });
  const wt = woodTexture(); wt.wrapS = THREE.RepeatWrapping;
  const oakTop = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.62 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x4a3526, metalness: 0.55, roughness: 0.35 });
  const bronzeBand = new THREE.MeshStandardMaterial({ color: 0xb8793a, metalness: 0.55, roughness: 0.35 });
  // see-through glass: the marbling stays, about 60 % opaque, so that the top and the inside of the bowl show through
  const glass = new THREE.MeshPhysicalMaterial({ map: bowlTexture(), roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.6, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide });

  const top = H - 4;                                             // underside of the oak top
  // legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) root.add(place(rbox(5, top, 5, 0.4, paint), sx * (W / 2 - 3.6), top / 2, sz * (D / 2 - 3.6)));
  // drawer case under the top (front rail zone) + back/side aprons
  const caseH = 17, caseY = top - caseH / 2;
  root.add(place(rbox(W - 12, caseH, D - 8, 0.3, paint), 0, caseY, 0));
  // drawer fronts with raised panels and handle knobs
  const dw = (W - 12 - 3) / 2 - 1, dh = caseH - 3;
  for (const sx of [-1, 1]) {
    const x = sx * (dw / 2 + 0.8), z = D / 2 - 3.8 + 1.2;
    root.add(place(rbox(dw, dh, 1.6, 0.3, paint), x, caseY, z));
    root.add(place(rbox(dw - 4, dh - 4, 0.8, 0.25, paintL), x, caseY, z + 1));
    const knob = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), handle); knob.position.set(x, caseY, z + 2.6); knob.castShadow = true; root.add(knob);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 10), handle); stem.rotation.x = Math.PI / 2; stem.position.set(x, caseY, z + 1.8); root.add(stem);
  }
  // lower rails + slatted shelf
  const shelfY = 13;
  root.add(place(rbox(W - 12, 6, 2.2, 0.3, paint), 0, shelfY - 1.5, D / 2 - 3.6)); root.add(place(rbox(W - 12, 6, 2.2, 0.3, paint), 0, shelfY - 1.5, -(D / 2 - 3.6)));
  for (const sx of [-1, 1]) root.add(place(rbox(2.2, 6, D - 8, 0.3, paint), sx * (W / 2 - 3.6), shelfY - 1.5, 0));
  const n = 15, slotW = (W - 14) / n;
  for (let i = 0; i < n; i++) root.add(place(rbox(slotW * 0.62, 1.6, D - 9, 0.2, paint), -(W - 14) / 2 + slotW * (i + 0.5), shelfY + 0.3, 0));
  // honey-oak top with a small overhang
  const topSlab = rbox(W + 4, 3.6, D + 3, 0.5, oakTop); topSlab.position.set(0, H - 1.8, 1); root.add(topSlab);

  // vessel bowl: elongated boat shape, ends swept up like the photo (lathe stretched along x, then bent)
  const prof = [[0, 0], [3, 0.1], [7, 0.9], [11, 2.6], [14.5, 5.4], [16, 8.5], [16.3, 11.2], [15.6, 12.6], [15.2, 12.2], [15.7, 11], [15.4, 8.8], [13.7, 6], [10.2, 3.3], [6, 1.5], [2.6, 0.9], [0, 0.9]].map(([r, y]) => new THREE.Vector2(r, y));
  const bg = new THREE.LatheGeometry(prof, 72);
  bg.rotateY(Math.PI / 2);   // the seam of the lathe goes to the faucet end of the bowl, out of sight
  const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i) * 1.55, y = bp.getY(i), z = bp.getZ(i) * 0.92;
    const u = x / 25;                                              // -1..1 along the bowl
    y += 3.2 * Math.pow(Math.abs(u), 2.6) * (0.4 + y / 14) + (u > 0 ? 1.2 * u * u : 0);  // ends rise, right end a little higher (u*u: no crease across the middle of the bowl)
    bp.setXYZ(i, x, y, z);
  }
  bg.computeVertexNormals();
  // the first and the last column of the lathe lie on the same line: give them the same normals so that no seam shows in the glass
  const segs = 72, nrm = bg.attributes.normal, tmp = new THREE.Vector3();
  for (let j = 0; j < prof.length; j++) {
    const a0 = j, b0 = segs * prof.length + j;
    tmp.set(nrm.getX(a0) + nrm.getX(b0), nrm.getY(a0) + nrm.getY(b0), nrm.getZ(a0) + nrm.getZ(b0)).normalize();
    nrm.setXYZ(a0, tmp.x, tmp.y, tmp.z); nrm.setXYZ(b0, tmp.x, tmp.y, tmp.z);
  }
  const sb = Math.min(1, Math.max(0.7, (W - 18) / 50)), bz = D / 2 - 14;   // bowl scale, bowl z (towards the front)
  const bowl = new THREE.Mesh(bg, glass); bowl.scale.set(sb, 1, sb); bowl.position.set(0, H + 0.2, bz); bowl.castShadow = true; root.add(bowl);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })); drain.position.set(0, H + 1.4, bz); root.add(drain);

  // bronze pillar faucet like the photo: bulbous banded column, swan-neck spout, lever on top
  const fx = Math.min(30, 25 * sb + 5), fz = -D / 2 + 16, fy = H;
  const colProf = [[0, 0], [3.4, 0], [3.4, 1.3], [2.3, 1.8], [2.0, 3.5], [2.7, 6], [3.1, 8.5], [2.6, 11], [2.0, 13], [2.0, 15], [2.8, 17.5], [2.9, 19.5], [2.1, 21.5], [1.8, 24], [0, 24.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const col = new THREE.Mesh(new THREE.LatheGeometry(colProf, 36), bronze); col.position.set(fx, fy, fz); col.castShadow = true; root.add(col);
  for (const yy of [3.2, 12.4, 21.2]) { const b = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.3, 10, 28), bronzeBand); b.rotation.x = Math.PI / 2; b.position.set(fx, fy + yy, fz); root.add(b); }
  const curve = new THREE.CatmullRomCurve3([[fx, fy + 17.5, fz], [fx - 3.5, fy + 18.2, fz + 0.3], [fx - 8, fy + 20, fz + 1.4], [fx - 12, fy + 19.5, fz + 3], [fx - 14, fy + 16.5, fz + 4], [fx - 14.4, fy + 13.5, fz + 4.2]].map((p) => new THREE.Vector3(...p)));
  const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 1.3, 14), bronze); neck.castShadow = true; root.add(neck);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 2.2, 18), bronze); lip.position.set(fx - 14.4, fy + 13, fz + 4.2); root.add(lip);
  const lipBand = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 8, 20), bronzeBand); lipBand.rotation.x = Math.PI / 2; lipBand.position.set(fx - 14.4, fy + 13.9, fz + 4.2); root.add(lipBand);
  const ld = fx + 9.4 + 1.5 > W / 2 + 2 ? -1 : 1;                 // on a narrow cabinet the lever points over the bowl instead of hanging over the edge of the top
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 11, 14), bronze); lever.rotation.z = -1.1 * ld; lever.position.set(fx + 4.2 * ld, fy + 26.2, fz); root.add(lever);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 14), bronze); boss.position.set(fx, fy + 24.6, fz); boss.castShadow = true; root.add(boss);   // pivot knob that joins the lever to the top of the column
  const leverTip = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), bronze); leverTip.position.set(fx + 9.4 * ld, fy + 28.4, fz); root.add(leverTip);
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
function mirrorFilm() {
  const S = 512, c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
  let sd = 9; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.fillStyle = 'rgba(22,48,44,0.24)'; g.fillRect(0, 0, S, S);                                  // overall darkening, a little green
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.28, S / 2, S / 2, S * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,18,16,0.5)'); g.fillStyle = v; g.fillRect(0, 0, S, S);   // dark corners
  const sheen = g.createLinearGradient(0, S * 0.1, S * 0.7, S * 0.9); sheen.addColorStop(0.3, 'rgba(255,255,255,0)'); sheen.addColorStop(0.42, 'rgba(255,255,255,0.10)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)'); sheen.addColorStop(0.58, 'rgba(255,255,255,0.07)'); sheen.addColorStop(0.7, 'rgba(255,255,255,0)'); g.fillStyle = sheen; g.fillRect(0, 0, S, S);   // soft diagonal gleam
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.03 + r() * 0.1) + ')'; const d = 0.6 + r() * 1.8; g.fillRect(r() * S, r() * S, d, d); }   // dust
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(10,20,18,' + (0.05 + r() * 0.12) + ')'; const d = 0.6 + r() * 1.6; g.fillRect(r() * S, r() * S, d, d); }
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(255,255,255,' + (0.03 + r() * 0.05) + ')'; g.lineWidth = 0.6 + r(); g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + 40 + r() * 120, y + (r() - 0.5) * 30); g.stroke(); }   // faint wipe marks
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function buildMirror(width = 110) {
  const grp = new THREE.Group();
  const mh = new THREE.MeshStandardMaterial({ map: weathered(false), roughness: 0.92 }), mv = new THREE.MeshStandardMaterial({ map: weathered(true), roughness: 0.92 });
  const W2 = Math.min(100, width - 6), Hh = 64, bt = 8.5, bs = 7, d = 3.6, cy = 165;               // overall width / height, board sizes (cm)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W2 - 2 * bs + 1, Hh - 2 * bt + 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xcfdadd, metalness: 0.2, roughness: 0.08 })); glass.position.set(0, cy, -0.8); grp.add(glass);
  // a real reflection of the room (the scene is drawn again from the other side of the mirror); shown only when the camera is near and in front of it (see Vanity.build)
  const refl = new Reflector(new THREE.PlaneGeometry(W2 - 2 * bs + 0.6, Hh - 2 * bt + 0.6), { color: 0x808080, textureWidth: 768, textureHeight: 768, clipBias: 0.003 });
  refl.position.set(0, cy, -0.4); grp.add(refl); grp.userData.reflector = refl;
  // a thin film in front of the reflection so that it reads as a mirror and not as a window: slightly darker and greenish, dark corners, dust, a faint streak of light
  const film = new THREE.Mesh(new THREE.PlaneGeometry(W2 - 2 * bs + 0.6, Hh - 2 * bt + 0.6), new THREE.MeshBasicMaterial({ map: mirrorFilm(), transparent: true, depthWrite: false, toneMapped: false }));
  film.position.set(0, cy, -0.3); film.renderOrder = 2; grp.add(film);
  const T = board(W2, bt, d, mh); T.position.set(0, cy + Hh / 2 - bt / 2, 0); grp.add(T);
  const B = board(W2, bt + 0.8, d, mh); B.position.set(0, cy - Hh / 2 + (bt + 0.8) / 2, 0); grp.add(B);
  const L = board(bs, Hh - 2 * bt, d, mv); L.position.set(-(W2 / 2 - bs / 2), cy, 0); grp.add(L);
  const R = board(bs + 0.5, Hh - 2 * bt, d + 0.2, mv); R.position.set(W2 / 2 - (bs + 0.5) / 2, cy, 0); grp.add(R);
  return grp;
}


// Wash-hand vanity with its mirror (sage-green console, honey-oak top, marbled glass vessel sink, bronze faucet, reclaimed-board mirror).
// Local axes: x = along the wall, y = up, z = front; the back (wall side) is at z = -(D/2 + 1). Front faces the angle direction.
export class Vanity extends Item {
  static type = 'vanity';
  static label = 'ארון נטילה עם מראה';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 114, depth: 43, height: 197 };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];
  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }
  clear() { this.offReflect?.(); this.offReflect = null; super.clear(); }
  build() {
    // data.width = length along the wall, data.depth = depth (43 = the original model with its top slab)
    const w = this.data.width || W, d = (this.data.depth || 43) - 3;
    const g = new THREE.Group();
    g.add(buildVanity(w, d));
    const m = buildMirror(w); m.position.z = -d / 2 + 3; g.add(m);
    this.object.add(g);
    // the reflection costs a second drawing of the room: switch it on only when the camera is within 8 m and in front of the mirror
    const refl = m.userData.reflector, cam = this.app.camera, pos = new THREE.Vector3(), nor = new THREE.Vector3(), dir = new THREE.Vector3();
    this.offReflect?.();
    this.offReflect = this.app.onFrame(() => {
      refl.getWorldPosition(pos); nor.set(0, 0, 1).transformDirection(refl.matrixWorld); dir.copy(cam.position).sub(pos);
      refl.visible = dir.length() < 800 && dir.dot(nor) > 0;
    });
  }
}
registry.add(Vanity);
