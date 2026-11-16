import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetURL } from '../core/assets.js';

// A square engraved stone panel on a wall ("אם אשכחך ירושלים"): the photo of the carving as a flat panel flush with the wall,
// with a shaded edge (dark at the top and left, light at the bottom and right) so that it reads as cut into the wall.
// width x height in cm; at angle 0 it faces +z (the room side of a wall running east-west on its north side).
export class Plaque extends Item {
  static type = 'plaque';
  static label = 'חריטה על הקיר';
  static defaults = { x: 0, y: 0, elevation: 136, angle: 0, width: 48, height: 48, depth: 0.4, image: 'textures/plaque.jpg' };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['elevation', 'גובה מהרצפה', 0, 250, 1],
    ['width', 'רוחב', 10, 200, 1],
    ['height', 'גובה', 10, 200, 1],
  ];

  async build() {
    const d = this.data;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = assetURL(d.image); });
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, S, S);
    const e = 26;                                              // width of the carved edge in pixels
    const edge = (x0, y0, x1, y1, col0, col1, r) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, col0); gr.addColorStop(1, col1); g.fillStyle = gr; g.fill(r); };
    const top = new Path2D(); top.rect(0, 0, S, e); edge(0, 0, 0, e, 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', top);
    const left = new Path2D(); left.rect(0, 0, e, S); edge(0, 0, e, 0, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', left);
    const bottom = new Path2D(); bottom.rect(0, S - e, S, e); edge(0, S, 0, S - e, 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)', bottom);
    const right = new Path2D(); right.rect(S - e, 0, e, S); edge(S, 0, S - e, 0, 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0)', right);
    g.strokeStyle = 'rgba(40,30,20,0.7)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, S - 3, S - 3);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.width, d.height), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    m.position.y = d.height / 2;
    this.object.add(m);
  }

  footprint() {
    const { x = 0, y = 0, width = 0, depth = 0.4, angle = 0 } = this.data;
    const c = Math.cos(angle), s = Math.sin(angle);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [x + (u * width / 2) * c - (v * depth / 2) * s, y + (u * width / 2) * s + (v * depth / 2) * c]);
  }
}
registry.add(Plaque);
