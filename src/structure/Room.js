import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetURL } from '../core/assets.js';
import { resizeRoom } from './editing.js';

// A floor area with a name. Points are plan coordinates (cm), in order around the room.
export class Room extends Item {
  static type = 'room';
  static label = 'חדר';
  static defaults = { name: '', points: [], floorColor: '#d0c8ba' };
  static editable = [
    ['roomWidth', 'רוחב (מזרח-מערב)', 50, 3000, 0.5],
    ['roomDepth', 'עומק (צפון-דרום)', 50, 3000, 0.5],
  ];

  bounds() {
    const xs = this.data.points.map((p) => p[0]), ys = this.data.points.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }
  get roomWidth() { const b = this.bounds(); return +(b.x1 - b.x0).toFixed(2); }
  get roomDepth() { const b = this.bounds(); return +(b.y1 - b.y0).toFixed(2); }
  // resizing moves the wall on the east / south side (and whatever touches it)
  async setField(key, value) {
    if (key === 'roomWidth') { await resizeRoom(this.app, this, 0, value); return true; }
    if (key === 'roomDepth') { await resizeRoom(this.app, this, 1, value); return true; }
    return false;
  }
  stretch(sx, sy) {
    const b = this.bounds();
    this.data.points = this.data.points.map(([x, y]) => [b.x0 + (x - b.x0) * sx, b.y0 + (y - b.y0) * sy]);
  }

  area() {
    let s = 0;
    const p = this.data.points;
    p.forEach((a, i) => { const b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; });
    return Math.abs(s / 2);
  }

  build() {
    const pts = this.data.points;
    if (pts.length < 3) return;
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2); // plan (x, y) -> scene (x, 0, z=y)
    const mat = new THREE.MeshStandardMaterial({ color: this.data.floorColor, roughness: 0.85, side: THREE.DoubleSide });
    const tex = this.data.floorTexture;
    if (tex) {
      const t = new THREE.TextureLoader().load(assetURL(tex.image));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.repeat.set(1 / tex.width, 1 / tex.height);
      mat.map = t;
      mat.color.set(0xffffff);
    }
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.y = 0.2;
    this.object.add(mesh);
  }

  place() { this.object.position.set(0, 0, 0); this.object.rotation.set(0, 0, 0); }
  footprint() { return this.data.points; }
  dimensions() {
    return { רוחב: +this.roomWidth.toFixed(1), עומק: +this.roomDepth.toFixed(1), 'שטח מ"ר': +(this.area() / 10000).toFixed(2) };
  }
}
registry.add(Room);
