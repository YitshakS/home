// Structural edits that keep the house consistent: moving a wall drags along the wall ends that touch it,
// the room corners that sit against it and the doors/windows set in it.

const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

// signed position of the wall across its own direction (e.g. the y of an east-west wall)
export function wallOffset(wall) {
  const [x0, y0] = wall.data.start, [dx, dy] = wall.dir();
  return -x0 * dy + y0 * dx;
}

export async function moveWall(app, wall, dist) {
  if (!dist) return;
  const [x0, y0] = wall.data.start, [dx, dy] = wall.dir(), L = wall.length, t = wall.data.thickness;
  const D = [-dy * dist, dx * dist];
  const across = (p) => -(p[0] - x0) * dy + (p[1] - y0) * dx;
  const along = (p) => (p[0] - x0) * dx + (p[1] - y0) * dy;
  const onLine = (p, band) => Math.abs(across(p)) <= band && along(p) >= -t - 1 && along(p) <= L + t + 1;
  const shift = (p) => [p[0] + D[0], p[1] + D[1]];

  for (const w of app.walls) {
    if (w === wall) continue;
    if (onLine(w.data.start, 1)) w.data.start = shift(w.data.start);
    if (onLine(w.data.end, 1)) w.data.end = shift(w.data.end);
  }
  for (const r of app.rooms) {
    let moved = false;
    r.data.points = r.data.points.map((p) => (onLine(p, t / 2 + 1) ? ((moved = true), shift(p)) : p));
    if (moved) await r.rebuild();
  }
  for (const it of app.furniture) {
    const d = it.data;
    if (!d.opening || !onLine([d.x, d.y], t / 2 + 6)) continue;
    d.x += D[0]; d.y += D[1];
    it.place();
  }
  wall.data.start = shift(wall.data.start);
  wall.data.end = shift(wall.data.end);
  await app.rebuildWalls();
  app.emit('change', { item: wall });
}

// set a room's east-west (axis 0) or north-south (axis 1) size by moving the wall on its east / south side;
// a room with no wall there is simply stretched
export async function resizeRoom(app, room, axis, size) {
  const b = room.bounds();
  const cur = axis === 0 ? b.x1 - b.x0 : b.y1 - b.y0;
  const delta = size - cur;
  if (Math.abs(delta) < 0.01) return;
  const edge = axis === 0 ? b.x1 : b.y1;
  const lo = axis === 0 ? b.y0 : b.x0, hi = axis === 0 ? b.y1 : b.x1;
  // every wall standing on that side of the room (a side can be made of several walls with a passage between)
  const walls = app.walls.filter((w) => {
    const [sx, sy] = w.data.start, [ex, ey] = w.data.end, h = w.data.thickness / 2;
    const c = axis === 0 ? sx : sy;
    const parallel = axis === 0 ? near(sx, ex, 0.01) : near(sy, ey, 0.01);
    const a0 = Math.min(axis === 0 ? sy : sx, axis === 0 ? ey : ex), a1 = Math.max(axis === 0 ? sy : sx, axis === 0 ? ey : ex);
    return parallel && near(c - h, edge, 1.5) && a1 > lo + 1 && a0 < hi - 1;
  });
  if (walls.length) {
    // thin floor strips filling a passage in that wall line travel with it
    const h = walls[0].data.thickness / 2, line = edge + h;
    for (const r of app.rooms) {
      if (r === room) continue;
      const strip = r.data.points.every((p) => Math.abs((axis === 0 ? p[0] : p[1]) - line) <= h * 2 + 1 && (axis === 0 ? p[1] : p[0]) >= lo - 1 && (axis === 0 ? p[1] : p[0]) <= hi + 1);
      if (!strip) continue;
      r.data.points = r.data.points.map(([x, y]) => (axis === 0 ? [x + delta, y] : [x, y + delta]));
      await r.rebuild();
    }
    for (const wall of walls) {
      // moveWall measures along the wall's normal; flip the sign when that normal points west / north
      const [dx, dy] = wall.dir();
      const n = axis === 0 ? -dy : dx;
      await moveWall(app, wall, delta * Math.sign(n));
    }
  } else {
    if (axis === 0) room.stretch(size / cur, 1); else room.stretch(1, size / cur);
    await room.rebuild();
    app.emit('change', { item: room });
  }
}
