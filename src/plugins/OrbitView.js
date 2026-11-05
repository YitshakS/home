import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Plugin } from '../core/Plugin.js';

// Rotate / zoom / pan around the house, plus a few fixed viewpoints.
export class OrbitView extends Plugin {
  static id = 'orbit';

  install() {
    const app = this.app;
    this.controls = new OrbitControls(app.camera, app.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.screenSpacePanning = true;
    // left button / one finger + drag: the picture follows the pointer (same distance and angle);
    // right button / two fingers + drag: stay in place and turn, the picture follows the pointer; pinch or the wheel: zoom;
    // middle button + drag: orbit around the point being looked at
    this.controls.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: -1 };
    this.controls.touches = { ONE: -1, TWO: -1 };
    const el = app.renderer.domElement;
    let drag = null, two = null, pending = false;
    const pts = new Map();
    const measure = () => { const a = [...pts.values()]; return { cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; };
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (!this.controls.enabled) return;
      if (e.pointerType === 'touch') {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        two = pts.size === 2 ? measure() : null;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
        return;
      }
      if (e.button !== 0 && e.button !== 2) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, b: e.button };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && pts.has(e.pointerId)) {
        const q = pts.get(e.pointerId), dx = e.clientX - q.x, dy = e.clientY - q.y;
        q.x = e.clientX; q.y = e.clientY;
        if (pts.size === 1) this.pan(dx, dy);
        else if (pts.size === 2 && two && !pending) {
          // both fingers move in separate events: act once per frame, on both, so a parallel drag is not mistaken for a pinch
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            if (pts.size !== 2 || !two) return;
            const m = measure();
            if (Math.abs(m.d - two.d) > 0.5) this.zoom(two.d / m.d);
            this.turn(m.cx - two.cx, m.cy - two.cy);
            two = m;
          });
        }
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.b === 0) this.pan(dx, dy); else this.turn(dx, dy);
    });
    const end = (e) => {
      if (pts.delete(e.pointerId)) two = pts.size === 2 ? measure() : null;
      if (drag && e.pointerId === drag.id) drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    app.onFrame(() => this.controls.enabled && this.controls.update());
    app.on('loaded', () => { if (!this.started) { this.started = true; this.view('overview'); } });
  }

  // move the camera and its target together, in the screen plane, so that the picture follows the pointer
  pan(dx, dy) {
    const cam = this.app.camera, t = this.controls.target, el = this.app.renderer.domElement;
    cam.updateMatrixWorld();
    const k = (2 * cam.position.distanceTo(t) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / el.clientHeight;
    const v = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(-dx * k)
      .addScaledVector(new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1), dy * k);
    cam.position.add(v);
    t.add(v);
  }

  // move the camera toward / away from the point being looked at (factor < 1 = closer)
  zoom(factor) {
    const cam = this.app.camera, t = this.controls.target;
    const off = cam.position.clone().sub(t).multiplyScalar(factor);
    cam.position.copy(t).add(off);
  }

  // turn the view about the camera's own position; the picture follows the pointer (the camera stays where it is)
  turn(dx, dy) {
    const cam = this.app.camera, t = this.controls.target, up = new THREE.Vector3(0, 1, 0);
    const d = t.clone().sub(cam.position), len = d.length();
    d.applyAxisAngle(up, dx * 0.004);
    const pitched = d.clone().applyAxisAngle(d.clone().cross(up).normalize(), dy * 0.004);
    // keep looking a little downward (the orbit controls do not allow a level view) and never over the top
    if (pitched.y / len <= -0.0157 && Math.abs(pitched.y / len) < 0.99999) d.copy(pitched);
    t.copy(cam.position).add(d.setLength(len));
  }

  // viewpoints relative to the middle of the house (cm)
  views() {
    const c = this.app.houseCenter();
    return {
      overview: { label: 'מבט כללי', pos: [c.x + 900, 1300, c.z + 1500], target: [c.x, 0, c.z] },
      sofas: { label: 'השוואת ספות', pos: [1175, 650, -650], target: [1175, 0, -100] },
      top: { label: 'מלמעלה', pos: [c.x, 2600, c.z + 1], target: [c.x, 0, c.z] },
      kitchen: { label: 'מטבח', pos: [1000, 180, 450], target: [995, 120, 875] },
      living: { label: 'סלון ופינת אוכל', pos: [1450, 150, 310], target: [1810, 105, 490] },
      toilets: { label: 'השוואת אסלות', pos: [1790, 230, -520], target: [1790, 25, -100] },
      wc: { label: 'שירותי אורחים', pos: [1775, 160, 341], target: [1760, 120, 534], walk: { x: 1775, z: 341, yaw: Math.PI } },
    };
  }

  view(name) {
    const v = this.views()[name];
    if (!v) return;
    // a viewpoint with .walk opens in walking mode (eye-height slider) at that spot
    if (v.walk && this.app.plugin('walk')) { this.app.plugin('walk').enter(v.walk); return; }
    this.app.plugin('walk')?.exit();
    this.app.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.controls.update();
  }
}
