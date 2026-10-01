/**
 * Integration checks for raw v0.4 schemas in the built, locally served site.
 * Run through `npm run check`, which builds dist/ first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySchemaHosting } from './verify-schema-hosting.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const historicalHashes = {
  'dtcg/2025.10/format.json': '32e93b780e4e4bca778d0780cb797a560deedc470c608af16576223f7e42915f',
  'v0.2/cem-extensions.json': '17c9a1a8894acafd9b4f9d39b34b1e22993dd40fe709f5588f1bb2abd5f80a05',
  'v0.2/tokens.json': '883bc9241022cc01b1b4ff3998e32c6d9624ffaec46970c54c975fc9ec6dde4d',
  'v0.2/utilities.json': 'a0c20beffce3eaea0c2d7a583b4a2e006ac7e6373a7a8aac06fa73d430e4f569',
  'v0.3/cem-extensions.json': 'b4060d9853b2a90b72a94aad91cbe76b6f637c9cf0d12bb77c10e2e9d7c1fde1',
  'v0.3/dtcg-extensions.json': '18ea07fe13e5cf611fa22850fa8661839a7e4af9e1b06e68f2096fa496f20186',
  'v0.3/icons.json': '136941def0933d351ce144331ac59f02c9ac1c26567ccf635e4d397edf1d7683',
  'v0.3/tokens.json': '233134afa2a0c51bbaf9a221072a75adcba266b95062fc89a5b16fb75b368cc7',
  'v0.3/utilities.json': '5a52e1831c3583ed588ed3d6e7160c6600f077ff9ca923dab21e0ae9e057ddc9',
};
const historicalPaths = Object.keys(historicalHashes);

function serveDist() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      const filename = path.resolve(distRoot, `.${pathname}`);
      if (!filename.startsWith(`${distRoot}${path.sep}`) || !fs.existsSync(filename)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(fs.readFileSync(filename));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function startSite() {
  assert.ok(fs.existsSync(distRoot), 'dist/ must exist; run npm run build before this integration test');
  const server = await serveDist();
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test('locally served v0.4 schemas pass the same reusable live verifier', async (t) => {
  const { server, baseUrl } = await startSite();
  t.after(() => server.close());

  const result = await verifySchemaHosting({ origin: baseUrl });
  assert.equal(result.ok, true, result.failures.map((item) => item.message).join('\n'));
  assert.equal(result.verified, result.checked);
});

test('existing v0.2, v0.3, and DTCG routes serve their immutable snapshots', async (t) => {
  const { server, baseUrl } = await startSite();
  t.after(() => server.close());

  for (const relPath of historicalPaths) {
    const response = await fetch(`${baseUrl}/schemas/${relPath}`);
    assert.equal(response.status, 200, `${relPath} is retained`);
    const served = Buffer.from(await response.arrayBuffer());
    const snapshot = fs.readFileSync(path.join(projectRoot, 'src', 'schemas', relPath));
    assert.equal(
      createHash('sha256').update(snapshot).digest('hex'),
      historicalHashes[relPath],
      `${relPath} matches its @designlasagna/schemas@0.3.4 historical byte snapshot`,
    );
    assert.deepEqual(served, snapshot, `${relPath} retains its historical bytes`);
  }
});
