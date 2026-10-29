import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

// Barn-door infill: vertical boards (shown as grooves) with an X of two flat braces on top, all cut flush
// to a width x height opening. Local axes: x along the panel, y up, z out of the panel (thickness).
// With angle = 0 the panel runs east-west; angle = 90° turns it north-south. elevation is the bottom edge.
export class CrossBrace extends Item {
  static type = 'cross-brace';
  static label = 'X על לוחות';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, width: 48, height: 64, depth: 1.2, band: 7, boards: 8, groove: 1.2, color: '#a8b3a7' };
  static editable = [
    ['band', 'עובי פס ה-X', 1, 20, 0.5],
    ['boards', 'מספר קרשים', 1, 30, 1],
    ['width', 'רוחב', 5, 300, 0.5],
    ['height', 'גובה', 5, 300, 0.5],
  ];

  build() {
    const { width: W, height: H, depth: D, band, boards, groove, color } = this.data;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    mat.polygonOffset = true; mat.polygonOffsetFactor = 0; mat.polygonOffsetUnits = -8;
    const rect = [[-W / 2, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]];

    // grooves between the boards: thin, shallower than the X so the braces sit over them
    for (let k = 1; k < boards; k++) {
      const g = new THREE.BoxGeometry(groove, H, D * 0.5);
      g.translate(-W / 2 + (k * W) / boards, H / 2, D * 0.25);
      this.object.add(new THREE.Mesh(g, mat));
    }
    // two diagonal braces corner to corner, clipped to the opening
    for (const s of [1, -1]) {
      const a = [-W / 2 * s, 0], b = [W / 2 * s, H];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = (-dy / L) * band / 2, ny = (dx / L) * band / 2;
      const ext = 2 * band / L; // reach past the corners before clipping
      const p = (t, side) => [a[0] + dx * t + nx * side, a[1] + dy * t + ny * side];
      const poly = clip([p(-ext, 1), p(1 + ext, 1), p(1 + ext, -1), p(-ext, -1)], rect);
      if (poly.length < 3) continue;
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))), { depth: D, bevelEnabled: false });
      this.object.add(new THREE.Mesh(g, mat));
    }
  }

  place() {
    const d = this.data;
    this.object.position.set(d.x, d.elevation, d.y);
    this.object.rotation.set(0, -(d.angle || 0), 0);
  }

  footprint() {
    const { x, y, width, depth, angle = 0 } = this.data, c = Math.cos(angle), s = Math.sin(angle);
    return [[-width / 2, 0], [width / 2, 0], [width / 2, depth], [-width / 2, depth]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
  }
}
registry.add(CrossBrace);

// Sutherland-Hodgman: clip a polygon against a convex counter-clockwise polygon
function clip(subject, clipper) {
  let out = subject;
  for (let i = 0; i < clipper.length; i++) {
    const A = clipper[i], B = clipper[(i + 1) % clipper.length], input = out;
    out = [];
    const inside = (P) => (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]) >= 0;
    const cross = (P, Q) => {
      const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1];
      const a2 = Q[1] - P[1], b2 = P[0] - Q[0], c2 = a2 * P[0] + b2 * P[1], det = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    for (let j = 0; j < input.length; j++) {
      const P = input[j], Q = input[(j + 1) % input.length];
      if (inside(Q)) { if (!inside(P)) out.push(cross(P, Q)); out.push(Q); } else if (inside(P)) out.push(cross(P, Q));
    }
  }
  return out;
}
