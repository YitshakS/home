import fs from 'node:fs';
let t = fs.readFileSync('vanity/sofa.js', 'utf8');
const a = t.indexOf('function fabricTex'), b = t.indexOf('// cushion / block');
const fab = `function weave(color) {                                                       // woven fabric: thread grid, slubs, soft mottling
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { const r = g.createRadialGradient(Math.random() * 256, Math.random() * 256, 2, Math.random() * 256, Math.random() * 256, 60); g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '50,110,125') + ',0.035)'; g.fillRect(0, 0, 256, 256); }
  for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const o = ((x / 2 + y / 2) % 2) ? 0.1 : -0.1; g.fillStyle = o > 0 ? 'rgba(255,255,255,' + (0.1 + Math.random() * 0.12) + ')' : 'rgba(30,80,95,' + (0.1 + Math.random() * 0.14) + ')'; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '40,95,110') + ',' + (0.12 + Math.random() * 0.2) + ')'; if (Math.random() < 0.5) g.fillRect(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 14, 1); else g.fillRect(Math.random() * 256, Math.random() * 256, 1, 4 + Math.random() * 14); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 8; return t;
}
function fabricMat(color, bumpTex, mapTex) {
  return new THREE.MeshPhysicalMaterial({ color, map: mapTex, bumpMap: bumpTex, bumpScale: 1.6, roughness: 1, metalness: 0, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xe8f6f8), envMapIntensity: 0.25 });
}
`;
t = t.slice(0, a) + fab + t.slice(b);
t = t.replace(/const tex = fabricTex\(\);\n  const fab = [^\n]*\n  const fabD = [^\n]*\n/, "const bump = weave('#808080'), map = weave('#ffffff'); map.colorSpace = THREE.SRGBColorSpace;\n  const fab = fabricMat(0xa4d2d9, bump, map), fabD = fabricMat(0x8ec0c9, bump, map);\n");
t = t.replace('  return root;\n}\n\nexport function render', '  root.scale.x = -1;                                          // chaise on the right\n  return root;\n}\n\nexport function render');
fs.writeFileSync('vanity/sofa.js', t);
