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
      top: { label: 'מלמעלה', pos: [c.x, 2600, c.z + 1], target: [c.x, 0, c.z] },
      kitchen: { label: 'מטבח', pos: [1250, 170, 640], target: [1560, 90, 1000] },
      living: { label: 'סלון ופינת אוכל', pos: [1500, 170, 640], target: [900, 80, 800] },
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
