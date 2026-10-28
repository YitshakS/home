import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { registry } from './registry.js';
import { assetURL } from './assets.js';

// Owns the renderer, the scene and the list of items. It only knows the Item and Plugin
// interfaces; every concrete kind of object and every feature is registered from outside.
export class App extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.items = new Map();          // id -> Item (walls, rooms, furniture)
    this.house = null;               // structure data that isn't an item (lot, notes, dimensions...)
    this.plugins = new Map();
    this.frameHooks = new Set();
    this.selected = null;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 5, 60000);
    this.world = new THREE.Group();   // everything built from data lives here
    this.scene.add(this.world);
    this.helpers = new THREE.Group(); // selection boxes, measure lines... (never exported)
    this.scene.add(this.helpers);

    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  // ---------- plugins ----------
  use(PluginClass) {
    const p = new PluginClass(this);
    this.plugins.set(PluginClass.id, p);
    p.install();
    return p;
  }
  plugin(id) { return this.plugins.get(id); }

  onFrame(fn) { this.frameHooks.add(fn); return () => this.frameHooks.delete(fn); }
  emit(name, detail) { this.dispatchEvent(new CustomEvent(name, { detail })); }
  on(name, fn) { this.addEventListener(name, (e) => fn(e.detail)); }

  // ---------- data ----------
  async load(house, items) {
    this.house = house;
    if (!this.sun) this.buildEnvironment();
    const structure = [
      ...house.rooms.map((r) => ({ ...r, type: 'room' })),
      ...house.walls.map((w) => ({ ...w, type: 'wall' })),
    ];
    const all = [...structure, ...items];
    const created = all.map((d) => this.createItem(d));
    // furniture first: walls need to know where the doors and windows are
    const order = (it) => (it.constructor.type === 'wall' ? 1 : 0);
    for (const it of created.sort((a, b) => order(a) - order(b))) await it.rebuild();
    this.emit('loaded');
  }

  // replace everything (used by undo); camera and panels stay as they are
  async reload(house, items) {
    for (const it of [...this.items.values()]) { it.clear(); this.world.remove(it.object); }
    this.items.clear();
    const sel = this.selected?.id;
    this.selected = null;
    await this.load(house, items);
    this.select(sel ? this.items.get(sel) || null : null);
    this.emit('change', {});
  }

  createItem(data) {
    const Cls = registry.get(data.type) || registry.get('missing');
    if (!data.id) data.id = crypto.randomUUID();
    const it = new Cls(this, data);
    this.items.set(it.id, it);
    this.world.add(it.object);
    return it;
  }

  async addItem(data) {
    const it = this.createItem(data);
    await it.rebuild();
    this.emit('change', { item: it });
    return it;
  }

  removeItem(it) {
    it.clear();
    this.world.remove(it.object);
    this.items.delete(it.id);
    if (this.selected === it) this.select(null);
    if (it.data.opening) this.rebuildWalls();
    this.emit('change', { item: it, removed: true });
  }

  byType(type) { return [...this.items.values()].filter((i) => i.constructor.type === type); }
  get walls() { return this.byType('wall'); }
  get rooms() { return this.byType('room'); }
  get furniture() { return [...this.items.values()].filter((i) => !['wall', 'room'].includes(i.constructor.type)); }

  // call after changing an item's data
  async update(it, { rebuild = true } = {}) {
    if (rebuild) await it.rebuild(); else it.place();
    if (it.data.opening || it.constructor.type === 'wall') await this.rebuildWalls();
    this.emit('change', { item: it });
  }

  async rebuildWalls() { for (const w of this.walls) await w.rebuild(); }

  select(it) {
    this.selected = it;
    this.emit('select', it);
  }

  serialize() {
    const structureTypes = ['wall', 'room'];
    const strip = (d) => { const { type, ...rest } = d; return rest; };
    const house = {
      ...this.house,
      rooms: this.rooms.map((r) => strip(r.data)),
      walls: this.walls.map((w) => strip(w.data)),
    };
    const items = [...this.items.values()].filter((i) => !structureTypes.includes(i.constructor.type)).map((i) => i.data);
    return { house, items };
  }

  // ---------- scene ----------
  buildEnvironment() {
    const env = this.house.environment || {};
    this.scene.background = new THREE.Color(env.skyColor || '#cce4fc');

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 1.1);
    this.scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e5, 2.2));
    const c = this.houseCenter();
    sun.position.set(c.x - 900, 1800, c.z - 1200);
    sun.target.position.copy(c);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -1400; sc.right = 1400; sc.top = 1400; sc.bottom = -1400; sc.near = 100; sc.far = 5000;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    this.scene.add(sun, sun.target);

    // ground: grass all around, the lot itself is the same grass
    const tex = env.groundTexture;
    const mat = new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : env.groundColor || '#a8a8a8', roughness: 1 });
    if (tex) {
      const t = new THREE.TextureLoader().load(assetURL(tex.image));
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.repeat.set(8000 / tex.width, 8000 / tex.height);
      mat.map = t;
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(c.x, -1, c.z);
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
    this.ground = ground;

    // lot boundary as a thin line on the grass
    const pts = this.house.lot.points.map(([x, y]) => new THREE.Vector3(x, 0.3, y));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.name = 'lot-boundary';
    this.scene.add(line);
    this.lotLine = line;
  }

  houseCenter() {
    if (!this.house) return new THREE.Vector3();
    const ws = this.house.walls;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const w of ws) for (const [x, y] of [w.start, w.end]) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return new THREE.Vector3((x0 + x1) / 2, 0, (y0 + y1) / 2);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.emit('resize', { w, h });
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.renderFrame();
    };
    loop();
  }

  renderFrame() {
    for (const fn of this.frameHooks) fn();
    this.renderer.render(this.scene, this.camera);
  }
}
