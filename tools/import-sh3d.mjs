// One-time migration: reads an extracted Sweet Home 3D project (Home.xml + model/texture entries)
// and writes data/house.json, data/items.json and assets/. Coordinates stay in SH3D plan units:
// centimetres, x = east, y = south, elevation = up.
// usage: node tools/import-sh3d.mjs <extracted-sh3d-dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!SRC) { console.error('usage: node tools/import-sh3d.mjs <extracted-sh3d-dir>'); process.exit(1); }

const xml = fs.readFileSync(path.join(SRC, 'Home.xml'), 'utf8');

const unesc = (s) => s.replace(/&#10;/g, '\n').replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function attrs(tag) {
  const o = {};
  for (const m of tag.matchAll(/([\w:]+)='([^']*)'/g)) o[m[1]] = unesc(m[2]);
  return o;
}
const num = (v, d = 0) => (v === undefined || v === '' ? d : parseFloat(v));
const rgb = (argb) => (argb ? '#' + argb.slice(-6).toLowerCase() : undefined);

// ---------- assets ----------
const modelsOut = path.join(ROOT, 'assets', 'models');
const texOut = path.join(ROOT, 'assets', 'textures');
fs.mkdirSync(modelsOut, { recursive: true });
fs.mkdirSync(texOut, { recursive: true });

const copiedModels = new Map();
function copyModel(ref) {
  if (copiedModels.has(ref)) return copiedModels.get(ref);
  let rel;
  const src = path.join(SRC, ref);
  if (ref.includes('/')) {
    const dir = ref.split('/')[0];
    // (fs.cpSync silently copies nothing on some Windows paths, so copy file by file)
    fs.mkdirSync(path.join(modelsOut, dir), { recursive: true });
    for (const f of fs.readdirSync(path.join(SRC, dir))) fs.copyFileSync(path.join(SRC, dir, f), path.join(modelsOut, dir, f));
    rel = 'models/' + ref;
  } else {
    // single-entry model: an OBJ stored directly as a zip entry
    fs.mkdirSync(path.join(modelsOut, ref), { recursive: true });
    fs.copyFileSync(src, path.join(modelsOut, ref, 'model.obj'));
    rel = `models/${ref}/model.obj`;
  }
  copiedModels.set(ref, rel);
  return rel;
}
const copiedTex = new Map();
function copyTexture(t) {
  const key = t.image;
  if (!copiedTex.has(key)) {
    const slug = (t.catalogId || 'tex' + key).replace(/^.*#/, '').replace(/[^\w-]/g, '_');
    const file = `${slug}.jpg`;
    fs.copyFileSync(path.join(SRC, key), path.join(texOut, file));
    copiedTex.set(key, 'textures/' + file);
  }
  return { image: copiedTex.get(key), name: t.name, width: num(t.width), height: num(t.height) };
}

// ---------- furniture and doors/windows ----------
const items = [];
let group = null;
const pieceRe = /<(furnitureGroup|\/furnitureGroup|pieceOfFurniture|doorOrWindow)\b([^>]*?)(\/?)>([\s\S]*?)(?=<pieceOfFurniture|<doorOrWindow|<furnitureGroup|<\/furnitureGroup|<wall|<room|<dimensionLine|<label|<\/home)/g;
for (const m of xml.matchAll(pieceRe)) {
  const kind = m[1];
  if (kind === 'furnitureGroup') { group = attrs(m[2]).name; continue; }
  if (kind === '/furnitureGroup') { group = null; continue; }
  const a = attrs(m[2]);
  const body = m[3] === '/' ? '' : m[4];
  if (a.visible === 'false') continue;
  const it = {
    id: a.id.replace(/^(pieceOfFurniture|doorOrWindow)-/, ''),
    type: 'model',
    name: a.name,
    model: copyModel(a.model),
    x: num(a.x), y: num(a.y), elevation: num(a.elevation),
    width: num(a.width), depth: num(a.depth), height: num(a.height),
    angle: num(a.angle),
  };
  if (group) it.group = group;
  if (a.modelMirrored === 'true') it.mirrored = true;
  if (a.color) it.color = rgb(a.color);
  if (a.shininess) it.shininess = num(a.shininess);
  const mats = {};
  for (const mm of body.matchAll(/<material\b([^>]*?)(\/>|>([\s\S]*?)<\/material>)/g)) {
    const ma = attrs(mm[1]);
    const o = {};
    if (ma.color) o.color = rgb(ma.color);
    if (ma.shininess) o.shininess = num(ma.shininess);
    const tx = mm[3] && mm[3].match(/<texture\b([^>]*)\/>/);
    if (tx) o.texture = copyTexture(attrs(tx[1]));
    mats[ma.name] = o;
  }
  if (Object.keys(mats).length) it.materials = mats;
  // a texture directly on the piece (not inside a <material>) covers the whole model
  const ptx = body.replace(/<material\b[\s\S]*?(<\/material>|\/>)/g, '').match(/<texture\b([^>]*)\/>/);
  if (ptx) it.texture = copyTexture(attrs(ptx[1]));
  if (kind === 'doorOrWindow') {
    it.opening = {
      // fraction of depth the wall occupies and where it starts, as SH3D stores them
      wallThickness: num(a.wallThickness, 1), wallDistance: num(a.wallDistance, 0),
      bothSides: a.wallCutOutOnBothSides === 'true',
    };
  }
  items.push(it);
}

// ---------- structure ----------
const walls = [...xml.matchAll(/<wall\b([^>]*)\/>/g)].map((m) => {
  const a = attrs(m[1]);
  return {
    id: a.id.replace(/^wall-/, ''),
    start: [num(a.xStart), num(a.yStart)], end: [num(a.xEnd), num(a.yEnd)],
    thickness: num(a.thickness), height: num(a.height, 250),
    joinStart: a.wallAtStart ? a.wallAtStart.replace(/^wall-/, '') : undefined,
    joinEnd: a.wallAtEnd ? a.wallAtEnd.replace(/^wall-/, '') : undefined,
  };
});

const rooms = [...xml.matchAll(/<room\b([^>]*)>([\s\S]*?)<\/room>/g)].map((m) => {
  const a = attrs(m[1]);
  const r = {
    id: a.id.replace(/^room-/, ''), name: a.name || '',
    points: [...m[2].matchAll(/<point\b([^>]*)\/>/g)].map((p) => { const pa = attrs(p[1]); return [num(pa.x), num(pa.y)]; }),
    floorColor: rgb(a.floorColor),
  };
  const ft = m[2].match(/<texture attribute='floorTexture'([^>]*)\/>/);
  if (ft) r.floorTexture = copyTexture(attrs(ft[1]));
  return r;
});
// the room covering the whole plot is the lot, not an interior room
const lotIdx = rooms.reduce((bi, r, i, arr) => (area(r.points) > area(arr[bi].points) ? i : bi), 0);
const lot = rooms.splice(lotIdx, 1)[0];
function area(pts) { let s = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; }); return Math.abs(s / 2); }

const dimensions = [...xml.matchAll(/<dimensionLine\b([^>]*)\/>/g)].map((m) => {
  const a = attrs(m[1]);
  return { start: [num(a.xStart), num(a.yStart)], end: [num(a.xEnd), num(a.yEnd)], offset: num(a.offset) };
});

const notes = (xml.match(/<label\b[\s\S]*?<text>([\s\S]*?)<\/text>/) || [])[1];
const env = attrs(xml.match(/<environment\b([^>]*)>/)[1]);
const level = attrs(xml.match(/<level\b([^>]*)\/>/)[1]);
const gt = xml.match(/<texture attribute='groundTexture'([^>]*)\/>/);

const house = {
  units: 'cm',
  source: 'Sweet Home 3D: lot-plan.sh3d (one-time import)',
  level: { name: level.name, elevation: num(level.elevation), floorThickness: num(level.floorThickness), height: num(level.height) },
  environment: {
    groundColor: rgb(env.groundColor), skyColor: rgb(env.skyColor),
    groundTexture: gt ? copyTexture(attrs(gt[1])) : undefined,
  },
  lot: { name: 'מגרש', points: lot.points, floorTexture: lot.floorTexture, floorColor: lot.floorColor },
  walls, rooms, dimensions,
  notes: notes ? unesc(notes).trim() : '',
};

fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'house.json'), JSON.stringify(house, null, 1));
fs.writeFileSync(path.join(ROOT, 'data', 'items.json'), JSON.stringify(items, null, 1));
console.log(`walls ${walls.length}, rooms ${rooms.length}, items ${items.length} (openings ${items.filter((i) => i.opening).length}), models ${copiedModels.size}, textures ${copiedTex.size}`);
