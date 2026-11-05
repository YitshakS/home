import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { Item } from '../core/Item.js';
import { registry } from '../core/registry.js';
import { assetText, assetURL } from '../core/assets.js';

// A ready-made 3D model (OBJ from Sweet Home 3D, or glTF downloaded later) stretched to exactly
// width x depth x height, standing on its elevation and turned by angle - the same rule Sweet Home 3D uses.
// color replaces every material's colour; materials{name: {color, shininess, texture}} overrides single ones;
// texture{image, width, height} (in cm) covers the whole model.
const cache = new Map(); // model path -> Promise<THREE.Object3D>
const texCache = new Map();

const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => assetURL(url.replace(/^.*?(models\/)/, '$1')));

function loadTexture(spec) {
  if (!texCache.has(spec.image)) {
    const t = new THREE.TextureLoader().load(assetURL(spec.image));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(spec.image, t);
  }
  return texCache.get(spec.image);
}

async function loadModel(path) {
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      if (/\.(glb|gltf)$/i.test(path)) {
        const g = await new GLTFLoader(manager).loadAsync(assetURL(path));
        return g.scene;
      }
      const dir = path.slice(0, path.lastIndexOf('/') + 1);
      const objText = assetText(path);
      const obj = new OBJLoader(manager);
      const lib = objText.match(/^mtllib\s+(.+)$/m);
      if (lib) {
        try {
          const mtl = new MTLLoader(manager);
          mtl.setResourcePath(dir);
          const mc = mtl.parse(assetText(dir + lib[1].trim()), dir);
          mc.preload();
          obj.setMaterials(mc);
        } catch (e) { console.warn('mtl', path, e.message); }
      }
      return obj.parse(objText);
    })());
  }
  return cache.get(path);
}

function toStandard(m, override) {
  const src = Array.isArray(m) ? m[0] : m;
  const shin = override?.shininess ?? 0;
  const s = new THREE.MeshStandardMaterial({
    name: src?.name || '',
    color: src?.color ? src.color.clone() : new THREE.Color(0xcccccc),
    map: src?.map || null,
    transparent: src ? src.transparent || src.opacity < 1 : false,
    opacity: src?.opacity ?? 1,
    roughness: 0.85 - shin * 0.75,
    metalness: 0,
  });
  if (s.map) s.map.colorSpace = THREE.SRGBColorSpace;
  return s;
}

// planar texture coordinates in centimetres, picked per face by its main direction
function boxUV(geom, w, h) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = [a, b, c][k];
      const [u, t] = ay >= ax && ay >= az ? [v.x, v.z] : ax >= az ? [v.z, v.y] : [v.x, v.y];
      uv[(i + k) * 2] = u / w; uv[(i + k) * 2 + 1] = t / h;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export class ModelItem extends Item {
  static type = 'model';
  static label = 'רהיט';
  static defaults = { x: 0, y: 0, elevation: 0, width: 50, depth: 50, height: 50, angle: 0 };
  static editable = [
    ['x', 'מיקום X (מזרח)', -1000, 4000, 0.5],
    ['y', 'מיקום Y (דרום)', -1000, 4000, 0.5],
    ['elevation', 'גובה מהרצפה', -50, 400, 0.5],
    ['width', 'רוחב', 0.1, 1000, 0.1],
    ['depth', 'עומק', 0.1, 1000, 0.1],
    ['height', 'גובה', 0.1, 600, 0.1],
    ['angleDeg', 'סיבוב (מעלות)', -180, 360, 1],
  ];

  get angleDeg() { return +((this.data.angle || 0) * 180 / Math.PI).toFixed(2); }
  set angleDeg(v) { this.data.angle = (v * Math.PI) / 180; }

  async build() {
    const d = this.data;
    const src = await loadModel(d.model);
    const glb = /\.(glb|gltf)$/i.test(d.model);
    src.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(src);
    const size = box.getSize(new THREE.Vector3());
    const fit = new THREE.Matrix4()
      .makeScale((d.mirrored ? -1 : 1) * d.width / (size.x || 1), d.height / (size.y || 1), d.depth / (size.z || 1))
      .multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));

    // data.hinges = [{names:[group names], pivot:[x,y,z] in the model's own coordinates, axis:'x', angle: degrees}]: the named parts of the model turn about the pivot when clicked
    const hingeGroups = [];
    this.hinges = [];
    for (const h of d.hinges || []) {
      const grp = new THREE.Group();
      grp.position.copy(new THREE.Vector3(...h.pivot).applyMatrix4(fit));
      this.object.add(grp);
      const hg = { group: grp, names: new Set(h.names), axis: h.axis || 'x', angle: h.angle ?? 90, c: 0, target: 0, isHinge: true };
      grp.userData.hinge = hg;
      this.hinges.push(hg);
      hingeGroups.push(hg);
    }
    // optional single hinged part (a toilet lid or a door leaf): meshes named lid* are put in a group that turns about data.lid.pivot when clicked (see DoorToggle)
    let lidGroup = null;
    this.lid = null;
    if (d.lid) {
      const p = new THREE.Vector3(...d.lid.pivot).applyMatrix4(fit);
      lidGroup = new THREE.Group();
      lidGroup.position.copy(p);
      this.object.add(lidGroup);
      this.lid = { group: lidGroup, t: 0, target: 0 };
    }

    src.traverse((o) => {
      if (!o.isMesh) return;
      const hg = hingeGroups.find((x) => x.names.has(o.name) || x.names.has(o.parent?.name));
      let g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, o.matrixWorld));
      const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
        const ov = d.materials?.[m?.name];
        // glTF models keep their own materials (gloss, metal, normal maps) unless shininess is set; OBJ models are made matte
        const s = glb && m?.isMeshStandardMaterial ? m.clone() : toStandard(m, ov || (d.shininess !== undefined ? { shininess: d.shininess } : undefined));
        if (glb && m?.isMeshStandardMaterial && d.shininess !== undefined) s.roughness = 0.85 - d.shininess * 0.75;
        if (d.color) { s.color.set(d.color); s.map = null; }
        if (ov?.color) { s.color.set(ov.color); s.map = null; }
        const tex = ov?.texture || d.texture;
        if (tex) { s.map = loadTexture(tex); s.color.set(0xffffff); s.userData.texSize = [tex.width, tex.height]; }
        if (d.mirrored) s.side = THREE.DoubleSide;
        // thin panels (side panels, fronts, handles) often share a plane with the cabinet body behind them;
        // draw them slightly in front so the two surfaces don't flicker into a dark checker pattern
        if (Math.min(d.width, d.depth, d.height) <= 2.5) {
          // constant offset only: a slope-based offset pulls edge-on faces (like a sink floor seen from the side) in front of everything
          s.polygonOffset = true; s.polygonOffsetFactor = 0; s.polygonOffsetUnits = -8;
        }
        return s;
      });
      const tm = mats.find((m) => m.userData.texSize);
      // generated SH3D boxes carry no texture coordinates: lay the texture at its real size in cm
      if (tm && !g.attributes.uv) g = boxUV(g, ...tm.userData.texSize);
      // d.smooth: smooth the shading of rounded parts that the model builds from flat facets
      if (d.smooth) g = toCreasedNormals(g.index ? g.toNonIndexed() : g, ((d.smooth === true ? 60 : d.smooth) * Math.PI) / 180);
      const mesh = new THREE.Mesh(g, mats.length > 1 ? mats : mats[0]);
      if (hg) { mesh.position.copy(hg.group.position).negate(); hg.group.add(mesh); }
      else if (lidGroup && /^lid/.test(o.name)) { mesh.position.copy(lidGroup.position).negate(); lidGroup.add(mesh); }
      else this.object.add(mesh);
    });
  }
}
registry.add(ModelItem);
