import { Plugin } from '../core/Plugin.js';
import { download } from './Exporter.js';

// Saving and undo. The page carries its own data, so "save" writes a new בית.html with the edits inside.
// The edited data can also be exported as JSON (tools/pull-data.mjs copies it back into data/).
export class Persistence extends Plugin {
  static id = 'persist';

  install() {
    const app = this.app;
    this.history = [];
    this.dirty = false;
    app.on('loaded', () => { if (!this.history.length) this.snapshot(); });
    let t;
    app.on('change', () => { this.dirty = true; clearTimeout(t); t = setTimeout(() => this.snapshot(), 300); });
    addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); this.undo(); } });
    addEventListener('beforeunload', (e) => { if (this.dirty) e.preventDefault(); });

    const f = app.panel?.folder('שמירה');
    if (!f) return;
    f.add({ 'שמור (בית.html)': () => this.saveHTML() }, 'שמור (בית.html)');
    f.add({ 'בטל פעולה אחרונה (Ctrl+Z)': () => this.undo() }, 'בטל פעולה אחרונה (Ctrl+Z)');
    f.add({ 'ייצוא נתונים (JSON)': () => this.exportJSON() }, 'ייצוא נתונים (JSON)');
  }

  snapshot() {
    const s = JSON.stringify(this.app.serialize());
    if (this.history[this.history.length - 1] !== s) this.history.push(s);
    if (this.history.length > 50) this.history.shift();
  }

  async undo() {
    if (this.history.length < 2) return;
    this.history.pop();
    const { house, items } = JSON.parse(this.history[this.history.length - 1]);
    await this.app.reload(house, items);
  }

  pageWithData() {
    const { house, items } = this.app.serialize();
    const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
    return window.__ORIGINAL_HTML__
      .replace(/(<script id="house-data" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + safe(house) + b)
      .replace(/(<script id="items-data" type="application\/json">)[\s\S]*?(<\/script>)/, (_, a, b) => a + safe(items) + b);
  }

  async saveHTML() {
    const html = this.pageWithData();
    try {
      if (window.showSaveFilePicker) {
        const h = await showSaveFilePicker({ suggestedName: 'בית.html', types: [{ description: 'דף HTML', accept: { 'text/html': ['.html'] } }] });
        const w = await h.createWritable();
        await w.write(html);
        await w.close();
      } else download(new Blob([html], { type: 'text/html' }), 'בית.html');
      this.dirty = false;
    } catch (e) { if (e.name !== 'AbortError') alert('השמירה נכשלה: ' + e.message); }
  }

  exportJSON() {
    const { house, items } = this.app.serialize();
    download(new Blob([JSON.stringify(house, null, 1)], { type: 'application/json' }), 'house.json');
    download(new Blob([JSON.stringify(items, null, 1)], { type: 'application/json' }), 'items.json');
  }
}
