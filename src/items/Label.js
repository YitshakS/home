import * as THREE from 'three';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';

// A text tag that always faces the viewer (a sprite), e.g. the colour names next to the window frames.
// width / height are in cm; text is drawn on a small canvas, right-to-left.
export class Label extends Item {
  static type = 'label';
  static label = 'תווית טקסט';
  static defaults = { x: 0, y: 0, elevation: 150, width: 90, depth: 1, height: 22, text: '', swatch: '' };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['elevation', 'גובה מהרצפה', -50, 400, 1],
  ];

  build() {
    const { text, swatch, width, height } = this.data;
    const c = document.createElement('canvas');
    c.width = 512; c.height = Math.round(512 * height / width);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 4, c.height * 0.3); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 3; g.stroke();
    if (swatch) { g.fillStyle = swatch; g.beginPath(); g.arc(c.height * 0.55, c.height / 2, c.height * 0.28, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = '#111'; g.font = `bold ${Math.round(c.height * 0.5)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText(text, c.width * (swatch ? 0.58 : 0.5), c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(width, height, 1);
    s.renderOrder = 10;
    s.userData.shared = false;
    this.object.add(s);
  }

  place() {
    const d = this.data;
    this.object.position.set(d.x, d.elevation, d.y);
  }
}
registry.add(Label);
