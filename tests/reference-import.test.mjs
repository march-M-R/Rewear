import { test } from 'node:test';
import assert from 'node:assert/strict';
import { closet, createLoader } from './helpers.mjs';

test('reference import appends requested batches once and preserves saved garment history and decisions', () => {
  const original = structuredClone(closet.slice(0, 30));
  original[0].timesWorn = 42;
  original[0].status = 'revamp';
  const values = new Map([['rewear_closet', JSON.stringify(original)]]);
  const window = { localStorage: { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) } };
  const storage = createLoader({window})('lib/storage.ts');
  const imported = storage.initializeStorage().closet;
  assert.equal(imported.length, 48);
  assert.deepEqual(JSON.parse(JSON.stringify(imported.slice(0,30))), original);
  assert.ok(imported.slice(30).every(g => g.status === 'active' && g.timesShown === 0 && g.lastWorn === null));
  assert.equal(new Set(imported.map(g=>g.id)).size,48);
  assert.equal(storage.initializeStorage().closet.length,48);
  storage.saveCloset(imported.slice(0,47));
  assert.equal(createLoader({window})('lib/storage.ts').initializeStorage().closet.length,47);
});
