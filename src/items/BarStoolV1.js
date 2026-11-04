import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { V3, lerp, UP, RIGHT, sweep, slab } from './stoolParts.js';

// The first bar stool design (כסא-בר-1.html): cream painted wood, round-backed upholstered seat, straight crossed
// back slats, one foot loop. Local axes: x = right, y = up, z = front (cm); the front faces the angle direction
// (south when angle = 0). About 52.6 cm wide at the top of the back, so stools need a pitch of at least ~53 cm.

// seat outline (plan, shape y = -z): wide straight front, sides narrowing into a half-ellipse back
function seatShape(k, rx) {
  const s = new THREE.Shape();
  s.moveTo(-(16.2 - k), -(19.6 - k)); s.lineTo(16.2 - k, -(19.6 - k));
  s.quadraticCurveTo(19.6 - k, -(19.6 - k), 19.6 - k, -(16.2 - k));
  s.lineTo(rx, 17.5);
  for (let q = 1; q <= 28; q++) { const an = (Math.PI * q) / 28; s.lineTo(rx * Math.cos(an), 17.5 + (8.2 - k * 0.5) * Math.sin(an)); }
  s.lineTo(-(19.6 - k), -(16.2 - k));
  s.quadraticCurveTo(-(19.6 - k), -(19.6 - k), -(16.2 - k), -(19.6 - k));
  return s;
}

export class BarStoolV1 extends Item {
  static type = 'bar-stool-v1';
  static label = 'כסא בר (גרסה 1)';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 52.6, depth: 48, height: 103.2, frameColor: '#ede6d2', fabricColor: '#59616b' };
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
    add(slab(seatShape(1.6, 15.4), 2.4, 0.8, 56.0, wood));
    add(slab(seatShape(0.9, 14.4), 2.4, 1.1, 60.2, fabric));

    for (const s of [-1, 1]) {
      // front leg: square, tapered, slightly splayed at the floor
      add(sweep([new V3(s * 18.0, 60, 18.0), new V3(s * 18.8, 30, 19.2), new V3(s * 19.4, 0, 20.4)],
        (t) => ({ hw: lerp(2.2, 1.6, t), ht: lerp(2.2, 1.6, t), r: 0.5 }), RIGHT, wood));
      // tall rear upright: floor -> slim at the seat -> flares out to the top board
      add(sweep([new V3(s * 22.0, 0, -24.0), new V3(s * 19.6, 20, -21.6), new V3(s * 17.9, 45, -19.8), new V3(s * 17.3, 62, -19.2),
        new V3(s * 17.9, 78, -20.9), new V3(s * 21.6, 92, -23.1), new V3(s * 23.2, 103.2, -24.8)],
      (t) => ({ hw: lerp(2.2, 2.0 + 1.1 * Math.max(0, (t - 0.55) / 0.45), t), ht: 1.9, r: 0.8 }), RIGHT, wood));
    }

    // foot loop at 19 cm: front bar, sides and a half-round behind
    const RX = 16.6, zc = -19.5, bz = 5;
    const loop = [[-19.0, 20.2], [0, 20.2], [19.0, 20.2], [17.2, 4], [RX, -8], [RX, zc]];
    for (let i = 1; i < 12; i++) { const a = (Math.PI * i) / 12; loop.push([RX * Math.cos(a), zc - bz * Math.sin(a)]); }
    loop.push([-RX, zc], [-RX, -8], [-17.2, 4], [-19.0, 20.2]);
    add(sweep(loop.map(([x, z]) => new V3(x, 19, z)), () => ({ hw: 1.7, ht: 0.9, r: 0.3 }), UP, wood));

    // broad curved top board, tilted back with the uprights
    const zEnd = -23.3, bulge = 3.0, bw = 20.8;
    const zArc = (x) => zEnd - bulge * (1 - (x / bw) ** 2);
    const board = [];
    for (let i = 0; i <= 16; i++) { const x = -bw + (2 * bw * i) / 16; board.push(new V3(x, 92.8, zArc(x))); }
    add(sweep(board, () => ({ hw: 5.6, ht: 1.3, r: 0.8 }), () => new V3(0, Math.cos(0.17), -Math.sin(0.17)), wood));

    // two straight crossed slats from the seat level up to the top board
    for (const dir of [-1, 1]) {
      const p = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = (-17.8 + 38.6 * t) * dir;
        p.push(new V3(x, 65.8 + 21.8 * t, lerp(-19.2, zArc(x) + 0.9, t) + 0.45 * dir));
      }
      add(sweep(p, () => ({ hw: 2.4, ht: 0.9, r: 0.35 }), (T) => new V3().crossVectors(T, new V3(0, 0, 1)), wood));
    }
  }

  footprint() {
    const { x, y, angle = 0 } = this.data, c = Math.cos(angle), s = Math.sin(angle);
    return [[-26.3, -27], [26.3, -27], [26.3, 22], [-26.3, 22]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
  }
  dimensions() { return { רוחב: 52.6, עומק: 49, גובה: 103.2, 'גובה מושב': 64.9 }; }
}
registry.add(BarStoolV1);
