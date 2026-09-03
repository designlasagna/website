/**
 * publish-schemas.test.mjs — focused node:test coverage for the raw-schema
 * publication infrastructure. Uses temporary directories and fixtures only;
 * no network, no npm registry, no writes outside the temp space.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  DEFAULT_BASE_URL,
  expectedSchemaUrl,
  listSchemaFiles,
  main,
  normalizeBaseUrl,
  parseArgs,
  publishSchemas,
  resolveInstalledSource,
} from './publish-schemas.mjs';

const CANNONICAL_BASE = 'https://designlasagna.recipes';
const UPSTREAM_DTCG_ID = 'https://www.designtokens.org/schemas/2025.10/format.json';

function tmpdir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Build a fixture source tree that mirrors the canonical schemas package
 * layout. `idBase` controls the $id origin so both passing and failing
 * $id scenarios can be exercised.
 */
function makeSource({ idBase = CANNONICAL_BASE, name = '@designlasagna/schemas' } = {}) {
  const dir = tmpdir('publish-schemas-src-');
  const write = (rel, value) => {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
    return p;
  };

  const schema = (id) => ({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: id, title: 'fixture' });

  write('v0.2/tokens.json', schema(`${idBase}/schemas/v0.2/tokens.json`));
  write('v0.2/utilities.json', schema(`${idBase}/schemas/v0.2/utilities.json`));
  write('v0.3/tokens.json', schema(`${idBase}/schemas/v0.3/tokens.json`));
  write('v0.3/icons.json', schema(`${idBase}/schemas/v0.3/icons.json`));
  // Vendored upstream DTCG: external $id is intentional and must be accepted.
  write('dtcg/2025.10/format.json', schema(UPSTREAM_DTCG_ID));
  // Non-schema export: must never be copied.
  write('examples/sample.json', { hello: 'world' });
  write('package.json', {
    name,
    version: '9.9.9-fixture',
    exports: {
      './v0.2/tokens.json': './v0.2/tokens.json',
      './v0.2/utilities.json': './v0.2/utilities.json',
      './v0.3/tokens.json': './v0.3/tokens.json',
      './v0.3/icons.json': './v0.3/icons.json',
      './dtcg/2025.10/format.json': './dtcg/2025.10/format.json',
      './examples/*': './examples/*',
      './package.json': './package.json',
    },
  });
  return dir;
}

test('publishes all exported schemas, preserving package-relative paths', () => {
  const source = makeSource();
  const output = path.join(tmpdir('publish-schemas-out-'), 'dist', 'schemas');

  const result = publishSchemas({ source, output });

  assert.deepEqual(
    result.copied,
    [
      'dtcg/2025.10/format.json',
      'v0.2/tokens.json',
      'v0.2/utilities.json',
      'v0.3/icons.json',
      'v0.3/tokens.json',
    ],
  );

  for (const rel of result.copied) {
    const srcBuf = fs.readFileSync(path.join(source, rel));
    const destBuf = fs.readFileSync(path.join(output, rel));
    assert.ok(bufEq(srcBuf, destBuf), `byte-identical copy for ${rel}`);
  }
  assert.equal(fs.existsSync(path.join(output, 'examples')), false, 'examples must not be published');
  assert.equal(fs.existsSync(path.join(output, 'package.json')), false, 'package.json must not be published');
});

test('copies the vendored DTCG schema while exempting it from the $id rule', () => {
  const source = makeSource();
  const output = path.join(tmpdir('publish-schemas-out-'), 'schemas');

  const result = publishSchemas({ source, output });

  const dest = path.join(output, 'dtcg/2025.10/format.json');
  assert.ok(result.copied.includes('dtcg/2025.10/format.json'));
  const copied = JSON.parse(fs.readFileSync(dest, 'utf8'));
  assert.equal(copied.$id, UPSTREAM_DTCG_ID);
});

test('rejects a schema whose $id does not match the deployed /schemas/ URL', () => {
  const source = makeSource({ idBase: 'https://raw.githubusercontent.com/designlasagna/schemas/v0.3.0' });
  const output = path.join(tmpdir('publish-schemas-out-'), 'schemas');

  assert.throws(() => publishSchemas({ source, output }), (err) => {
    assert.match(err.message, /\$id verification failed/);
    assert.match(err.message, /v0\.2\/tokens\.json/);
    assert.match(err.message, /expected \$id: https:\/\/designlasagna\.recipes\/schemas\/v0\.2\/tokens\.json/);
    return true;
  });
  // Validation must happen before any write: the output dir must not exist.
  assert.equal(fs.existsSync(output), false, 'nothing may be written on $id failure');
});

test('accepts a custom --base-url (with trailing slash) for local verification', () => {
  const canonical = 'https://preview.example.test';
  const trailingSlash = 'https://preview.example.test/';
  const source = makeSource({ idBase: canonical });

  assert.equal(normalizeBaseUrl(trailingSlash), canonical);
  assert.equal(
    expectedSchemaUrl(trailingSlash, 'v0.3/tokens.json'),
    'https://preview.example.test/schemas/v0.3/tokens.json',
  );

  const output = path.join(tmpdir('publish-schemas-out-'), 'schemas');
  const result = publishSchemas({ source, output, baseUrl: trailingSlash });
  assert.equal(result.baseUrl, canonical);
  assert.equal(result.copied.length, 5);
});

test('rejects an invalid --base-url', () => {
  assert.throws(() => publishSchemas({ source: makeSource(), output: '/tmp/x', baseUrl: 'not-a-url' }), /invalid --base-url/);
  assert.throws(() => publishSchemas({ source: makeSource(), output: '/tmp/x', baseUrl: 'ftp://nope' }), /http\/https/);
});

test('rejects a missing source directory', () => {
  assert.throws(
    () => publishSchemas({ source: path.join(tmpdir('publish-schemas-missing-'), 'nope'), output: '/tmp/x' }),
    /no such directory/,
  );
});

test('rejects a source that is a file, not a directory', () => {
  const file = path.join(tmpdir('publish-schemas-file-'), 'a.json');
  fs.writeFileSync(file, '{}');
  assert.throws(() => publishSchemas({ source: file, output: '/tmp/x' }), /not a directory/);
});

test('rejects a source that is not the @designlasagna/schemas package', () => {
  const source = makeSource({ name: 'evil/other-package' });
  assert.throws(() => publishSchemas({ source, output: '/tmp/x' }), /not the @designlasagna\/schemas package/);
});

test('rejects a package whose exports escape the source root', () => {
  const dir = tmpdir('publish-schemas-escape-');
  const src = path.join(dir, 'pkg');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(dir, 'outside.json'), '{"$id": "x"}\n');
  fs.writeFileSync(
    path.join(src, 'package.json'),
    JSON.stringify({ name: '@designlasagna/schemas', exports: { './v0.3/outside.json': '../outside.json' } }),
  );
  assert.throws(() => publishSchemas({ source: src, output: '/tmp/x' }), /resolves outside the source root/);
});

test('rejects an exported schema symlink that escapes the source root', () => {
  const dir = tmpdir('publish-schemas-symlink-');
  const src = path.join(dir, 'pkg');
  fs.mkdirSync(path.join(src, 'v0.3'), { recursive: true });
  const outside = path.join(dir, 'outside.json');
  fs.writeFileSync(outside, '{"$id": "x"}\n');
  fs.symlinkSync(outside, path.join(src, 'v0.3/tokens.json'));
  fs.writeFileSync(
    path.join(src, 'package.json'),
    JSON.stringify({
      name: '@designlasagna/schemas',
      exports: { './v0.3/tokens.json': './v0.3/tokens.json' },
    }),
  );
  assert.throws(() => publishSchemas({ source: src, output: '/tmp/x' }), /escapes the source root via symlink/);
});

test('rejects an exported schema file that is missing on disk', () => {
  const source = makeSource();
  fs.rmSync(path.join(source, 'v0.3/icons.json'));
  assert.throws(() => publishSchemas({ source, output: '/tmp/x' }), /not found/);
});

test('rejects an output root nested inside (or identical to) the source', () => {
  const source = makeSource();
  fs.mkdirSync(path.join(source, 'dist'));
  assert.throws(() => publishSchemas({ source, output: path.join(source, 'dist') }), /inside \(or identical to\) the source/);
  assert.throws(() => publishSchemas({ source, output: source }), /inside \(or identical to\) the source/);
});

test('rejects a not-yet-existing output root nested inside the source', () => {
  const source = makeSource();
  const nested = path.join(source, 'does-not-exist-yet', 'out');
  assert.equal(fs.existsSync(nested), false, 'precondition: nested path must not exist');

  assert.throws(
    () => publishSchemas({ source, output: nested }),
    /unsafe output: output root is inside \(or identical to\) the source root/,
  );

  assert.equal(fs.existsSync(nested), false, 'no output directory may be created');
});

test('only the exact vendored file dtcg/2025.10/format.json is $id-exempt', () => {
  const source = makeSource();
  // An EXTRA dtcg schema with an upstream $id is NOT the vendored file and
  // must fail the $id check.
  fs.writeFileSync(
    path.join(source, 'dtcg', '2025.10', 'other.json'),
    JSON.stringify({ $id: UPSTREAM_DTCG_ID }) + '\n',
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  pkg.exports['./dtcg/2025.10/other.json'] = './dtcg/2025.10/other.json';
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  assert.throws(
    () => publishSchemas({ source, output: path.join(tmpdir('publish-schemas-dtcg-'), 'schemas') }),
    (err) => {
      assert.match(err.message, /\$id verification failed/);
      assert.match(err.message, /dtcg\/2025\.10\/other\.json/);
      assert.match(err.message, /expected \$id: https:\/\/designlasagna\.recipes\/schemas\/dtcg\/2025\.10\/other\.json/);
      return true;
    },
  );

  // ...while the SAME extra dtcg schema with the canonical site $id passes,
  // proving the exemption is scoped to exactly dtcg/2025.10/format.json.
  fs.writeFileSync(
    path.join(source, 'dtcg', '2025.10', 'other.json'),
    JSON.stringify({ $id: `${CANNONICAL_BASE}/schemas/dtcg/2025.10/other.json` }) + '\n',
  );
  const output = path.join(tmpdir('publish-schemas-dtcg-'), 'schemas');
  const result = publishSchemas({ source, output });
  assert.ok(result.copied.includes('dtcg/2025.10/other.json'));
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(output, 'dtcg/2025.10/format.json'), 'utf8')).$id,
    UPSTREAM_DTCG_ID,
    'the exact vendored file keeps its upstream $id',
  );
});

test('supports object-valued (conditional) exports by selecting the string default target', () => {
  const source = makeSource();
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  pkg.exports['./v0.3/tokens.json'] = { node: './types/tokens.d.ts', default: './v0.3/tokens.json' };
  pkg.exports['./v0.3/icons.json'] = { default: { default: './v0.3/icons.json' } };
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  const output = path.join(tmpdir('publish-schemas-conditional-'), 'schemas');
  const result = publishSchemas({ source, output });
  assert.ok(result.copied.includes('v0.3/tokens.json'));
  assert.ok(result.copied.includes('v0.3/icons.json'));
  assert.ok(fs.existsSync(path.join(output, 'v0.3/tokens.json')));
});

test('fails clearly when a schema export has no resolvable string target', () => {
  const source = makeSource();
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  pkg.exports['./v0.3/tokens.json'] = { types: './types/tokens.d.ts' }; // no "default"
  fs.writeFileSync(path.join(source, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  assert.throws(
    () => publishSchemas({ source, output: '/tmp/x' }),
    /unresolvable export "\.\/v0\.3\/tokens\.json": expected a string file target/,
  );
});

test('refuses a source with an unusable exports map', () => {
  const dir = tmpdir('publish-schemas-noexports-');
  fs.mkdirSync(path.join(dir, 'v0.2'));
  fs.writeFileSync(path.join(dir, 'v0.2/tokens.json'), '{}\n');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@designlasagna/schemas' }));
  assert.throws(() => publishSchemas({ source: dir, output: '/tmp/x' }), /refusing to guess/);
});

test('listSchemaFiles picks only v0.x / dtcg JSON exports', () => {
  const source = makeSource();
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  const files = listSchemaFiles(source, pkg);
  assert.deepEqual([...files.keys()].sort(), [
    'dtcg/2025.10/format.json',
    'v0.2/tokens.json',
    'v0.2/utilities.json',
    'v0.3/icons.json',
    'v0.3/tokens.json',
  ]);
});

test('parseArgs handles flags, values, help, and errors', () => {
  assert.deepEqual(
    parseArgs(['--source', '/a', '--output', '/b', '--base-url', 'https://x.test']),
    { source: '/a', output: '/b', baseUrl: 'https://x.test', help: false },
  );
  assert.equal(parseArgs(['--help']).help, true);
  assert.throws(() => parseArgs(['--bogus']), /unknown argument/);
  assert.throws(() => parseArgs(['--source']), /requires a value/);
});

test('main() runs end-to-end with explicit --source/--output (local verification flow)', () => {
  const source = makeSource();
  const output = path.join(tmpdir('publish-schemas-main-'), 'dist', 'schemas');
  const originalStdout = process.stdout.write.bind(process.stdout);
  let logged = '';
  process.stdout.write = (chunk) => {
    logged += String(chunk);
    return true;
  };
  try {
    const result = main(['--source', source, '--output', output]);
    assert.equal(result.copied.length, 5);
    assert.match(logged, /Published 5 schema file\(s\) to /);
    assert.ok(fs.existsSync(path.join(output, 'v0.2/tokens.json')));
  } finally {
    process.stdout.write = originalStdout;
  }
});

test('resolveInstalledSource() fails with a clear error for an unresolvable package', () => {
  assert.throws(() => resolveInstalledSource('definitely/not-installed-xyz'), /Cannot find (package|module)/);
});

test('DEFAULT_BASE_URL matches the deployed site origin', () => {
  assert.equal(DEFAULT_BASE_URL, 'https://designlasagna.recipes');
  assert.equal(expectedSchemaUrl(DEFAULT_BASE_URL, 'v0.2/tokens.json'), 'https://designlasagna.recipes/schemas/v0.2/tokens.json');
});

// ---- helpers

function bufEq(a, b) {
  return a.equals(b);
}
