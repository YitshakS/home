// Assets are embedded in the built page as one JSON map: path -> text (OBJ/MTL) or data URL (images).
let map = {};

export function setAssets(m) { map = m || {}; }

export function assetText(path) {
  const v = map[path];
  if (v === undefined) throw new Error(`missing asset ${path}`);
  return v;
}

// URL for an image (data URL); unknown paths are returned unchanged
export function assetURL(path) {
  const clean = path.replace(/\\/g, '/').replace(/^\.\//, '');
  return map[clean] ?? path;
}

export function hasAsset(path) { return path in map; }
