import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

// A round ceiling lamp: a glowing disc plus a point light just below it.
// intensity is in candela (the scene is in cm, so a room lamp needs tens of thousands); range cuts the light off so it
// does not spill far through walls (there are no shadows from it).
export class Light extends Item {
  static type = 'light';
  static label = 'מנורה';
  static defaults = { x: 0, y: 0, elevation: 247, width: 30, depth: 30, height: 3, intensity: 40000, range: 260, color: '#fff1d6' };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['elevation', 'גובה מהרצפה', -50, 400, 1],
    ['intensity', 'עוצמה', 0, 200000, 1000],
  ];

  build() {
    const d = this.data;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(d.width / 2, d.width / 2, d.height, 32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(d.color), emissiveIntensity: 1.2 }),
    );
    disc.position.y = d.height / 2;
    disc.castShadow = false;
    this.object.add(disc);
    const light = new THREE.PointLight(new THREE.Color(d.color), d.intensity, d.range, 2);
    light.position.y = -4;
    this.object.add(light);
  }

  place() {
    const d = this.data;
    this.object.position.set(d.x, d.elevation, d.y);
  }
}
registry.add(Light);
