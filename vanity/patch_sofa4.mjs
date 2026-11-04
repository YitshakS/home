import fs from 'node:fs';
let t = fs.readFileSync('vanity/sofa2.js', 'utf8');
const a = t.indexOf('// throw pillow:'), b = t.indexOf('export function buildSofa2');
t = t.slice(0, a) + `// throw pillow: a squarish pillow (flattened superellipsoid, so the corners pinch like a stuffed pillow), planar UVs for the pattern, optional cream piping
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

` + t.slice(b);
t = t.replace('const vel = velvet(0x2a6577), velD = velvet(0x1f5262);', 'const vel = velvet(0x205a6d), velD = velvet(0x184b5b);');
t = t.replace('const dark = velvet(0x244e5c);', 'const dark = velvet(0x1c4a58);');
t = t.replace('r.toneMappingExposure = 0.95;', 'r.toneMappingExposure = 0.85;').replace('new THREE.DirectionalLight(0xffffff, 1.6)', 'new THREE.DirectionalLight(0xffffff, 1.3)');
t = t.replace("new THREE.MeshPhysicalMaterial({ map: spots(), roughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color(0xdffaf3), envMapIntensity: 0.3 })", "new THREE.MeshPhysicalMaterial({ map: spots(), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xbdeee3), envMapIntensity: 0.15 })");
fs.writeFileSync('vanity/sofa2.js', t);
