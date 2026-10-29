// Runs only with "#selftest" in the address: exercises the editing paths and prints PASS/FAIL lines.
export async function selftest(app) {
  const out = [];
  const ok = (name, cond, info = '') => out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`);
  const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;

  // walking: start from the overview (aimed at the middle of the house, on a wall), press W, and move
  const walk = app.plugin('walk');
  app.plugin('orbit').view('overview');
  walk.enter();
  const p0 = app.camera.position.clone();
  ok('walk starts off walls', !walk.blocked(p0.x, p0.z), `${p0.x.toFixed(0)},${p0.z.toFixed(0)}`);
  // face south, down the hallway
  app.camera.lookAt(p0.x, 160, p0.z + 100);
  app.camera.updateMatrixWorld();
  walk.keys.add('KeyW');
  for (let i = 0; i < 10; i++) walk.step(0.1);
  walk.keys.clear();
  ok('walk moves', app.camera.position.distanceTo(p0) > 20, app.camera.position.distanceTo(p0).toFixed(1));
  ok('walk at eye height', app.camera.position.y === 160);
  walk.exit();

  ok('walls loaded', app.walls.length === 10, app.walls.length);
  ok('rooms loaded', app.rooms.length === 7, app.rooms.length);
  const patch = app.rooms.find((r) => !r.data.name), patchY = patch.bounds().y0;
  ok('furniture loaded', app.furniture.length === 265, app.furniture.length);
  ok('meshes built', app.furniture.every((i) => i.object.children.length > 0));

  const living = app.rooms.find((r) => r.data.name.startsWith('סלון'));
  const bath = app.rooms.find((r) => r.data.name === 'חדר רחצה הורים');
  ok('living size', near(living.roomWidth, 1220) && near(living.roomDepth, 600), `${living.roomWidth}x${living.roomDepth}`);

  // lengthen the living room southwards by 30 cm: the wall between it and the rooms behind moves
  const before = bath.roomDepth;
  await living.setField('roomDepth', 630);
  ok('living resized', near(living.roomDepth, 630), living.roomDepth);
  ok('room behind shrank', near(bath.roomDepth, before - 30), bath.roomDepth);
  ok('passage floor followed', near(patch.bounds().y0, patchY + 30), patch.bounds().y0);

  // move the east outer wall 50 cm east: north and south walls follow, openings on it move
  const east = app.walls.find((w) => w.data.start[0] === 1842.5 && w.data.end[0] === 1842.5);
  const door = app.furniture.find((i) => i.data.name === 'Front door');
  const north = app.walls.find((w) => w.data.start[1] === 512.5 && w.data.end[1] === 512.5);
  const dx = door.data.x;
  await east.setField('position', 1892.5);
  ok('east wall moved', near(east.data.start[0], 1892.5), east.data.start[0]);
  ok('north wall stretched', near(north.data.end[0], 1892.5), north.data.end[0]);
  ok('front door moved', near(door.data.x, dx + 50), door.data.x);
  ok('living wider', near(living.roomWidth, 1270), living.roomWidth);

  // furniture edit and round trip
  const stool = app.furniture.find((i) => i.constructor.type === 'bar-stool');
  stool.data.x += 10;
  await app.update(stool, { rebuild: false });
  const ser = app.serialize();
  ok('serialize', ser.house.walls.length === 10 && ser.items.length === 265 && ser.items.some((i) => i.type === 'bar-stool' && near(i.x, 1560)));

  const persist = app.plugin('persist');
  await new Promise((r) => setTimeout(r, 400));
  const html = persist.pageWithData();
  ok('save page', html.includes('id="house-data"') && html.includes('1892.5') && html.length > 1e6, (html.length / 1e6).toFixed(1) + 'MB');

  await persist.undo();
  ok('undo', app.items.size > 0);

  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = out.join('\n');
  document.body.appendChild(pre);
  document.title = 'selftest-done';
}
