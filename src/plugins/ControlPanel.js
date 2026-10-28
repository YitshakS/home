import GUI from 'lil-gui';
import { Plugin } from '../core/Plugin.js';

// The side panel (lil-gui) and the info box of the selected object. Other plugins add their own
// buttons through panel.folder(name) so this file doesn't need to know them.
export class ControlPanel extends Plugin {
  static id = 'panel';

  install() {
    const app = this.app;
    app.panel = this;
    this.gui = new GUI({ title: 'הבית', width: 300 });
    this.gui.domElement.classList.add('rtl-gui');
    this.folders = new Map();

    const views = this.folder('תצוגה');
    const orbit = app.plugin('orbit');
    if (orbit) for (const [k, v] of Object.entries(orbit.views())) views.add({ [v.label]: () => orbit.view(k) }, v.label);
    const walk = app.plugin('walk');
    if (walk) views.add({ 'הליכה בבית (Esc ליציאה)': () => walk.enter() }, 'הליכה בבית (Esc ליציאה)');

    const layers = { רהיטים: true, קירות: true, חדרים: true, צללים: true, 'קווי מגרש': true, שלד: false };
    const lf = this.folder('שכבות');
    const setVis = (types, v) => { for (const it of app.items.values()) if (types(it.constructor.type)) it.object.visible = v; };
    lf.add(layers, 'רהיטים').onChange((v) => setVis((t) => t !== 'wall' && t !== 'room', v));
    lf.add(layers, 'קירות').onChange((v) => setVis((t) => t === 'wall', v));
    lf.add(layers, 'חדרים').onChange((v) => setVis((t) => t === 'room', v));
    lf.add(layers, 'צללים').onChange((v) => { app.sun.castShadow = v; });
    lf.add(layers, 'קווי מגרש').onChange((v) => { app.lotLine.visible = v; });
    lf.add(layers, 'שלד').onChange((v) => app.world.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) m.wireframe = v;
    }));
    lf.close();

    // info box + editable fields of the selected object
    this.info = document.createElement('div');
    this.info.className = 'info-box';
    this.info.hidden = true;
    document.body.appendChild(this.info);
    app.on('select', (it) => this.showSelected(it));
    app.on('change', ({ item } = {}) => { if (item && item === app.selected) this.showSelected(item, true); });
  }

  folder(name) {
    if (!this.folders.has(name)) this.folders.set(name, this.gui.addFolder(name));
    return this.folders.get(name);
  }

  showSelected(it, keepFields) {
    const app = this.app;
    if (!it) { this.info.hidden = true; this.sel?.destroy(); this.sel = null; return; }
    const dims = Object.entries(it.dimensions()).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    this.info.innerHTML = `<b>${it.name}</b><table>${dims}</table><small>מידות בס"מ</small>`;
    this.info.hidden = false;
    if (keepFields && this.sel) { this.sel.controllersRecursive().forEach((c) => c.updateDisplay()); return; }

    this.sel?.destroy();
    const f = (this.sel = this.gui.addFolder(`נבחר: ${it.name}`));
    const proxy = {};
    for (const [key, label, min, max, step] of it.constructor.editable) {
      Object.defineProperty(proxy, key, {
        get: () => (key in it && !(key in it.data) ? it[key] : it.data[key]) ?? 0,
        set: () => {},
      });
      f.add(proxy, key, min, max, step).name(label).onFinishChange(async (v) => {
        if (it.setField && (await it.setField(key, v))) return;
        if (key in it && !(key in it.data)) it[key] = v; else it.data[key] = v;
        await app.update(it);
      });
    }
    for (const key of ['color', 'frameColor', 'fabricColor', 'floorColor']) {
      if (typeof it.data[key] !== 'string') continue;
      const labels = { color: 'צבע', frameColor: 'צבע שלד', fabricColor: 'צבע ריפוד', floorColor: 'צבע רצפה' };
      f.addColor(it.data, key).name(labels[key]).onFinishChange(() => app.update(it));
    }
    if (it.constructor.type !== 'wall' && it.constructor.type !== 'room') {
      f.add({ 'שכפל': async () => { const d = structuredClone(it.data); delete d.id; d.x += 20; d.y += 20; app.select(await app.addItem(d)); } }, 'שכפל');
      f.add({ 'מחק': () => app.removeItem(it) }, 'מחק');
    }
    f.open();
  }
}
