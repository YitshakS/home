import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetURL } from '../core/assets.js';

// A single armchair made from the modern sofa: the sofa is cut across the seat and the back, its left end (arm, seat, end of the back) is
// kept, and a mirror image of that piece is joined at the cut, so the chair has two real arms and the seam is invisible.
// Same shape, fabric and proportions as the sofa; about 131 cm wide.
// At angle 0 it faces +z (south); the sofa itself uses angle PI to face north.
const SOFA = 'models/2002/modern-sofa.glb';
const CUT = -0.4515;                                          // where the sofa is cut (x, in its own units, 2.214 wide): the left end is kept and mirrored here, giving a chair about 131 cm wide
let cached = null;

async function chairGeometry() {
  if (cached) return cached;
  const gltf = await new GLTFLoader().loadAsync(assetURL(SOFA));
  gltf.scene.updateMatrixWorld(true);
  let mesh = null; gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const src = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv;
  const idx = src.index ? src.index.array : Uint32Array.from({ length: pos.count }, (_, i) => i);
  const P = [], N = [], U = [];
  const vert = (i) => ({ p: [pos.getX(i), pos.getY(i), pos.getZ(i)], n: nor ? [nor.getX(i), nor.getY(i), nor.getZ(i)] : [0, 1, 0], u: uv ? [uv.getX(i), uv.getY(i)] : [0, 0] });
  const lerp = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  // cut the triangle with the plane x = at and keep the side where keep(x) is true (Sutherland-Hodgman), splitting the triangles that cross it
  const clip = (poly, at, keepLow) => {
    const out = [], inside = (v) => (keepLow ? v.p[0] <= at : v.p[0] >= at);
    for (let k = 0; k < poly.length; k++) {
      const c = poly[k], d = poly[(k + 1) % poly.length], ci = inside(c), di = inside(d);
      if (ci) out.push(c);
      if (ci !== di) { const t = (at - c.p[0]) / (d.p[0] - c.p[0]); out.push({ p: lerp(c.p, d.p, t), n: lerp(c.n, d.n, t), u: lerp(c.u, d.u, t) }); }
    }
    return out;
  };
  const emit = (poly, mirror) => {
    for (let k = 1; k + 1 < poly.length; k++) {
      const tri = mirror ? [poly[0], poly[k + 1], poly[k]] : [poly[0], poly[k], poly[k + 1]];   // a mirror turns the triangles inside out: reverse them
      for (const v of tri) { P.push(mirror ? 2 * CUT - v.p[0] : v.p[0], v.p[1], v.p[2]); N.push(mirror ? -v.n[0] : v.n[0], v.n[1], v.n[2]); U.push(...v.u); }
    }
  };
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [vert(idx[t]), vert(idx[t + 1]), vert(idx[t + 2])];
    const half = clip(tri, CUT, true);                         // the left end of the sofa, cut across the seat and the back
    emit(half, false);
    emit(half, true);                                          // and its mirror image: the same cross-section meets itself, so the seam is invisible
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.min.x + bb.max.x) / 2, 0, -(bb.min.z + bb.max.z) / 2);
  g.scale(100, 100, 100);                                      // the sofa model is 2.214 units = 221 cm wide
  g.computeBoundingBox();
  const size = new THREE.Vector3(); g.boundingBox.getSize(size);
  cached = { geometry: g, material: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, size };
  return cached;
}

export class Armchair extends Item {
  static type = 'armchair';
  static label = 'כורסה';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 131, depth: 98, height: 112 };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];
  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }

  async build() {
    const { geometry, material } = await chairGeometry();
    const m = new THREE.Mesh(geometry, material);
    m.userData.shared = true;                                   // the geometry is reused by every chair
    this.object.add(m);
  }
}
registry.add(Armchair);
