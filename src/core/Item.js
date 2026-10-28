import * as THREE from 'three';

// Base class for everything placed in the house (walls, rooms and furniture alike).
// Plan coordinates are SH3D's: centimetres, x = east, y = south; elevation is up.
// In the 3D scene: x -> x, elevation -> y, plan y -> z.
export class Item {
  static type = 'item';
  static label = 'פריט';
  static defaults = {};
  // fields the control panel offers for editing: [key, label, min, max, step]
  static editable = [];

  constructor(app, data) {
    this.app = app;
    this.data = { ...structuredClone(this.constructor.defaults), ...data };
    this.object = new THREE.Group();
    this.object.userData.item = this;
  }

  get id() { return this.data.id; }
  get name() { return this.data.name || this.constructor.label; }

  // create the meshes inside this.object (local coordinates); may be async
  async build() {}

  // put this.object where the data says it is
  place() {
    const d = this.data;
    this.object.position.set(d.x ?? 0, d.elevation ?? 0, d.y ?? 0);
    this.object.rotation.set(0, -(d.angle ?? 0), 0);
  }

  async rebuild() {
    this.clear();
    await this.build();
    this.place();
    this.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  clear() {
    for (const c of [...this.object.children]) {
      this.object.remove(c);
      c.traverse((o) => { if (o.isMesh && !o.userData.shared) o.geometry?.dispose(); });
    }
  }

  // plan outline as [[x, y], ...] for the 2D plan and hit testing
  footprint() {
    const { x = 0, y = 0, width = 0, depth = 0, angle = 0 } = this.data;
    const c = Math.cos(angle), s = Math.sin(angle);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
      const px = (u * width) / 2, py = (v * depth) / 2;
      return [x + px * c - py * s, y + px * s + py * c];
    });
  }

  // human readable size for the info box
  dimensions() {
    const { width, depth, height } = this.data;
    return width !== undefined ? { רוחב: width, עומק: depth, גובה: height } : {};
  }

  toJSON() { return this.data; }
}
