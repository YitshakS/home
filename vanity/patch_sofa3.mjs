import fs from 'node:fs';
let t = fs.readFileSync('vanity/sofa.js', 'utf8');
t = t.replace("import { RoomEnvironment }", "import linenDiff from './tex/rough_linen_diff.jpg';\nimport linenNor from './tex/rough_linen_nor.jpg';\nimport jerseyDiff from './tex/jersey_melange_diff.jpg';\nimport jerseyNor from './tex/jersey_melange_nor.jpg';\nimport { RoomEnvironment }");
const a = t.indexOf('function weave'), b = t.indexOf('// cushion / block');
t = t.slice(0, a) + `// real photographed fabric (Poly Haven, CC0): diffuse + normal map, ~27 cm per tile
function fabricMaps(variant) {
  const [d, n] = variant === 'jersey' ? [jerseyDiff, jerseyNor] : [linenDiff, linenNor], L = new THREE.TextureLoader();
  const map = L.load(d), normal = L.load(n);
  for (const x of [map, normal]) { x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(1 / 27, 1 / 27); x.anisotropy = 8; }
  map.colorSpace = THREE.SRGBColorSpace; return { map, normal };
}
function fabricMat(color, maps) {                                              // matte cloth: no gloss, faint fuzzy edge sheen
  return new THREE.MeshPhysicalMaterial({ color, map: maps.map, normalMap: maps.normal, normalScale: new THREE.Vector2(1.3, 1.3), roughness: 1, metalness: 0, sheen: 0.25, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xcfeaf0), envMapIntensity: 0.08 });
}
` + t.slice(b);
t = t.replace(/export function buildSofa\(\) \{/, 'export function buildSofa(variant = \'linen\') {');
t = t.replace(/const bump = weave[^\n]*\n  const fab = [^\n]*\n/, "const maps = fabricMaps(variant);\n  const fab = fabricMat(0xffffff, maps), fabD = fabricMat(0xdcdcdc, maps);\n");
t = t.replace('scene.add(buildSofa());', "const [vw, vv] = (location.hash || '#3q:linen').slice(1).split(':'); scene.add(buildSofa(vv));");
t = t.replace("render((location.hash || '#3q').slice(1));", "render(((location.hash || '#3q:linen').slice(1)).split(':')[0]);");
fs.writeFileSync('vanity/sofa.js', t);
let b2 = fs.readFileSync('vanity/build_sofa.mjs', 'utf8');
b2 = b2.replace("charset: 'utf8' }", "charset: 'utf8', loader: { '.jpg': 'dataurl' } }");
fs.writeFileSync('vanity/build_sofa.mjs', b2);
