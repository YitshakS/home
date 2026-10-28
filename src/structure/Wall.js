import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { moveWall, wallOffset } from './editing.js';

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.92 });

// A straight wall from start to end (plan points), centred on that line.
// Joined walls meet at right angles: the wall is shortened by half the neighbour's thickness at its
// start and lengthened by it at its end, so every corner is filled exactly once.
// Doors and windows (items with data.opening) that sit on the wall cut holes in it.
export class Wall extends Item {
  static type = 'wall';
  static label = 'קיר';
  static defaults = { thickness: 10, height: 250 };
  static editable = [
    ['position', 'מיקום (הזזת הקיר)', -1000, 4000, 0.5],
    ['thickness', 'עובי', 1, 60, 0.5],
    ['height', 'גובה', 10, 600, 1],
  ];

  // x of a north-south wall, y of an east-west wall (other angles: distance along the normal)
  get position() {
    const [dx, dy] = this.dir();
    if (Math.abs(dx) < 1e-6) return this.data.start[0];
    if (Math.abs(dy) < 1e-6) return this.data.start[1];
    return +wallOffset(this).toFixed(2);
  }
  async setField(key, value) {
    if (key !== 'position') return false;
    const [dx, dy] = this.dir();
    const n = Math.abs(dx) < 1e-6 ? -dy : Math.abs(dy) < 1e-6 ? dx : 1;
    await moveWall(this.app, this, (value - this.position) * Math.sign(n));
    return true;
  }

  get length() {
    const [x0, y0] = this.data.start, [x1, y1] = this.data.end;
    return Math.hypot(x1 - x0, y1 - y0);
  }
  set length(v) {
    const [x0, y0] = this.data.start, d = this.dir();
    this.data.end = [x0 + d[0] * v, y0 + d[1] * v];
  }

  dir() {
    const [x0, y0] = this.data.start, [x1, y1] = this.data.end, L = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [(x1 - x0) / L, (y1 - y0) / L];
  }

  neighbour(id) { return id ? this.app.items.get(id) : null; }

  // along-wall range actually built, relative to start
  extent() {
    const s = this.neighbour(this.data.joinStart), e = this.neighbour(this.data.joinEnd);
    return [s ? s.data.thickness / 2 : 0, this.length + (e ? e.data.thickness / 2 : 0)];
  }

  // doors/windows lying on this wall, as along-wall [from, to] and vertical [bottom, top] ranges
  openings() {
    const [x0, y0] = this.data.start, [dx, dy] = this.dir(), L = this.length, t = this.data.thickness;
    const out = [];
    for (const it of this.app.items.values()) {
      const o = it.data;
      if (!o.opening) continue;
      const along = (o.x - x0) * dx + (o.y - y0) * dy;
      const across = Math.abs(-(o.x - x0) * dy + (o.y - y0) * dx);
      const parallel = Math.abs(Math.sin((o.angle || 0) - Math.atan2(dy, dx))) < 0.05;
      if (!parallel || across > t / 2 + 6 || along < -1 || along > L + 1) continue;
      out.push({ from: along - o.width / 2, to: along + o.width / 2, bottom: o.elevation || 0, top: (o.elevation || 0) + o.height, door: /door|דלת/i.test(o.name || '') });
    }
    return out.sort((a, b) => a.from - b.from);
  }

  build() {
    const { thickness: t, height: H } = this.data;
    const [u0, u1] = this.extent();
    const boxes = [];
    const box = (a, b, y0, y1) => {
      if (b - a < 0.01 || y1 - y0 < 0.01) return;
      const g = new THREE.BoxGeometry(b - a, y1 - y0, t);
      g.translate((a + b) / 2, (y0 + y1) / 2, 0);
      boxes.push(g);
    };
    let u = u0;
    for (const op of this.openings()) {
      const a = Math.max(op.from, u0), b = Math.min(op.to, u1);
      if (b <= u) continue;
      box(u, a, 0, H);                 // solid wall before the opening
      box(a, b, 0, Math.min(op.bottom, H)); // below a window
      box(a, b, Math.min(op.top, H), H);    // above the opening
      u = b;
    }
    box(u, u1, 0, H);
    if (!boxes.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(boxes), wallMaterial);
    mesh.userData.shared = false;
    this.object.add(mesh);
  }

  place() {
    const [x0, y0] = this.data.start, [dx, dy] = this.dir();
    this.object.position.set(x0, 0, y0);
    this.object.rotation.set(0, -Math.atan2(dy, dx), 0);
  }

  footprint() {
    const [x0, y0] = this.data.start, [dx, dy] = this.dir(), h = this.data.thickness / 2;
    const [u0, u1] = this.extent();
    const p = (u, v) => [x0 + dx * u - dy * v, y0 + dy * u + dx * v];
    return [p(u0, -h), p(u1, -h), p(u1, h), p(u0, h)];
  }

  dimensions() {
    return { אורך: +this.length.toFixed(1), עובי: this.data.thickness, גובה: this.data.height };
  }
}
registry.add(Wall);
