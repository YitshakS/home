import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';

// Click (or tap) a door to open or close it: the door swings 90 degrees around its hinge.
// Per door, data.hinge says which end of the door is the hinge (-1 or 1 along the door's own x axis, default -1) and
// data.swing says which way it opens (-1 towards the door's local -z, 1 towards local +z, default 1).
// The open/closed state is only in the page (not saved in the data).
export class DoorToggle extends Plugin {
  static id = 'doors';
  static isDoor = (it) => it.data?.type === 'model' && /^(Front door|Door)$/.test(it.data.name || '');
  duration = 0.45; // seconds

  install() {
    const app = this.app, el = app.renderer.domElement;
    this.ray = new THREE.Raycaster();
    this.moving = new Set();
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved < 6 && dt < 500) this.click(e);
    });
    app.onFrame(() => this.update());
  }

  click(e) {
    const app = this.app, el = app.renderer.domElement, r = el.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), app.camera);
    // a hidden layer (a hidden parent) must not catch clicks
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const hit = this.ray.intersectObjects(app.world.children, true).find((h) => h.object.isMesh && shown(h.object));
    if (!hit) return;
    for (let o = hit.object; o; o = o.parent) {
      // a separately hinged part (toilet lid or seat): turn just that part
      const hg = o.userData?.hinge;
      if (hg) { hg.target = hg.target ? 0 : 1; this.moving.add(hg); return; }
      const it = o.userData?.item;
      if (it) {
        if (it.mixer && it.toggle) it.toggle();
        else if (DoorToggle.isDoor(it)) this.toggle(it);
        else if (it.lid && !this.person(it)) this.toggleLid(it); // a toilet with a person shown is moved by the person
        return;
      }
    }
  }

  // the person (if shown) that uses this toilet
  person(toilet) {
    for (const p of this.app.items.values()) if (p.data.type === 'person' && p.data.toilet === toilet.id && p.object.visible) return p;
    return null;
  }

  // open (true) or close (false) a toilet's own lid
  setLid(it, open) {
    if (!it.lid) return;
    it.lid.target = open ? 1 : 0;
    this.moving.add(it);
  }

  toggle(it) {
    if (!it.door) {
      const d = it.data, s = d.hinge ?? -1, sw = d.swing ?? 1, base = -(d.angle || 0), w = d.width;
      const c = Math.cos(base), sn = Math.sin(base);
      // hinge in the plan: the door's centre plus half its width along its own x axis (turned by the base rotation)
      const hx = it.object.position.x + (c * s * w) / 2, hz = it.object.position.z - (sn * s * w) / 2;
      it.door = { t: 0, target: 0, base, hx, hz, px: it.object.position.x, pz: it.object.position.z, phi: sw * s * (Math.PI / 2) };
    }
    it.door.target = it.door.target ? 0 : 1;
    this.moving.add(it);
  }

  // a hinged lid (data.lid = {pivot, angle in degrees}) opens and closes about the x axis through its pivot
  toggleLid(it) {
    it.lid.target = it.lid.target ? 0 : 1;
    this.moving.add(it);
  }

  update() {
    if (!this.moving.size) return;
    const now = performance.now(), dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0.016;
    this.last = now;
    for (const it of [...this.moving]) {
      if (it.isHinge) {
        const st = dt / this.duration;
        it.c = it.target > it.c ? Math.min(it.target, it.c + st) : Math.max(it.target, it.c - st);
        it.group.rotation[it.axis] = (it.angle * Math.PI / 180) * (it.c * it.c * (3 - 2 * it.c));
        if (it.c === it.target) this.moving.delete(it);
        continue;
      }
      if (it.lid && !it.door) {
        const l = it.lid, st = dt / this.duration;
        l.t = l.target > l.t ? Math.min(l.target, l.t + st) : Math.max(l.target, l.t - st);
        l.group.rotation[it.data.lid.axis || 'x'] = ((it.data.lid.angle || 100) * Math.PI / 180) * (l.t * l.t * (3 - 2 * l.t));
        if (l.t === l.target) this.moving.delete(it);
        continue;
      }
      const d = it.door, step = dt / this.duration;
      d.t = d.target > d.t ? Math.min(d.target, d.t + step) : Math.max(d.target, d.t - step);
      const phi = d.phi * (d.t * d.t * (3 - 2 * d.t)); // eased
      const rx = d.px - d.hx, rz = d.pz - d.hz, c = Math.cos(phi), s = Math.sin(phi);
      it.object.position.x = d.hx + rx * c + rz * s;
      it.object.position.z = d.hz - rx * s + rz * c;
      it.object.rotation.y = d.base + phi;
      if (d.t === d.target) this.moving.delete(it);
    }
    if (!this.moving.size) this.last = 0;
  }
}
