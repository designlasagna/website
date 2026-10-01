/** Focused failure coverage for the reusable live schema verifier. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

import { normalizeVerificationOrigin, verifySchemaHosting } from './verify-schema-hosting.mjs';

const require = createRequire(import.meta.url);
const installedRoot = path.dirname(require.resolve('@designlasagna/schemas/package.json'));

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve({
      server,
      origin: `http://127.0.0.1:${server.address().port}`,
    }));
  });
}

function installedResponse(request, response, alter) {
  const relPath = new URL(request.url, 'http://127.0.0.1').pathname.replace('/schemas/', '');
  const action = alter(relPath);
  if (action) {
    response.writeHead(action.status, { 'content-type': action.contentType ?? 'application/json' });
    response.end(action.body ?? '');
    return;
  }
  const file = path.join(installedRoot, relPath);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(fs.readFileSync(file));
}

for (const [name, alter, expectedKind] of [
  ['wrong HTTP response', () => ({ status: 500 }), 'response'],
  ['missing route', () => ({ status: 404 }), 'missing'],
  ['wrong artifact bytes', () => ({ status: 200, body: '{"not":"the locked artifact"}\n' }), 'content'],
]) {
  test(`reports ${name}`, async (t) => {
    let changed = false;
    const { server, origin } = await startServer((request, response) => installedResponse(request, response, (relPath) => {
      if (!changed && relPath.startsWith('v0.4/')) {
        changed = true;
        return alter();
      }
      return undefined;
    }));
    t.after(() => server.close());

    const result = await verifySchemaHosting({ origin });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((item) => item.kind === expectedKind), JSON.stringify(result.failures));
  });
}

function makeBrokenReferencePackage() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-schema-hosting-'));
  const route = 'v0.4/example.json';
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://designlasagna.recipes/schemas/v0.4/example.json',
    $ref: 'https://designlasagna.recipes/schemas/v0.4/not-exported.json',
  };
  fs.mkdirSync(path.join(root, 'v0.4'));
  fs.writeFileSync(path.join(root, route), `${JSON.stringify(schema)}\n`);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: '@designlasagna/schemas',
    version: '0.4.0-test',
    exports: { './v0.4/example.json': './v0.4/example.json' },
  }));
  return root;
}

test('reports unresolved cross-file references after downloading byte-identical schemas', async (t) => {
  const packageRoot = makeBrokenReferencePackage();
  const { server, origin } = await startServer((request, response) => {
    const filename = path.join(packageRoot, new URL(request.url, 'http://127.0.0.1').pathname.replace('/schemas/', ''));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(fs.readFileSync(filename));
  });
  t.after(() => server.close());

  const result = await verifySchemaHosting({ origin, packageRoot });
  assert.equal(result.ok, false);
  assert.equal(result.verified, 1, 'the artifact itself was exact before compilation');
  assert.ok(
    result.failures.some((item) => item.kind === 'reference' && /can't resolve reference .*not-exported\.json/.test(item.message)),
    JSON.stringify(result.failures),
  );
});

test('requires explicit HTTPS remote origins and permits loopback HTTP only', () => {
  assert.equal(normalizeVerificationOrigin('https://preview.example.test'), 'https://preview.example.test');
  assert.equal(normalizeVerificationOrigin('http://localhost:8080'), 'http://localhost:8080');
  assert.throws(() => normalizeVerificationOrigin('http://preview.example.test'), /must use HTTPS/);
  assert.throws(() => normalizeVerificationOrigin('https://preview.example.test/path'), /must be an origin/);
  assert.throws(() => normalizeVerificationOrigin(), /required/);
});
