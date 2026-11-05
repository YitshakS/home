import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';

// Walk through the house at eye height. The mouse cursor stays visible: drag with the mouse (or a finger) to look around,
// the wheel or W/A/S/D / arrows move you, Esc leaves. Walls stop you, door openings let you through.
export class WalkMode extends Plugin {
  static id = 'walk';
  eye = 160;
  speed = 160; // cm per second
  radius = 20;
  wheelStep = 0.6; // cm of walking per wheel unit (one notch is about 100 units)
  yaw = 0;
  pitch = 0;

  install() {
    const app = this.app, el = app.renderer.domElement;
    this.keys = new Set();
    this.active = false;
    // capture phase: the side panel stops key events from its focused button reaching the page
    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') { this.exit(); return; }
      if (!MOVE_KEYS.has(e.code)) return;
      e.preventDefault();
      const fresh = !this.keys.has(e.code);
      this.keys.add(e.code);
      // a short tap is released before the next frame: take one step right away
      if (fresh) this.step(0.08);
    }, true);
    addEventListener('keyup', (e) => this.keys.delete(e.code), true);

    // looking around: press and drag on the picture (the scene follows the pointer, like street view)
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (!this.active || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      this.look(this.yaw + dx * 0.004, this.pitch + dy * 0.004);
    });
    const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; el.style.cursor = ''; } };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.style.touchAction = 'none';
    // the wheel walks forward and back
    el.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.walk(-e.deltaY * this.wheelStep, 0);
    }, { passive: false });

    this.hint = document.createElement('div');
    this.hint.className = 'walk-hint';
    this.hint.hidden = true;
    document.body.appendChild(this.hint);

    // vertical eye-height slider (cm), shown only in walk mode
    this.heightBox = document.createElement('div');
    this.heightBox.className = 'walk-height';
    this.heightBox.hidden = true;
    this.heightBox.innerHTML = '<span>גובה עיניים</span><span class="mx">250</span><input type="range" min="0" max="250" step="5" orient="vertical"><span>0</span><b></b>';
    this.heightInput = this.heightBox.querySelector('input');
    this.heightLabel = this.heightBox.querySelector('b');
    this.heightInput.addEventListener('input', () => this.setEye(+this.heightInput.value));
    this.heightInput.addEventListener('change', () => this.heightInput.blur());
    document.body.appendChild(this.heightBox);

    let last = performance.now();
    app.onFrame(() => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (this.active) this.step(dt);
    });
  }

  setEye(v) {
    this.eye = v;
    this.heightInput.value = v;
    this.heightLabel.textContent = v + ' ס"מ';
    if (this.active) this.app.camera.position.y = v;
  }

  look(yaw, pitch) {
    this.yaw = yaw;
    this.pitch = Math.max(-1.2, Math.min(1.2, pitch));
    this.app.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  showHint() {
    this.hint.hidden = !this.active;
    this.hint.innerHTML = 'גרירה בעכבר – הסתכלות · גלגלת או W A S D או חצים – הליכה · <button>יציאה מהליכה</button>';
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
    dir.normalize();
    cam.position.set(p[0], this.eye, p[1]);
    this.look(Math.atan2(-dir.x, -dir.z), 0);
    document.activeElement?.blur();
    this.active = true;
    this.heightBox.hidden = false;
    // the slider runs from the floor (0) to the ceiling (the tallest wall); 160 cm is the default eye height of an average adult
    const ceil = Math.max(...app.walls.map((w) => w.data.height), 250);
    this.heightInput.max = ceil;
    this.heightBox.querySelector('.mx').textContent = ceil;
    this.setEye(Math.min(this.eye, ceil));
    this.showHint();
    app.emit('walk', true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.keys.clear();
    this.hint.hidden = true;
    this.heightBox.hidden = true;
    this.app.renderer.domElement.style.cursor = '';
    const orbit = this.app.plugin('orbit');
    if (orbit) {
      const cam = this.app.camera, dir = new THREE.Vector3();
      cam.getWorldDirection(dir);
      orbit.controls.target.copy(cam.position).addScaledVector(dir, 200);
      orbit.controls.enabled = true;
    }
    this.app.emit('walk', false);
  }

  // walk forward (f) and sideways (r) by that many cm, in small steps so thin walls can't be jumped; stops at a wall
  walk(f, r) {
    const cam = this.app.camera, dist = Math.hypot(f, r);
    if (!dist) return;
    const n = Math.ceil(dist / 8), sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const dx = (-sy * f + cy * r) / n, dz = (-cy * f - sy * r) / n;
    for (let i = 0; i < n; i++) {
      const x = cam.position.x + dx, z = cam.position.z + dz;
      if (this.blocked(x, z) && !this.blocked(cam.position.x, cam.position.z)) break;
      cam.position.x = x; cam.position.z = z;
    }
    cam.position.y = this.eye;
  }

  step(dt) {
    const k = this.keys, f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!f && !r) return;
    this.walk(f * this.speed * dt, r * this.speed * dt);
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

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function inside(pts, [x, y]) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
