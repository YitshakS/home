import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetURL } from '../core/assets.js';

// A work surface cut from one slab: any outline (plan points, cm) with optional holes (sink, hob), a thickness,
// and one stone texture laid across the whole top as a single continuous piece - no seams between parts.
// The texture is scaled to just cover the slab (it keeps its proportions; whatever sticks out is cropped).
// textureRotation: 180 turns the pattern half a turn about the slab centre (no other angle is supported).
// x / y are an offset from the plan coordinates the outline is written in (0, 0 unless the slab is dragged).
export class Countertop extends Item {
  static type = 'countertop';
  static label = 'משטח עבודה';
  static defaults = { x: 0, y: 0, elevation: 86, thickness: 4, points: [], holes: [], edgeColor: '#d2bfa3', color: '#d8d2c8' };
  static editable = [
    ['elevation', 'גובה תחתית המשטח', 0, 200, 0.5],
    ['thickness', 'עובי', 0.5, 15, 0.1],
  ];

  bounds() {
    const xs = this.data.points.map((p) => p[0]), ys = this.data.points.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  build() {
    const d = this.data;
    if (d.points.length < 3) return;
    const shape = new THREE.Shape(d.points.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of d.holes || []) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    // plan (x, y) -> scene (x, 0, y); the extrusion then runs downwards from the top face
    const g = new THREE.ExtrudeGeometry(shape, { depth: d.thickness, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    g.translate(0, d.thickness, 0);

    const top = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.85 });
    if (d.texture) {
      const { x0, x1, y0, y1 } = this.bounds(), W = x1 - x0, H = y1 - y0, tw = d.texture.width, th = d.texture.height;
      const k = Math.max(W / tw, H / th);
      const t = new THREE.TextureLoader().load(assetURL(d.texture.image));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      // extruded caps carry plan coordinates (cm) as their UVs: stretch them over the texture's real size
      const rx = 1 / (tw * k), ry = 1 / (th * k);
      let ox = -x0 * rx, oy = -y0 * ry + (1 - H * ry) / 2;
      if (d.textureRotation === 180) {
        // a true 180° turn of the pattern about the slab centre (not a mirror): negate the scale, shift the offset
        ox += 2 * rx * ((x0 + x1) / 2); oy += 2 * ry * ((y0 + y1) / 2);
        t.repeat.set(-rx, -ry);
      } else t.repeat.set(rx, ry);
      t.offset.set(ox, oy);
      top.map = t;
      top.color.set(0xffffff);
    }
    // no edgeColor: the edges carry the same stone texture as the top (thin sheets)
    const edge = d.edgeColor ? new THREE.MeshStandardMaterial({ color: d.edgeColor, roughness: 0.85 }) : top;
    // ExtrudeGeometry: group 0 = top and bottom faces, group 1 = the edges
    this.object.add(new THREE.Mesh(g, [top, edge]));
  }

  place() {
    this.object.position.set(this.data.x || 0, this.data.elevation, this.data.y || 0);
    this.object.rotation.set(0, 0, 0);
  }

  footprint() {
    const { x = 0, y = 0 } = this.data;
    return this.data.points.map(([px, py]) => [px + x, py + y]);
  }

  dimensions() {
    const b = this.bounds();
    return { רוחב: +(b.x1 - b.x0).toFixed(1), עומק: +(b.y1 - b.y0).toFixed(1), עובי: this.data.thickness };
  }
}
registry.add(Countertop);
