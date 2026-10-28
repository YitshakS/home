import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Plugin } from '../core/Plugin.js';

// Walk through the house at eye height: mouse looks around, W/A/S/D or arrows move, Esc leaves.
// Walls stop you, door openings let you through.
export class WalkMode extends Plugin {
  static id = 'walk';
  eye = 160;
  speed = 160; // cm per second
  radius = 20;

  install() {
    const app = this.app;
    this.controls = new PointerLockControls(app.camera, app.renderer.domElement);
    this.keys = new Set();
    this.active = false;
    addEventListener('keydown', (e) => this.active && this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    this.controls.addEventListener('unlock', () => this.exit());
    let last = performance.now();
    app.onFrame(() => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (this.active) this.step(dt);
    });
  }

  enter() {
    const app = this.app, orbit = app.plugin('orbit');
    if (orbit) orbit.controls.enabled = false;
    const t = orbit ? orbit.controls.target : app.houseCenter();
    app.camera.position.set(t.x, this.eye, t.z);
    this.active = true;
    this.controls.lock();
    app.emit('walk', true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    if (this.controls.isLocked) this.controls.unlock();
    const orbit = this.app.plugin('orbit');
    if (orbit) {
      const cam = this.app.camera, dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      orbit.controls.target.copy(cam.position).addScaledVector(dir, 200);
      orbit.controls.enabled = true;
    }
    this.app.emit('walk', false);
  }

  step(dt) {
    const k = this.keys, f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!f && !r) return;
    const cam = this.app.camera, before = cam.position.clone();
    this.controls.moveForward(f * this.speed * dt);
    this.controls.moveRight(r * this.speed * dt);
    if (this.blocked(cam.position.x, cam.position.z)) cam.position.copy(before);
    cam.position.y = this.eye;
  }

  blocked(x, y) {
    for (const w of this.app.walls) {
      const [x0, y0] = w.data.start, [dx, dy] = w.dir(), [u0, u1] = w.extent();
      const u = (x - x0) * dx + (y - y0) * dy, v = -(x - x0) * dy + (y - y0) * dx;
      if (Math.abs(v) > w.data.thickness / 2 + this.radius || u < u0 - this.radius || u > u1 + this.radius) continue;
      const door = w.openings().some((o) => o.bottom < 30 && u > o.from + this.radius && u < o.to - this.radius);
      if (!door) return true;
    }
    return false;
  }
}
