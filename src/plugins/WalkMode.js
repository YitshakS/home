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
    const app = this.app, el = app.renderer.domElement;
    this.controls = new PointerLockControls(app.camera, el);
    this.keys = new Set();
    this.active = false;
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') { this.exit(); return; }
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    // Esc inside pointer lock only releases the mouse; keep walking with the keys, a click locks again
    this.controls.addEventListener('lock', () => this.showHint());
    this.controls.addEventListener('unlock', () => this.showHint());
    document.addEventListener('pointerlockerror', () => this.showHint());
    el.addEventListener('click', () => { if (this.active && !this.controls.isLocked) this.controls.lock(); });

    this.hint = document.createElement('div');
    this.hint.className = 'walk-hint';
    this.hint.hidden = true;
    document.body.appendChild(this.hint);

    let last = performance.now();
    app.onFrame(() => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (this.active) this.step(dt);
    });
  }

  showHint() {
    this.hint.hidden = !this.active;
    this.hint.innerHTML = this.controls.isLocked
      ? 'הזזת העכבר – הסתכלות · W A S D או חצים – הליכה · Esc – שחרור העכבר'
      : 'לחץ על המסך כדי להסתכל עם העכבר · W A S D או חצים – הליכה · <button>יציאה מהליכה</button>';
    this.hint.querySelector('button')?.addEventListener('click', () => this.exit());
  }

  enter() {
    const app = this.app, orbit = app.plugin('orbit'), cam = app.camera;
    if (orbit) orbit.controls.enabled = false;
    // start where the view was aimed, or in the middle of the biggest room if that's outside the house
    const t = orbit ? orbit.controls.target.clone() : app.houseCenter();
    let p = [t.x, t.z];
    const inRoom = app.rooms.some((r) => inside(r.data.points, p));
    const farView = cam.position.distanceTo(t) > 1000; // looking at the whole house from outside
    if (!inRoom || farView) {
      const big = app.rooms.reduce((a, b) => (b.area() > a.area() ? b : a));
      const b = big.bounds();
      p = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    }
    // step off a wall if the start point is on one
    for (let r = 0; this.blocked(p[0], p[1]) && r < 300; r += 10) {
      const found = [[r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dy]) => [p[0] + dx, p[1] + dy]).find((q) => !this.blocked(q[0], q[1]));
      if (found) { p = found; break; }
    }
    // look level, in the direction the camera was facing
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    cam.position.set(p[0], this.eye, p[1]);
    cam.lookAt(cam.position.clone().add(dir.normalize()));
    this.active = true;
    this.controls.lock();
    this.showHint();
    app.emit('walk', true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    if (this.controls.isLocked) this.controls.unlock();
    this.hint.hidden = true;
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
    if (this.blocked(cam.position.x, cam.position.z) && !this.blocked(before.x, before.z)) cam.position.copy(before);
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

function inside(pts, [x, y]) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
