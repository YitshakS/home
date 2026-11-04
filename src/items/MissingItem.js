import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

// Stand-in for data whose "type" has no registered class: a grey box, so the house still loads.
export class MissingItem extends Item {
  static type = 'missing';
  static label = 'פריט לא מוכר';
  build() {
    const { width = 40, depth = 40, height = 40 } = this.data;
    console.warn(`no class registered for type "${this.data.type}" (${this.data.name || this.data.id})`);
    const g = new THREE.BoxGeometry(width, height, depth);
    g.translate(0, height / 2, 0);
    this.object.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9a9a9a, wireframe: true })));
  }
}
registry.add(MissingItem);
