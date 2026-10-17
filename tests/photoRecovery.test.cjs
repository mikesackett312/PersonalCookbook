const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the actual service modules with mocked native boundaries; no device storage touched.
function setup() {
  const recipe = { id: 'r1', name: 'Edited title', notes: 'new notes', rating: '5', favorite: true,
    ingredients: 'edited', instructions: 'edited', createdAt: 'now',
    components: [{ id: 'component', ingredients: [{ text: 'structured' }] }],
    photos: [{ id: 'p1', uri: 'file:///old/photo.jpg' }], mainPhotoId: 'p1', photoUri: 'file:///old/photo.jpg' };
  const backup = { format: 'recipe-box-backup', version: 2, createdAt: '2026-10-02', recipeCount: 1, photoCount: 1,
    recipes: [{ ...recipe, name: 'Old title', notes: 'old notes', photos: [{ id: 'p1', storedPhotoId: 's1' }] }],
    photos: [{ id: 's1', extension: 'jpg', base64: '/9j/AA==' }] };
  const state = { raw: JSON.stringify([recipe]), writes: 0, commits: 0, fail: false, mutate: false };
  const files = new Map();
  const nativeFS = {
    documentDirectory: 'file:///documents/', EncodingType: { Base64: 'base64', UTF8: 'utf8' },
    makeDirectoryAsync: async () => {},
    getInfoAsync: async (uri) => ({ exists: files.has(uri), isDirectory: false }),
    readAsStringAsync: async (uri) => {
      if (uri === 'backup') return JSON.stringify(backup);
      if (!files.has(uri)) throw Error('Missing file');
      return files.get(uri);
    },
    writeAsStringAsync: async (uri, data) => {
      state.writes++;
      if (state.fail) { files.set(uri, 'partial'); throw Error('Disk full'); }
      files.set(uri, data);
      if (state.mutate) state.raw = JSON.stringify([{ ...recipe, notes: 'concurrent edit' }]);
    },
    deleteAsync: async () => { throw Error('Recovery must never delete files'); },
  };
  const storage = { getItem: async () => state.raw, setItem: async (_key, value) => { state.commits++; state.raw = value; } };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const mockedRequire = (name) => {
      if (name === 'expo-file-system/legacy') return nativeFS;
      if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
      if (name === 'expo-document-picker' || name === 'expo-sharing') return {};
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
      throw Error(`Unexpected dependency ${name}`);
    };
    new Function('require', 'module', 'exports', source)(mockedRequire, module, module.exports);
    return module.exports;
  }
  const service = load(path.resolve(__dirname, '../services/photoRecovery.ts'));
  return { recipe, backup, state, files, recover: () => service.recoverPhotosFromBackup('backup') };
}

test('recovers by stable IDs and preserves every non-photo field and main selection', async () => {
  const s = setup(); const report = await s.recover();
  const result = JSON.parse(s.state.raw)[0];
  assert.equal(report.recovered, 1);
  assert.match(result.photos[0].uri, /^file:\/\/\/documents\/recipebox-photos\/recovered-/);
  assert.equal(s.files.get(result.photos[0].uri), s.backup.photos[0].base64);
  assert.deepEqual(result, { ...s.recipe, photos: [{ id: 'p1', uri: result.photos[0].uri }], photoUri: result.photos[0].uri });
});

test('does not match titles when recipe IDs differ', async () => {
  const s = setup(); s.backup.recipes[0].id = 'different'; s.backup.recipes[0].name = s.recipe.name;
  const before = s.state.raw; const report = await s.recover();
  assert.equal(report.skipped.length, 1); assert.equal(s.state.raw, before); assert.equal(s.state.writes, 0);
});

test('keeps an existing durable photo even if backup bytes differ', async () => {
  const s = setup(); const uri = 'file:///documents/recipebox-photos/current.jpg';
  s.state.raw = JSON.stringify([{ ...s.recipe, photos: [{ id: 'p1', uri }], photoUri: uri }]);
  s.files.set(uri, 'CURRENT'); const before = s.state.raw;
  const report = await s.recover();
  assert.equal(report.kept, 1); assert.equal(s.state.raw, before); assert.equal(s.state.writes, 0);
});

test('deduplicates identical payloads and repeat recovery', async () => {
  const s = setup(); const r = JSON.parse(s.state.raw)[0];
  r.photos.push({ id: 'p2', uri: 'file:///old/second.jpg' }); s.state.raw = JSON.stringify([r]);
  s.backup.recipes[0].photos.push({ id: 'p2', storedPhotoId: 's1' });
  const report = await s.recover();
  assert.equal(report.recovered, 2); assert.equal(report.reusedFiles, 1); assert.equal(s.state.writes, 1);
  const before = s.state.raw; await s.recover(); assert.equal(s.state.writes, 1); assert.equal(s.state.raw, before);
});

test('write failure leaves all references unchanged and retry avoids partial file', async () => {
  const s = setup(); s.state.fail = true; const before = s.state.raw;
  await assert.rejects(s.recover(), /Disk full/);
  assert.equal(s.state.raw, before); assert.equal(s.state.commits, 0);
  s.state.fail = false; await s.recover();
  assert.equal(s.files.size, 2); assert.ok([...s.files.values()].includes('partial'));
});

test('does not resurrect removed photo IDs', async () => {
  const s = setup(); s.backup.recipes[0].photos[0].id = 'removed';
  const report = await s.recover(); assert.equal(report.skipped.length, 1); assert.equal(s.state.writes, 0);
});

test('concurrent edit aborts reference commit', async () => {
  const s = setup(); s.state.mutate = true;
  await assert.rejects(s.recover(), /Recipes changed/);
  assert.equal(JSON.parse(s.state.raw)[0].notes, 'concurrent edit'); assert.equal(s.state.commits, 0);
});

test('ambiguous backup IDs and unsafe extensions fail before writes', async () => {
  const s = setup(); s.backup.photos[0].extension = '../../escape';
  await assert.rejects(s.recover(), /invalid photo/); assert.equal(s.state.writes, 0);
  s.backup.photos[0].extension = 'jpg'; s.backup.recipes.push(s.backup.recipes[0]); s.backup.recipeCount++;
  await assert.rejects(s.recover(), /unique IDs/); assert.equal(s.state.writes, 0);
});

test('preserves raw legacy fields without introducing normalization', async () => {
  const s = setup(); const legacy = { id: 'r1', name: 'legacy', photoUri: 'file:///lost.jpg', customField: { untouched: true } };
  s.state.raw = JSON.stringify([legacy]); s.backup.recipes[0].photos[0].id = 'legacy-r1';
  await s.recover(); const result = JSON.parse(s.state.raw)[0];
  assert.deepEqual(result, { ...legacy, photoUri: result.photoUri });
  assert.match(result.photoUri, /recipebox-photos/);
});

test('supports large Base64 photo payloads without regex stack overflow', async () => {
  const s = setup(); s.backup.photos[0].base64 = 'AAAA'.repeat(500000);
  await s.recover(); assert.equal(s.state.writes, 1);
});

test('reuses identical bytes already attached to a different durable photo', async () => {
  const s = setup(); const r = JSON.parse(s.state.raw)[0];
  const uri = 'file:///documents/recipebox-photos/restore-123/photo-0.jpg';
  r.photos.push({ id: 'new-photo', uri }); s.state.raw = JSON.stringify([r]);
  s.files.set(uri, s.backup.photos[0].base64);
  const result = await s.recover(); assert.equal(result.reusedFiles, 1); assert.equal(s.state.writes, 0);
  assert.equal(JSON.parse(s.state.raw)[0].photos[0].uri, uri);
});
