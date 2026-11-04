import fs from 'node:fs';
let t = fs.readFileSync('vanity/vanity.js', 'utf8');
const mirrorCode = `
// tall mirror in a raw, unworked reclaimed-oak frame (rough beams, uneven edges, knots)
function rawWood() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#3d2c20'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 160; i++) { const x = Math.random() * 256; g.strokeStyle = 'rgba(' + (20 + Math.random() * 60) + ',' + (14 + Math.random() * 40) + ',10,' + (0.2 + Math.random() * 0.4) + ')'; g.lineWidth = 0.6 + Math.random() * 2.2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (Math.random() - .5) * 25, 170, x + (Math.random() - .5) * 25, 340, x + (Math.random() - .5) * 18, 512); g.stroke(); }
  for (let i = 0; i < 7; i++) { const x = Math.random() * 256, y = Math.random() * 512; const r = g.createRadialGradient(x, y, 1, x, y, 10 + Math.random() * 10); r.addColorStop(0, 'rgba(10,6,4,0.85)'); r.addColorStop(1, 'rgba(10,6,4,0)'); g.fillStyle = r; g.fillRect(x - 24, y - 24, 48, 48); }
  for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(150,120,90,' + Math.random() * 0.12 + ')'; g.fillRect(Math.random() * 256, Math.random() * 512, 1 + Math.random() * 3, 6 + Math.random() * 30); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let rs = 11; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647 - 0.5;
function beam(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d, 3, 10, 3); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + 0.04 * Math.sin(y * 0.11)) + rr() * 0.5 + Math.sin(y * 0.07) * 0.35); p.setY(i, y + rr() * 0.5); p.setZ(i, p.getZ(i) + rr() * 0.4); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
export function buildMirror() {
  const grp = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ map: rawWood(), roughness: 0.95 });
  const gw = 54, gh = 86, cy = 160;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(gw + 1, gh + 1, 0.6), new THREE.MeshStandardMaterial({ color: 0xcfdadd, metalness: 0.35, roughness: 0.05 })); glass.position.set(0, cy, -1); grp.add(glass);
  const L = beam(11, gh + 17, 5.2, wood); L.position.set(-(gw / 2 + 5.4), cy + 1.5, 0); L.rotation.z = 0.004; grp.add(L);
  const R = beam(11.5, gh + 14, 5.0, wood); R.position.set(gw / 2 + 5.6, cy - 0.5, 0); R.rotation.z = -0.006; grp.add(R);
  const T = beam(gw + 1.5, 12, 4.4, wood); T.position.set(0, cy + gh / 2 + 5.2, -0.3); grp.add(T);
  const B = beam(gw + 1.5, 10.5, 4.4, wood); B.position.set(0, cy - gh / 2 - 4.6, -0.3); grp.add(B);
  return grp;
}
`;
t = t.replace('export function buildScene', mirrorCode + '\nexport function buildScene');
t = t.replace(/  const mirror = new THREE\.Mesh\(new THREE\.BoxGeometry\(100, 70, 1\).*?\n/, "  const mirror = buildMirror(); mirror.position.z = -D / 2 + 3; scene.add(mirror);\n");
t = t.replace('cam.position.set(0, 110, 330); cam.lookAt(0, 98, 0)', 'cam.position.set(0, 125, 400); cam.lookAt(0, 118, 0)').replace('cam.position.set(135, 135, 275); cam.lookAt(0, 90, 0)', 'cam.position.set(150, 150, 330); cam.lookAt(0, 118, 0)');
t = t.replace('new THREE.PlaneGeometry(260, 200), new THREE.MeshStandardMaterial({ color: 0xdcd8d1', 'new THREE.PlaneGeometry(300, 260), new THREE.MeshStandardMaterial({ color: 0xdcd8d1').replace('wall.position.set(0, 100, -D / 2 - 1)', 'wall.position.set(0, 130, -D / 2 - 1)');
fs.writeFileSync('vanity/vanity.js', t);
