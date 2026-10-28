import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';

// Click an object in the 3D view to select it (outline box + its sizes in the info box).
// In measure mode, two clicks on any surfaces show the straight distance between them.
export class Selection3D extends Plugin {
  static id = 'select3d';

  install() {
    const app = this.app, el = app.renderer.domElement;
    this.ray = new THREE.Raycaster();
    this.box = new THREE.BoxHelper(new THREE.Object3D(), 0xff7a00);
    this.box.visible = false;
    app.helpers.add(this.box);
    this.measuring = false;
    this.points = [];
    this.measureGroup = new THREE.Group();
    app.helpers.add(this.measureGroup);

    let down = null;
    el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return; // a drag, not a click
      if (app.plugin('walk')?.active) return;
      const hit = this.pick(e);
      if (this.measuring) return hit && this.addMeasurePoint(hit.point);
      let o = hit?.object;
      while (o && !o.userData.item) o = o.parent;
      app.select(o ? o.userData.item : null);
    });
    app.on('select', (it) => {
      this.box.visible = !!it;
      if (it) { this.box.setFromObject(it.object); }
    });
    app.on('change', () => { if (app.selected) this.box.setFromObject(app.selected.object); });

    const f = app.panel?.folder('מדידה');
    if (f) {
      f.add(this, 'measuring').name('מדידה בתלת-ממד (2 קליקים)').onChange(() => { this.points = []; });
      f.add({ 'נקה מדידות': () => this.clearMeasures() }, 'נקה מדידות');
      f.close();
    }
  }

  pick(e) {
    const r = this.app.renderer.domElement.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(m, this.app.camera);
    const targets = [this.app.world, this.app.ground].filter(Boolean);
    return this.ray.intersectObjects(targets, true).find((h) => h.object.visible && isShown(h.object));
  }

  addMeasurePoint(p) {
    this.points.push(p.clone());
    const dot = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30, depthTest: false }));
    dot.position.copy(p);
    dot.renderOrder = 10;
    this.measureGroup.add(dot);
    if (this.points.length < 2) return;
    const [a, b] = this.points;
    this.points = [];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xff3b30, depthTest: false }));
    line.renderOrder = 10;
    this.measureGroup.add(line);
    const label = textSprite(`${a.distanceTo(b).toFixed(1)} ס"מ`);
    label.position.copy(a).add(b).multiplyScalar(0.5);
    this.measureGroup.add(label);
  }

  clearMeasures() {
    for (const c of [...this.measureGroup.children]) this.measureGroup.remove(c);
    this.points = [];
  }
}

function isShown(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }

function textSprite(text) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  c.width = 256; c.height = 64;
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#c0262d'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.direction = 'rtl';
  g.fillText(text, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(40, 10, 1);
  s.renderOrder = 11;
  return s;
}
