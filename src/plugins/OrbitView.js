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
    app.onFrame(() => this.controls.enabled && this.controls.update());
    app.on('loaded', () => { if (!this.started) { this.started = true; this.view('overview'); } });
  }

  // viewpoints relative to the middle of the house (cm)
  views() {
    const c = this.app.houseCenter();
    return {
      overview: { label: 'מבט כללי', pos: [c.x + 900, 1300, c.z + 1500], target: [c.x, 0, c.z] },
      sofas: { label: 'השוואת ספות', pos: [1175, 650, -300], target: [1175, 0, 250] },
      top: { label: 'מלמעלה', pos: [c.x, 2600, c.z + 1], target: [c.x, 0, c.z] },
      kitchen: { label: 'מטבח', pos: [1000, 180, 700], target: [995, 120, 1125] },
      living: { label: 'סלון ופינת אוכל', pos: [1450, 150, 560], target: [1810, 105, 740] },
    };
  }

  view(name) {
    const v = this.views()[name];
    if (!v) return;
    this.app.plugin('walk')?.exit();
    this.app.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.controls.update();
  }
}
