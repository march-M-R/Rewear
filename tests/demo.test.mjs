// Run with: node --test tests/demo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closet, events, createLoader } from './helpers.mjs';
function moduleFrom(path,extras={}) { return createLoader(extras)(path); }
const { makeLook, swapGarment } = moduleFrom('lib/demo.ts');
test('every weekly outfit uses real active garments and has a complete base', () => {
  for (const event of events) {
    const ids = makeLook(closet, event);
    assert.equal(new Set(ids).size, ids.length);
    const garments = ids.map(id => closet.find(g => g.id === id));
    assert.ok(garments.every(g => g && g.status === 'active'));
    assert.ok(garments.some(g => g.category === 'shoes'));
    if (garments.some(g => g.category === 'dress')) {
      assert.ok(!garments.some(g => ['top', 'bottom'].includes(g.category)));
    } else {
      assert.ok(garments.some(g => g.category === 'top'));
      assert.ok(garments.some(g => g.category === 'bottom'));
    }
  }
});
test('remix keeps every locked piece and changes available unlocked categories', () => {
  const ids = makeLook(closet, events[0]);
  const locked = [ids[0], ids[ids.length - 1]];
  const remixed = makeLook(closet, events[0], 1, locked, ids);
  assert.ok(locked.every(id => remixed.includes(id)));
  assert.ok(ids.filter(id => !locked.includes(id)).every(id => !remixed.includes(id)));
  assert.deepEqual(Array.from(makeLook(closet, events[0], 1, ids, ids)), Array.from(ids));
});
test('swap respects locks, category, and excludes unavailable garments', () => {
  const ids = makeLook(closet, events[0]);
  assert.equal(swapGarment(closet, ids, ids[0], [ids[0]]), ids);
  const swapped = swapGarment(closet, ids, ids[0], []);
  assert.notEqual(swapped[0], ids[0]);
  assert.equal(closet.find(g => g.id === swapped[0]).category, closet.find(g => g.id === ids[0]).category);
  const unavailable = closet.map(g => g.id === swapped[0] ? { ...g, status: 'donate' } : g);
  assert.ok(!swapGarment(unavailable, ids, ids[0], []).includes(swapped[0]));
});
test('outfits fall back to available base garments and handle empty closets', () => {
  const dressesOnly = closet.filter(g => !['top', 'bottom'].includes(g.category));
  assert.ok(makeLook(dressesOnly, events[0]).some(id => closet.find(g => g.id === id).category === 'dress'));
  const noDresses = closet.filter(g => g.category !== 'dress');
  assert.ok(makeLook(noDresses, events[4]).some(id => closet.find(g => g.id === id).category === 'bottom'));
  assert.equal(makeLook([], events[0]).length, 0);
});
test('storage seeds five missing keys, then retains counters and intentionally empty arrays', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const { initializeStorage } = moduleFrom('lib/storage.ts', { window: { localStorage: storage } });
  assert.equal(initializeStorage().closet.length, closet.length);
  assert.equal(values.size, 7);
  const edited = JSON.parse(values.get('rewear_closet'));
  edited[0].timesWorn = 3; edited[0].status = 'revamp';
  values.set('rewear_closet', JSON.stringify(edited));
  assert.equal(initializeStorage().closet[0].timesWorn, 3);
  assert.equal(initializeStorage().closet[0].status, 'revamp');
  values.set('rewear_closet', '[]'); values.set('rewear_events', '[]');
  assert.equal(initializeStorage().closet.length, 0);
  assert.equal(initializeStorage().events.length, 0);
});
test('malformed and blocked storage remain usable without erasing saved data', () => {
  let writes = 0;
  const storage = { getItem: () => '{bad', setItem: () => writes++ };
  const { initializeStorage } = moduleFrom('lib/storage.ts', { window: { localStorage: storage } });
  const result = initializeStorage();
  assert.equal(result.closet.length, closet.length); assert.ok(result.warnings.length); assert.equal(writes, 0);
  const denied = moduleFrom('lib/storage.ts', { window: { get localStorage() { throw Error('denied'); } } });
  assert.equal(denied.initializeStorage().closet.length, closet.length);
  assert.equal(moduleFrom('lib/storage.ts').initializeStorage().closet.length, closet.length);
});
