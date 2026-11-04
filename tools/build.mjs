// Packs everything into one self-contained page: index.html (opens with a double click, works offline).
// usage: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);

const bundle = await esbuild.build({
  entryPoints: [rel('src', 'main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2022', charset: 'utf8',
});

// every file under assets/ : text files as text, images as data URLs
const assets = {};
const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp', '.glb': 'model/gltf-binary' };
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    const key = path.relative(rel('assets'), full).split(path.sep).join('/');
    const ext = path.extname(e.name).toLowerCase();
    assets[key] = types[ext] ? `data:${types[ext]};base64,${fs.readFileSync(full).toString('base64')}` : fs.readFileSync(full, 'utf8');
  }
})(rel('assets'));

const safe = (s) => s.replace(/</g, '\\u003c');
const house = JSON.parse(fs.readFileSync(rel('data', 'house.json'), 'utf8'));
const items = JSON.parse(fs.readFileSync(rel('data', 'items.json'), 'utf8'));
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const page = fs.readFileSync(rel('src', 'page.html'), 'utf8')
  .replace('__HOUSE__', () => safe(JSON.stringify(house)))
  .replace('__ITEMS__', () => safe(JSON.stringify(items)))
  .replace('__ASSETS__', () => safe(JSON.stringify(assets)))
  .replace('__BUNDLE__', () => js);

fs.writeFileSync(rel('index.html'), page);
console.log(`index.html: ${(page.length / 1048576).toFixed(1)} MB, ${items.length} items, ${Object.keys(assets).length} asset files`);
