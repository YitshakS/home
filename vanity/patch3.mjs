import fs from 'node:fs';
let t = fs.readFileSync('vanity/vanity.js', 'utf8');
const a = t.indexOf('// tall mirror in a raw'), b = t.indexOf('export function buildScene');
const code = `// tall mirror in a flat frame of weathered reclaimed boards (silvery-brown, cracks, knots, nail holes)
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
  const W2 = 64, Hh = 100, bt = 9, bs = 6.5, d = 3.6, cy = 176;               // overall width / height, board sizes (cm)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W2 - 2 * bs + 1, Hh - 2 * bt + 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xcfdadd, metalness: 0.35, roughness: 0.05 })); glass.position.set(0, cy, -0.8); grp.add(glass);
  const T = board(W2, bt, d, mh); T.position.set(0, cy + Hh / 2 - bt / 2, 0); grp.add(T);
  const B = board(W2, bt + 0.8, d, mh); B.position.set(0, cy - Hh / 2 + (bt + 0.8) / 2, 0); grp.add(B);
  const L = board(bs, Hh - 2 * bt, d, mv); L.position.set(-(W2 / 2 - bs / 2), cy, 0); grp.add(L);
  const R = board(bs + 0.5, Hh - 2 * bt, d + 0.2, mv); R.position.set(W2 / 2 - (bs + 0.5) / 2, cy, 0); grp.add(R);
  return grp;
}

`;
t = t.slice(0, a) + code + t.slice(b);
fs.writeFileSync('vanity/vanity.js', t);
