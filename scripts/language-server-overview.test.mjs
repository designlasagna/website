import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, 'dist', rel), 'utf8');
const overview = read('docs/language-server/index.html');
const setup = read('docs/language-server/setup/index.html');
const ids = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const setupSectionIds = [...fs.readFileSync(path.join(root, 'src/content/docs/language-server/setup/index.njk'), 'utf8')
  .split('---')[1].matchAll(/href: "#([^"]+)"/g)].map((m) => m[1]);

test('overview has its sections, tool-page link and setup anchors', () => {
  for (const id of ['how-it-works', 'get-started', 'requirements']) assert.ok(overview.includes(`id="${id}"`), id);
  assert.equal((overview.match(/href="\/tools\/language-server\/"/g) || []).length, 1, 'tool page linked once');
  assert.ok(overview.includes('href="/docs/schemas/"'));
  assert.ok(overview.includes('class="tool-card"'));
  for (const m of overview.matchAll(/href="\/docs\/language-server\/setup\/#([^"]+)"/g)) {
    assert.ok(setup.includes(`id="${m[1]}"`), `setup anchor ${m[1]} missing`);
  }
  assert.ok(overview.includes('/docs/language-server/setup/#install'));
  assert.ok(overview.includes('/docs/language-server/setup/#configure'));
  assert.ok(overview.includes('/docs/language-server/setup/#troubleshoot'));
});

test('overview and setup share no ids', () => {
  const setupIds = new Set(ids(setup));
  const shared = ids(overview).filter((id) => id !== 'main' && setupIds.has(id));
  assert.deepEqual(shared, []);
});

test('hash-forward script lists every setup section id and forwards only those', () => {
  const script = overview.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const id of setupSectionIds) assert.ok(script.includes(`"${id}"`), `script lacks ${id}`);
  const run = (hash) => {
    let target = null;
    vm.runInNewContext(script, { location: { hash, replace: (u) => { target = u; } } });
    return target;
  };
  for (const id of setupSectionIds) assert.equal(run(`#${id}`), `/docs/language-server/setup/#${id}`);
  assert.equal(run('#how-it-works'), null);
  assert.equal(run(''), null);
});
