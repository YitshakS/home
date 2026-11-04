// Copies the house data out of a saved index.html back into data/ (after editing and saving in the browser).
// usage: node tools/pull-data.mjs [path-to-saved-page]   (default: ./index.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(process.argv[2] || path.join(ROOT, 'index.html'), 'utf8');
const grab = (id) => {
  const m = page.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`no ${id} in page`);
  return JSON.parse(m[1]);
};
const house = grab('house-data'), items = grab('items-data');
fs.writeFileSync(path.join(ROOT, 'data', 'house.json'), JSON.stringify(house, null, 1));
fs.writeFileSync(path.join(ROOT, 'data', 'items.json'), JSON.stringify(items, null, 1));
console.log(`data/ updated: ${house.walls.length} walls, ${house.rooms.length} rooms, ${items.length} items`);
