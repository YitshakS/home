import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

// A plain wall-hung toilet built from shapes (no downloaded model): glossy bowl with a flat back for the wall, seat ring and a lid that each open by click, separately.
// Local axes: x = across, y = up (0 = underside of the bowl), z = front is -z, the flat back (against the wall) is at z = +26.
// data.width / depth / height stretch it; lid {angle, axis} is used by DoorToggle.
const A = 18, BACK = 26, SIDE = 8, FRONT_B = 52 - SIDE; // half width, back z, straight side length, front half-ellipse depth
const H = 30, SEAT = 2.2, LIDT = 2.5;                    // bowl rim height, seat and lid thickness
const TOTAL = H + SEAT + LIDT;

// outline of the plan view, going round the back-right -> front -> back-left -> back edge
function outline() {
  const p = [];
  for (let i = 0; i <= 3; i++) p.push([A, BACK - (SIDE * i) / 4]);
  for (let i = 0; i <= 40; i++) { const t = (Math.PI * i) / 40; p.push([A * Math.cos(t), BACK - SIDE - FRONT_B * Math.sin(t)]); }
  for (let i = 1; i <= 4; i++) p.push([-A, BACK - SIDE + (SIDE * i) / 4]);
  for (let i = 1; i < 16; i++) p.push([-A + (2 * A * i) / 16, BACK]);
  return p;
}
const OUT = outline();
const ring = (sx, sz, y) => OUT.map(([x, z]) => [x * sx, y, BACK - (BACK - z) * sz]);

function loft(rings, closeBottom) {
  const M = rings[0].length, pos = [], idx = [];
  for (const r of rings) for (const v of r) pos.push(...v);
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < M; i++) {
    const a = k * M + i, b = k * M + ((i + 1) % M), c = (k + 1) * M + i, d = (k + 1) * M + ((i + 1) % M);
    idx.push(a, c, b, b, c, d);
  }
  if (closeBottom) {
    const r = rings[0], cx = r.reduce((s, v) => s + v[0], 0) / M, cy = r[0][1], cz = r.reduce((s, v) => s + v[2], 0) / M;
    const ci = pos.length / 3; pos.push(cx, cy, cz);
    for (let i = 0; i < M; i++) idx.push(ci, (i + 1) % M, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// flat shape from the outline scaled about the back edge; shape y = -z so that after rotateX(-90deg) it lies flat and the thickness goes up
function flat(sx, sz, y0, thick, hole, bevel) {
  const pts = OUT.map(([x, z]) => new THREE.Vector2(x * sx, -(BACK - (BACK - z) * sz)));
  const shape = new THREE.Shape(pts);
  if (hole) shape.holes.push(new THREE.Path(OUT.map(([x, z]) => new THREE.Vector2(x * hole[0], -(BACK - (BACK - z) * hole[1]))).reverse()));
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return g;
}

export class WallHungToilet extends Item {
  static type = 'wc-hung';
  static label = 'אסלה תלויה';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 36, depth: 52, height: TOTAL, lid: { angle: 100, axis: 'x' } };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['elevation', 'גובה מהרצפה', -50, 400, 0.5],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];
  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }

  build() {
    const d = this.data;
    const g = new THREE.Group();
    const ceramic = new THREE.MeshStandardMaterial({ color: 0xf6f7f7, roughness: 0.16, metalness: 0, side: THREE.DoubleSide });
    const plastic = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.32, metalness: 0 });
    const water = new THREE.MeshStandardMaterial({ color: 0x9fc9e3, roughness: 0.05, transparent: true, opacity: 0.55 });

    // outer bowl
    const outer = [];
    // straight sides with a rounded underside (quarter ellipse over the lowest 14 cm)
    const R = 16, N = 24, K = 0.26;
    for (let k = 0; k <= N; k++) {
      const y = H * Math.pow(k / N, 1.5);
      const s = y >= R ? 1 : 1 - K * (1 - Math.sqrt(1 - Math.pow((R - y) / R, 2)));
      outer.push(ring(s, s, y));
    }
    g.add(new THREE.Mesh(loft(outer, true), ceramic));
    // rim between the outside and the inner opening, then the funnel inside
    g.add(new THREE.Mesh(loft([ring(1, 1, H), ring(0.8, 0.77, H)], false), ceramic));
    const inner = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; inner.push(ring(0.8 - 0.5 * t * t, 0.77 - 0.45 * t * t, H - 0.2 - H * 0.55 * Math.sin((t * Math.PI) / 2))); }
    g.add(new THREE.Mesh(loft(inner, true), ceramic));
    // water surface
    g.add(new THREE.Mesh(loft([ring(0.52, 0.5, H - 14), ring(0.5, 0.48, H - 14)], true), water));
    // seat ring
    const seatGroup = new THREE.Group();
    const seatPivot = new THREE.Vector3(0, H + SEAT, BACK - 2);
    seatGroup.position.copy(seatPivot);
    const seat = new THREE.Mesh(flat(1.03, 1.03, H, SEAT, [0.8, 0.77], 0.3), plastic);
    seat.position.copy(seatPivot).negate();
    seatGroup.add(seat);
    g.add(seatGroup);
    seatGroup.userData.hinge = { group: seatGroup, axis: 'x', angle: 100, c: 0, target: 0, isHinge: true };
    // two hinge caps at the back of the seat
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 14), plastic);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(sx * 9, H + SEAT + 1, BACK - 1.8);
      g.add(cap);
    }
    // back mounting plate against the wall
    const plate = new THREE.Mesh(new THREE.BoxGeometry(2 * A * 0.96, H * 0.78, 0.6), ceramic);
    plate.position.set(0, H * 0.42, BACK + 0.2);
    g.add(plate);
    // lid, hinged at the back
    const lidGroup = new THREE.Group();
    const pivot = new THREE.Vector3(0, H + SEAT, BACK - 2);
    lidGroup.position.copy(pivot);
    const lid = new THREE.Mesh(flat(1.04, 1.04, H + SEAT, LIDT, null, 0.5), plastic);
    lid.position.copy(pivot).negate();
    lidGroup.add(lid);
    g.add(lidGroup);
    lidGroup.userData.hinge = { group: lidGroup, axis: 'x', angle: 105, c: 0, target: 0, isHinge: true };
    this.lid = null;

    // stretch to the requested size; the model is centred across and along (z centred), bottom at y = 0
    const front = BACK - (SIDE + FRONT_B) * 1.04; // about -26.2
    g.position.set(0, 0, -(BACK + front) / 2);
    const w = new THREE.Group();
    w.add(g);
    w.scale.set((d.width || 36) / (2 * A * 1.03), (d.height || TOTAL) / TOTAL, (d.depth || 52) / (BACK - front));
    this.object.add(w);
  }
}
registry.add(WallHungToilet);
