import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { V3, lerp, UP, RIGHT, sweep, slab } from './stoolParts.js';

// The island bar stool, built to match the owners' photos: cream painted wood, round-backed upholstered seat,
// crossed bentwood back slats that end flat on the sides of the seat, one foot loop.
// Local axes: x = right, y = up, z = front (cm). The front faces the angle direction (south when angle = 0).
// seat outline (plan, shape y = -z): wide straight front, sides narrowing into a round back
function seatShape(k, R, y1, y2) {
  const s = new THREE.Shape(), hf = 19.6 - k, fy = -(17.0 - k);
  s.moveTo(-(hf - 4), fy); s.lineTo(hf - 4, fy); s.quadraticCurveTo(hf, fy, hf, fy + 4);
  s.lineTo(R, y1);
  for (let q = 1; q <= 48; q++) { const an = (Math.PI * q) / 48; s.lineTo(R * Math.cos(an), y1 + (y2 - y1) * Math.sin(an)); }
  s.lineTo(-hf, fy + 4); s.quadraticCurveTo(-hf, fy, -(hf - 4), fy);
  return s;
}
export class BarStool extends Item {
  static type = 'bar-stool';
  static label = 'כסא בר';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 46, depth: 50, height: 103, frameColor: '#ede6d2', fabricColor: '#59616b' };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];
  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }

  build() {
    const wood = new THREE.MeshStandardMaterial({ color: this.data.frameColor, roughness: 0.5, side: THREE.DoubleSide });
    const fabric = new THREE.MeshStandardMaterial({ color: this.data.fabricColor, roughness: 0.96 });
    const add = (m) => { this.object.add(m); return m; };

    // seat frame y 56-60, upholstered pad y 60.2-64.9
    add(slab(seatShape(1.6, 14.2, 7.4, 18.6), 2.4, 0.8, 56.0, wood));
    add(slab(seatShape(0.9, 14.7, 7.2, 19.4), 2.4, 1.1, 60.2, fabric));

    for (const s of [-1, 1]) {
      // front leg: square, tapered, slightly splayed at the floor
      add(sweep([new V3(s * 17.4, 60, 15.4), new V3(s * 18.3, 30, 16.7), new V3(s * 19.0, 0, 17.9)],
        (t) => ({ hw: lerp(2.2, 1.6, t), ht: lerp(2.2, 1.6, t), r: 0.5 }), RIGHT, wood));
      // rear upright: from the floor, bowing forward to touch the round back of the seat, up to the top board
      add(sweep([new V3(s * 22.0, 0, -24.0), new V3(s * 19.6, 20, -21.6), new V3(s * 16.4, 40, -17.6), new V3(s * 13.9, 54, -14.8),
        new V3(s * 13.8, 61.5, -14.8), new V3(s * 15.4, 70, -16.6), new V3(s * 17.9, 78, -20.9), new V3(s * 21.6, 92, -23.1), new V3(s * 23.2, 103.2, -24.8)],
      (t) => ({ hw: 1.95, ht: lerp(2.1, 1.9, t), r: 0.8 }), RIGHT, wood));
    }

    // foot loop at 19 cm: front bar, sides and a shallow curve behind
    add(sweep([[-19.0, 17.8], [0, 17.8], [19.0, 17.8], [18.0, 5], [17.2, -8], [16.6, -17.3], [15.2, -19.9], [8, -21.3], [0, -21.6],
      [-8, -21.3], [-15.2, -19.9], [-16.6, -17.3], [-17.2, -8], [-18.0, 5], [-19.0, 17.8]].map(([x, z]) => new V3(x, 19, z)),
    () => ({ hw: 1.7, ht: 0.9, r: 0.3 }), UP, wood));

    // broad curved top board, tilted back with the uprights
    const zEnd = -23.3, bulge = 3.0, bw = 20.8;
    const zArc = (x) => zEnd - bulge * (1 - (x / bw) ** 2);
    const board = [];
    for (let i = 0; i <= 16; i++) { const x = -bw + (2 * bw * i) / 16; board.push(new V3(x, 92.8, zArc(x))); }
    add(sweep(board, () => ({ hw: 5.6, ht: 1.3, r: 0.8 }), () => new V3(0, Math.cos(0.17), -Math.sin(0.17)), wood));

    // crossed slats; the lower end bends forward and lies flat against the side of the seat frame
    for (const dir of [-1, 1]) {
      let p = [];
      for (let j = -3; j <= 16; j++) {
        const t = j / 16, x = (-12.0 + 29.5 * t) * dir, ee = Math.min(1, Math.abs(x) / 17.7);
        const zr = -(7.2 + 12.4 * Math.sqrt(1 - ee * ee)) - 0.5, zt = zArc(x) + 1.7;
        p.push(new V3(x, 62.0 + 25.6 * t, lerp(zr, zt, t) + 0.5 * dir + (dir < 0 && j < 0 ? -j / 3 : 0)));
      }
      const p0 = p[0], up0 = new V3().subVectors(p[1], p0).normalize(), T0 = up0.clone().negate(), sg = p0.x > 0 ? 1 : -1;
      const Ez = 4.0, E = new V3(sg * (15.0 + (Ez + 7.4) * 0.202 + 0.6), 55.6, Ez), Te = new V3(sg * 0.2, -0.12, 1).normalize();
      const B1 = p0.clone().addScaledVector(T0, 1.5), B2 = E.clone().addScaledVector(Te, -4.0), ext = [];
      for (let k = 1; k <= 6; k++) {
        const s = k / 6, m = 1 - s;
        ext.unshift(new V3().addScaledVector(p0, m * m * m).addScaledVector(B1, 3 * m * m * s).addScaledVector(B2, 3 * m * s * s).addScaledVector(E, s * s * s));
      }
      p = ext.concat(p);
      // twist-free orientation along the bend, the remaining turn spread evenly
      const te = 6 / (p.length - 1), P = new THREE.CatmullRomCurve3(p, false, 'centripetal').getPoints(Math.max(24, p.length * 8));
      const N = P.length, ij = Math.round(te * (N - 1)), W = [], TT = [];
      for (let i = 0; i < N; i++) TT[i] = new V3().subVectors(P[Math.min(i + 1, N - 1)], P[Math.max(i - 1, 0)]).normalize();
      let w = new V3(-TT[ij].y, TT[ij].x, 0.0001).normalize();
      W[ij] = w.clone();
      for (let i = ij - 1; i >= 0; i--) { w = w.clone().addScaledVector(TT[i], -w.dot(TT[i])).normalize(); W[i] = w; }
      const d = new V3(0, 1, 0).addScaledVector(TT[0], -TT[0].y).normalize();
      let phi = Math.atan2(new V3().crossVectors(W[0], d).dot(TT[0]), W[0].dot(d));
      if (phi > Math.PI / 2) phi -= Math.PI;
      if (phi < -Math.PI / 2) phi += Math.PI;
      for (let i = 0; i < ij; i++) W[i] = W[i].clone().applyAxisAngle(TT[i], phi * (1 - i / ij));
      add(sweep(p, () => ({ hw: 1.9, ht: 0.55, r: 0.25 }), (T, t) => (t >= te ? new V3(-T.y, T.x, 0.0001) : W[Math.round(t * (N - 1))].clone()), wood));
    }
  }

  footprint() {
    const { x, y, angle = 0 } = this.data, c = Math.cos(angle), s = Math.sin(angle);
    return [[-23, -25], [23, -25], [23, 19], [-23, 19]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
  }
  dimensions() { return { רוחב: 46.4, עומק: 44, גובה: 103.2, 'גובה מושב': 64.9 }; }
}
registry.add(BarStool);
