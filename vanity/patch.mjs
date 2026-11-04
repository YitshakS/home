import fs from 'node:fs';
let t = fs.readFileSync('vanity/vanity.js', 'utf8');
const a = t.indexOf('  // vessel bowl'), b = t.indexOf('  return root;');
const block = `  // vessel bowl: elongated boat shape, ends swept up like the photo (lathe stretched along x, then bent)
  const prof = [[0, 0], [3, 0.1], [7, 0.9], [11, 2.6], [14.5, 5.4], [16, 8.5], [16.3, 11.2], [15.6, 12.6], [15.2, 12.2], [15.7, 11], [15.4, 8.8], [13.7, 6], [10.2, 3.3], [6, 1.5], [2.6, 0.9], [0, 0.9]].map(([r, y]) => new THREE.Vector2(r, y));
  const bg = new THREE.LatheGeometry(prof, 72); const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    let x = bp.getX(i) * 1.95, y = bp.getY(i), z = bp.getZ(i) * 0.92;
    const u = x / 31;                                              // -1..1 along the bowl
    y += 7 * Math.pow(Math.abs(u), 2.6) * (0.4 + y / 14) + (u > 0 ? 1.2 * u : 0);  // ends rise, right end a little higher
    bp.setXYZ(i, x, y, z);
  }
  bg.computeVertexNormals();
  const bowl = new THREE.Mesh(bg, glass); bowl.position.set(-4, H + 0.2, 5); bowl.castShadow = true; root.add(bowl);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })); drain.position.set(-4, H + 1.4, 5); root.add(drain);

  // bronze pillar faucet like the photo: bulbous banded column, swan-neck spout, lever on top
  const fx = 22, fz = -7, fy = H;
  const colProf = [[0, 0], [3.4, 0], [3.4, 1.3], [2.3, 1.8], [2.0, 3.5], [2.7, 6], [3.1, 8.5], [2.6, 11], [2.0, 13], [2.0, 15], [2.8, 17.5], [2.9, 19.5], [2.1, 21.5], [1.8, 24], [0, 24.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const col = new THREE.Mesh(new THREE.LatheGeometry(colProf, 36), bronze); col.position.set(fx, fy, fz); col.castShadow = true; root.add(col);
  for (const yy of [3.2, 12.4, 21.2]) { const b = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.3, 10, 28), bronzeBand); b.rotation.x = Math.PI / 2; b.position.set(fx, fy + yy, fz); root.add(b); }
  const curve = new THREE.CatmullRomCurve3([[fx, fy + 17.5, fz], [fx - 3.5, fy + 18.2, fz + 0.3], [fx - 8, fy + 20, fz + 1.4], [fx - 12, fy + 19.5, fz + 3], [fx - 14, fy + 16.5, fz + 4], [fx - 14.4, fy + 13.5, fz + 4.2]].map((p) => new THREE.Vector3(...p)));
  const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 1.3, 14), bronze); neck.castShadow = true; root.add(neck);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 2.2, 18), bronze); lip.position.set(fx - 14.4, fy + 13, fz + 4.2); root.add(lip);
  const lipBand = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 8, 20), bronzeBand); lipBand.rotation.x = Math.PI / 2; lipBand.position.set(fx - 14.4, fy + 13.9, fz + 4.2); root.add(lipBand);
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.8, 11, 14), bronze); lever.rotation.z = -1.1; lever.position.set(fx + 4.2, fy + 27.2, fz); root.add(lever);
  const leverTip = new THREE.Mesh(new THREE.SphereGeometry(1.45, 16, 12), bronze); leverTip.position.set(fx + 9.4, fy + 29.4, fz); root.add(leverTip);
`;
t = t.slice(0, a) + block + t.slice(b);
t = t.replace('SAGE = 0x93b08f', 'SAGE = 0x86bcb2').replace('color: 0xa3bd9e', 'color: 0x9acac0').replace("g.fillStyle = '#5a3218'", "g.fillStyle = '#9a6a3c'").replace('bowlColor = 0x6cc2f0', 'bowlColor = 0x57b8e8');
fs.writeFileSync('vanity/vanity.js', t);
