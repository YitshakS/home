// Entry point: which object classes exist and which features are switched on.
// Add or remove a line here to add or remove a class / feature.
import { App } from './core/App.js';
import { setAssets } from './core/assets.js';

import './structure/Wall.js';
import './structure/Room.js';
import './items/ModelItem.js';
import './items/BarStool.js';
import './items/MissingItem.js';

import { OrbitView } from './plugins/OrbitView.js';
import { WalkMode } from './plugins/WalkMode.js';
import { ControlPanel } from './plugins/ControlPanel.js';
import { Selection3D } from './plugins/Selection3D.js';
import { PlanView2D } from './plugins/PlanView2D.js';
import { Exporter } from './plugins/Exporter.js';
import { Persistence } from './plugins/Persistence.js';

const json = (id) => JSON.parse(document.getElementById(id).textContent);

// the page as it was delivered, so "save" can write it back with new data
window.__ORIGINAL_HTML__ = '<!doctype html>\n' + document.documentElement.outerHTML;

async function main() {
  setAssets(json('assets-data'));
  const app = new App(document.getElementById('app'));
  window.app = app; // handy in the browser console

  // order matters only where a plugin uses another one's buttons/views
  app.use(OrbitView);
  app.use(WalkMode);
  app.use(ControlPanel);
  app.use(Selection3D);
  app.use(PlanView2D);
  app.use(Exporter);
  app.use(Persistence);

  await app.load(json('house-data'), json('items-data'));
  document.getElementById('loading')?.remove();

  if (location.hash === '#selftest') { (await import('./selftest.js')).selftest(app); return; }

  // test hook: "#snap-<view>" renders one frame and freezes it as an image (for headless screenshots)
  const snap = /^#snap-?(\w*)/.exec(location.hash);
  if (snap) {
    await new Promise((r) => setTimeout(r, 3000)); // let textures finish decoding
    if (snap[1] === 'plan') app.plugin('plan').open();
    else if (snap[1]) app.plugin('orbit').view(snap[1]);
    app.renderFrame();
    const img = new Image();
    img.src = app.renderer.domElement.toDataURL('image/png');
    img.className = 'snap';
    document.getElementById('app').appendChild(img);
    document.title = 'ready';
  } else app.start();
}

main().catch((e) => {
  const d = document.getElementById('loading');
  if (d) d.textContent = 'שגיאה בטעינה: ' + e.message;
  console.error(e);
});
