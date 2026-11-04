import { Plugin } from '../core/Plugin.js';
import { moveWall } from '../structure/editing.js';

// Floor plan drawn from the same data: rooms with areas, walls, doors/windows, furniture outlines,
// dimension lines. Edit by dragging (furniture, walls, room corners), measure between any two points,
// and print to PDF.
export class PlanView2D extends Plugin {
  static id = 'plan';

  install() {
    const app = this.app;
    const wrap = (this.wrap = document.createElement('div'));
    wrap.className = 'plan-view';
    wrap.hidden = true;
    wrap.innerHTML = `<div class="plan-bar">
      <button data-mode="edit" class="on">בחירה והזזה</button><button data-mode="measure">מדידה</button>
      <button data-act="fit">התאם למסך</button><button data-act="print">הדפסה / PDF</button><button data-act="close">חזרה לתלת-ממד</button>
      <span class="plan-hint"></span></div><canvas></canvas>`;
    document.body.appendChild(wrap);
    this.canvas = wrap.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.hint = wrap.querySelector('.plan-hint');
    this.mode = 'edit';
    this.measure = null;
    wrap.querySelector('.plan-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.mode) { this.setMode(b.dataset.mode); }
      if (b.dataset.act === 'fit') this.fit();
      if (b.dataset.act === 'print') this.print();
      if (b.dataset.act === 'close') this.close();
    });
    this.bindPointer();
    addEventListener('resize', () => this.isOpen && this.draw());
    addEventListener('keydown', (e) => this.onKey(e));
    app.on('change', () => this.isOpen && this.draw());
    app.on('select', () => this.isOpen && this.draw());
    const f = app.panel?.folder('תצוגה');
    if (f) f.add({ 'תוכנית קומה 2D (עריכה ומדידה)': () => this.open() }, 'תוכנית קומה 2D (עריכה ומדידה)');
  }

  get isOpen() { return !this.wrap.hidden; }
  open() { this.wrap.hidden = false; this.fit(); this.setMode(this.mode); }
  close() { this.wrap.hidden = true; }
  setMode(m) {
    this.mode = m;
    this.wrap.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    this.hint.textContent = m === 'measure'
      ? 'גרור בין שתי נקודות כדי למדוד (נצמד לפינות). '
      : 'לחץ לבחירה, גרור להזזה. חצים: הזזה בס"מ (Shift = 10). Delete: מחיקת רהיט. גלגלת: זום, גרירה ימנית: הזזת התצוגה.';
    this.draw();
  }

  // ---------- view transform ----------
  fit() {
    const pts = this.app.house.lot.points;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight - 44;
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    this.scale = Math.min(w / (bw + 200), h / (bh + 200));
    this.ox = w / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * this.scale;
    this.oy = h / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * this.scale;
    this.draw();
  }
  toScreen([x, y]) { return [x * this.scale + this.ox, y * this.scale + this.oy]; }
  toPlan(sx, sy) { return [(sx - this.ox) / this.scale, (sy - this.oy) / this.scale]; }

  // ---------- drawing ----------
  draw(ctx = this.ctx, forPrint = false) {
    if (!forPrint) {
      const c = this.canvas, dpr = devicePixelRatio || 1;
      c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const app = this.app, S = this.scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const poly = (pts, fill, stroke, lw = 1) => {
      ctx.beginPath();
      pts.forEach((p, i) => { const [x, y] = this.toScreen(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    const text = (s, [x, y], size = 12, color = '#222', bold = false, dir = 'rtl') => {
      ctx.font = `${bold ? 'bold ' : ''}${size * (this.fontScale || 1)}px Arial`;
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = dir;
      ctx.fillText(s, x, y);
    };

    poly(app.house.lot.points, '#eef6e8', '#5c8f45', 1.5);
    for (const r of app.rooms) {
      poly(r.data.points, r.data.floorColor, null);
      if (!r.data.name) continue;
      const b = r.bounds(), c = this.toScreen([(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]);
      const fs = Math.max(9, Math.min(15, S * 22));
      text(r.data.name, [c[0], c[1] - fs], fs, '#1d2b36', true);
      text(`${(r.area() / 10000).toFixed(2)} מ"ר`, c, fs * 0.85, '#33464f');
      text(`${r.roomWidth.toFixed(0)} × ${r.roomDepth.toFixed(0)}`, [c[0], c[1] + fs], fs * 0.8, '#55666e', false, 'ltr');
    }
    for (const it of app.furniture) {
      if (it.data.opening) continue;
      poly(it.footprint(), 'rgba(120,120,120,0.08)', '#9a9a9a', 0.7);
    }
    for (const w of app.walls) poly(w.footprint(), '#3c3f42', null);
    for (const w of app.walls) this.drawOpenings(ctx, w);
    for (const d of app.house.dimensions || []) this.drawDimension(ctx, d.start, d.end, d.offset, '#3b6ea8');

    const sel = app.selected;
    if (sel && !forPrint) {
      poly(sel.footprint(), 'rgba(255,122,0,0.12)', '#ff7a00', 2);
      if (sel.constructor.type === 'room') for (const p of sel.data.points) {
        const [x, y] = this.toScreen(p);
        ctx.fillStyle = '#ff7a00'; ctx.fillRect(x - 4, y - 4, 8, 8);
      }
      if (sel.constructor.type === 'wall') {
        const fp = sel.footprint();
        this.drawDimension(ctx, fp[0], fp[1], -25, '#ff7a00');
      } else if (sel.constructor.type !== 'room') {
        const fp = sel.footprint();
        this.drawDimension(ctx, fp[0], fp[1], -15, '#ff7a00');
        this.drawDimension(ctx, fp[1], fp[2], -15, '#ff7a00');
      }
    }
    if (this.measure && !forPrint) {
      const { a, b } = this.measure;
      this.drawDimension(ctx, a, b, 0, '#d0021b', true);
      const [sx, sy] = this.toScreen(b);
      text(`Δx ${Math.abs(b[0] - a[0]).toFixed(1)}  Δy ${Math.abs(b[1] - a[1]).toFixed(1)}`, [sx, sy + 18], 12, '#d0021b', false, 'ltr');
    }
  }

  drawOpenings(ctx, w) {
    const [x0, y0] = w.data.start, [dx, dy] = w.dir(), h = w.data.thickness / 2;
    const p = (u, v) => this.toScreen([x0 + dx * u - dy * v, y0 + dy * u + dx * v]);
    for (const o of w.openings()) {
      const q = [p(o.from, -h), p(o.to, -h), p(o.to, h), p(o.from, h)];
      ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = '#3c3f42'; ctx.lineWidth = 1;
      if (!o.door) {
        // window or sliding glass: two thin lines along the wall
        for (const v of [-h / 3, h / 3]) { const [a, b] = [p(o.from, v), p(o.to, v)]; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
      } else {
        // door: leaf and quarter swing
        const r = (o.to - o.from) * this.scale, [hx, hy] = p(o.from, h), ang = Math.atan2(dy, dx);
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, r, ang, ang + Math.PI / 2); ctx.closePath();
        ctx.strokeStyle = '#7d8790'; ctx.stroke();
      }
    }
  }

  drawDimension(ctx, a, b, offset, color, bold) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.5) return;
    const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    const A = this.toScreen([a[0] + nx * offset, a[1] + ny * offset]), B = this.toScreen([b[0] + nx * offset, b[1] + ny * offset]);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = bold ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke();
    for (const P of [A, B]) { ctx.beginPath(); ctx.arc(P[0], P[1], 2.5, 0, Math.PI * 2); ctx.fill(); }
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    let ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(ang);
    const k = this.fontScale || 1; ctx.font = `${bold ? 'bold ' : ''}${(bold ? 14 : 11) * k}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const s = L.toFixed(1);
    const tw = ctx.measureText(s).width;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-tw / 2 - 2, -16 * k, tw + 4, 14 * k);
    ctx.fillStyle = color; ctx.fillText(s, 0, -3 * k);
    ctx.restore();
  }

  // ---------- hit testing & snapping ----------
  hit([x, y]) {
    const inside = (pts) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const area = (it) => { const d = it.data; return (d.width || 1e6) * (d.depth || 1e6); };
    const furn = this.app.furniture.filter((it) => inside(it.footprint())).sort((a, b) => area(a) - area(b));
    if (furn.length) return furn[0];
    return this.app.walls.find((w) => inside(w.footprint())) || this.app.rooms.find((r) => inside(r.footprint())) || null;
  }

  snap(p) {
    const tol = 10 / this.scale;
    let best = null, bd = tol;
    const consider = (q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } };
    for (const it of this.app.items.values()) for (const q of it.footprint()) consider(q);
    return best ? [...best] : p;
  }

  // ---------- interaction ----------
  bindPointer() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [px, py] = this.toPlan(e.offsetX, e.offsetY), k = Math.exp(-e.deltaY * 0.0015);
      this.scale *= k;
      this.ox = e.offsetX - px * this.scale; this.oy = e.offsetY - py * this.scale;
      this.draw();
    }, { passive: false });
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      const p = this.toPlan(e.offsetX, e.offsetY);
      if (e.button === 2 || e.button === 1) { drag = { kind: 'pan', sx: e.offsetX, sy: e.offsetY, ox: this.ox, oy: this.oy }; return; }
      if (this.mode === 'measure') { const a = this.snap(p); this.measure = { a, b: a }; drag = { kind: 'measure' }; this.draw(); return; }
      const sel = this.app.selected;
      if (sel?.constructor.type === 'room') {
        const i = sel.data.points.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 8 / this.scale);
        if (i >= 0) { drag = { kind: 'vertex', room: sel, i }; return; }
      }
      const it = this.hit(p);
      this.app.select(it);
      if (!it) return;
      if (it.constructor.type === 'wall') drag = { kind: 'wall', it, start: p, done: 0 };
      else if (it.constructor.type !== 'room') drag = { kind: 'item', it, start: p, x: it.data.x, y: it.data.y };
    });
    c.addEventListener('pointermove', async (e) => {
      if (!drag) return;
      const p = this.toPlan(e.offsetX, e.offsetY), snap = (v) => Math.round(v * 2) / 2;
      if (drag.kind === 'pan') { this.ox = drag.ox + e.offsetX - drag.sx; this.oy = drag.oy + e.offsetY - drag.sy; this.draw(); }
      else if (drag.kind === 'measure') { this.measure.b = this.snap(p); this.draw(); }
      else if (drag.kind === 'item') {
        drag.it.data.x = snap(drag.x + p[0] - drag.start[0]);
        drag.it.data.y = snap(drag.y + p[1] - drag.start[1]);
        drag.it.place(); drag.moved = true; this.draw();
      } else if (drag.kind === 'vertex') {
        drag.room.data.points[drag.i] = this.snap([snap(p[0]), snap(p[1])]);
        drag.moved = true; this.draw();
      } else if (drag.kind === 'wall' && !this.busy) {
        const [dx, dy] = drag.it.dir();
        const want = snap((p[0] - drag.start[0]) * -dy + (p[1] - drag.start[1]) * dx);
        if (want === drag.done) return;
        this.busy = true;
        await moveWall(this.app, drag.it, want - drag.done);
        drag.done = want; this.busy = false;
        this.hint.textContent = `הקיר הוזז ${want.toFixed(1)} ס"מ`;
        this.draw();
      }
    });
    c.addEventListener('pointerup', async () => {
      const d = drag; drag = null;
      if (!d?.moved) return;
      if (d.kind === 'item') await this.app.update(d.it, { rebuild: false });
      if (d.kind === 'vertex') await this.app.update(d.room);
    });
  }

  async onKey(e) {
    if (!this.isOpen) return;
    const it = this.app.selected;
    if (e.key === 'Escape') { this.measure = null; this.draw(); return; }
    if (!it || ['wall', 'room'].includes(it.constructor.type)) return;
    if (e.key === 'Delete') { this.app.removeItem(it); return; }
    const step = e.shiftKey ? 10 : 1;
    const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!mv) return;
    e.preventDefault();
    it.data.x += mv[0]; it.data.y += mv[1];
    await this.app.update(it, { rebuild: false });
  }

  // ---------- print ----------
  print() {
    const keep = [this.scale, this.ox, this.oy], sel = this.app.selected;
    const W = 3508, H = 2480; // A4 landscape at 300 dpi
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const pts = this.app.house.lot.points, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    this.scale = Math.min(W / (Math.max(...xs) - Math.min(...xs) + 300), H / (Math.max(...ys) - Math.min(...ys) + 300));
    this.ox = W / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * this.scale;
    this.oy = H / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * this.scale;
    this.app.selected = null;
    this.fontScale = 3.2;
    this.draw(c.getContext('2d'), true);
    this.fontScale = 1;
    this.app.selected = sel;
    [this.scale, this.ox, this.oy] = keep;
    const win = open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><title>תוכנית קומה</title><style>@page{size:A4 landscape;margin:8mm}body{margin:0}img{width:100%}</style><img src="${c.toDataURL('image/png')}" onload="setTimeout(()=>print(),300)">`);
    win.document.close();
  }
}
