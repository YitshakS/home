import * as THREE from 'three';

// Building blocks shared by the bar stool classes: a rounded-rectangle bar swept along a path (legs, rails,
// slats), and an extruded, bevelled slab for the seat.
export const V3 = THREE.Vector3;
export const lerp = (a, b, t) => a + (b - a) * t;
export const UP = () => new V3(0, 1, 0), RIGHT = () => new V3(1, 0, 0);

function roundedRect(hw, ht, r, seg) {
  const pts = [], cs = [[1, 1, 0], [-1, 1, 90], [-1, -1, 180], [1, -1, 270]];
  for (const [sx, sy, a0] of cs) {
    const ox = sx * (hw - r), oy = sy * (ht - r);
    for (let k = 0; k <= seg; k++) { const a = ((a0 + (90 * k) / seg) * Math.PI) / 180; pts.push([ox + r * Math.cos(a), oy + r * Math.sin(a)]); }
  }
  return pts;
}

// sweep a rounded-rectangle section along a path; sec(t) -> {hw, ht, r}; hint(T, t) fixes the wide side
export function sweep(points, sec, hint, material) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const pts = curve.getPoints(Math.max(24, points.length * 8)), N = pts.length;
  const pos = [], idx = [];
  let ringLen = 0;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, N - 1)];
    const T = new V3().subVectors(b, a).normalize();
    const h = hint(T, t), u = h.clone().sub(T.clone().multiplyScalar(h.dot(T))).normalize();
    const v = new V3().crossVectors(T, u).normalize();
    const s = sec(t), ring = roundedRect(s.hw, s.ht, s.r, 4);
    ringLen = ring.length;
    for (const [rx, ry] of ring) { const p = pts[i].clone().addScaledVector(u, rx).addScaledVector(v, ry); pos.push(p.x, p.y, p.z); }
  }
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < ringLen; k++) {
    const k2 = (k + 1) % ringLen, A = i * ringLen + k, B = i * ringLen + k2, C = (i + 1) * ringLen + k2, D = (i + 1) * ringLen + k;
    idx.push(A, B, C, A, C, D);
  }
  for (const e of [0, N - 1]) {
    const c0 = pos.length / 3, cc = pts[e];
    pos.push(cc.x, cc.y, cc.z);
    for (let k = 0; k < ringLen; k++) idx.push(c0, e * ringLen + k, e * ringLen + ((k + 1) % ringLen));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}


export function slab(shape, depth, bevel, y0, material) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return new THREE.Mesh(g, material);
}

