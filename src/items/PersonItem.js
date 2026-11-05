import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetURL } from '../core/assets.js';

// A person (animated glTF) scaled to data.height, used to check clearances (head room, room to stand by the toilet).
// Click toggles between standing (data.stand = {x, y, angle} in the plan) and sitting (the item's own x, y, angle, elevation).
// data.sitLift raises the seated body so that it rests on the seat; data.clips = {stand, sit} names of the animations.
const cache = new Map();
const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => assetURL(url.replace(/^.*?(models\/)/, '$1')));

export class PersonItem extends Item {
  static type = 'person';
  static label = 'אדם';
  static defaults = { x: 0, y: 0, elevation: 0, angle: 0, height: 175, width: 50, depth: 30, clips: { stand: 'Pose', sit: 'sit' }, sitLift: 0, sitting: false };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['height', 'גובה האדם', 120, 210, 1],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];
  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }

  async build() {
    const d = this.data;
    if (!cache.has(d.model)) cache.set(d.model, new GLTFLoader(manager).loadAsync(assetURL(d.model)));
    const gltf = await cache.get(d.model);
    const root = clone(gltf.scene);
    // scale so that the standing pose is data.height tall, feet on the floor, centred on x/z
    this.mixer = new THREE.AnimationMixer(root);
    const clip = (n) => gltf.animations.find((a) => a.name === n);
    this.actions = {};
    for (const k of ['stand', 'sit']) { const c = clip(d.clips[k]); if (c) this.actions[k] = this.mixer.clipAction(c); }
    this.actions.stand?.play(); this.mixer.update(0);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    this.s = d.height / (box.max.y - box.min.y);
    this.feet = -box.min.y * this.s;
    this.cx = -((box.min.x + box.max.x) / 2) * this.s; this.cz = -((box.min.z + box.max.z) / 2) * this.s;
    root.scale.multiplyScalar(this.s);
    root.position.set(this.cx, this.feet, this.cz);
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
    this.root = root;
    this.object.add(root);
    this.state = { sitting: !!d.sitting, c: 0 };
    this.apply(true);
    if (!this.hooked) { this.hooked = true; this.clock = new THREE.Clock(); this.app.onFrame(() => this.mixer && this.mixer.update(Math.min(0.1, this.clock.getDelta()))); }
  }

  place() {
    const d = this.data, st = this.state?.sitting;
    const p = st || !d.stand ? { x: d.x, y: d.y, angle: d.angle } : d.stand;
    this.object.position.set(p.x, (d.elevation ?? 0) + (st ? d.sitLift || 0 : 0), p.y);
    this.object.rotation.set(0, -(p.angle ?? 0), 0);
  }

  apply(instant) {
    const sitting = this.state.sitting, a = this.actions;
    const to = sitting ? a.sit : a.stand, from = sitting ? a.stand : a.sit;
    if (to) { to.enabled = true; to.play(); if (from && !instant) to.crossFadeFrom(from, 0.4, false); else if (from) from.stop(); }
    this.place();
  }

  // sitting down: the lid of its toilet (data.toilet = the toilet's id) opens first, then the person sits;
  // standing up: the person stands first, then the lid closes
  toggle() {
    const toilet = this.data.toilet && this.app.items.get(this.data.toilet), doors = this.app.plugin('doors');
    clearTimeout(this.timer);
    const sit = !this.state.sitting;
    const lid = (open) => toilet && doors && doors.setLid(toilet, open);
    if (sit) {
      lid(true);
      this.timer = setTimeout(() => { this.state.sitting = true; this.apply(false); }, toilet ? 550 : 0);
    } else {
      this.state.sitting = false; this.apply(false);
      this.timer = setTimeout(() => lid(false), toilet ? 550 : 0);
    }
  }
}
registry.add(PersonItem);
