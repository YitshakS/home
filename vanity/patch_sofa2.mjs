import fs from 'node:fs';
let t = fs.readFileSync('vanity/sofa.js', 'utf8');
// 1) heathered woven texture: flecks of light and dark yarn, larger tonal clouds
const a = t.indexOf('function weave'), b = t.indexOf('function fabricMat');
t = t.slice(0, a) + `function weave(color, bumpOnly) {                                            // heathered woven fabric: flecks of light/dark yarn + soft tonal clouds
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = g.createRadialGradient(x, y, 2, x, y, 40 + Math.random() * 60); const l = Math.random() < 0.5; r.addColorStop(0, l ? 'rgba(235,248,250,0.10)' : 'rgba(30,90,110,0.10)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 512, 512); }
  for (let i = 0; i < 16000; i++) { const x = Math.random() * 512, y = Math.random() * 512, l = Math.random() < 0.5; g.fillStyle = l ? 'rgba(238,250,252,' + (0.25 + Math.random() * 0.35) + ')' : 'rgba(25,80,100,' + (0.2 + Math.random() * 0.35) + ')'; if (Math.random() < 0.5) g.fillRect(x, y, 2 + Math.random() * 5, 1.4); else g.fillRect(x, y, 1.4, 2 + Math.random() * 5); }
  for (let y = 0; y < 512; y += 3) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, 512, 1); }
  for (let x = 0; x < 512; x += 3) { g.fillStyle = 'rgba(0,0,0,0.04)'; g.fillRect(x, 0, 1, 512); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); t.anisotropy = 8; return t;
}
` + t.slice(b);
t = t.replace(/function fabricMat[\s\S]*?\n}\n/, `function fabricMat(color, bumpTex, mapTex) {                                    // matte: no gloss, only a faint fuzzy edge sheen
  return new THREE.MeshPhysicalMaterial({ color, map: mapTex, bumpMap: bumpTex, bumpScale: 2.2, roughness: 1, metalness: 0, sheen: 0.18, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xcfeaf0), envMapIntensity: 0.1 });
}
`);
t = t.replace("const bump = weave('#808080'), map = weave('#5fb1c4');", "const bump = weave('#808080'), map = weave('#74b8c9');");
// 2) puffy cushions: the big face bulges
t = t.replace('function soft(w, h, d, r, mat) {', 'function soft(w, h, d, r, mat, puffTop = 0, puffFront = 0) {');
t = t.replace('  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;\n}\nconst at', `  if (puffTop || puffFront) {
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
const at`);
t = t.replace("root.add(at(soft(90, 15, CF - BZ - 14, 2.5, fab), -95", "root.add(at(soft(90, 15, CF - BZ - 14, 3, fab, 5), -95").replace("root.add(at(soft(91, 15, FZ - BZ - 14, 2.5, fab), 2", "root.add(at(soft(91, 15, FZ - BZ - 14, 3, fab, 5), 2").replace("root.add(at(soft(91, 15, FZ - BZ - 14, 2.5, fab), 94", "root.add(at(soft(91, 15, FZ - BZ - 14, 3, fab, 5), 94");
t = t.replace("const b = soft(90, 42, 22, 5, fab);", "const b = soft(90, 42, 22, 6, fab, 0, 6);");
fs.writeFileSync('vanity/sofa.js', t);
