/**
 * Regression tests for the v0.3 → v0.4 migration guide page:
 *
 *   - the guide is published at /docs/schemas/migrate-to-v0.4/ and is a
 *     cross-version guide (no schemaDocVersion frontmatter, so the shared
 *     version nav never targets it);
 *   - every internal link on the page points at a route that exists in the
 *     source tree and no other routes are linked; a docs route only counts
 *     if a real source page (index.njk) backs it — a directory without an
 *     index (e.g. /docs/schemas/v0.4/) is not a route;
 *   - the sidebar and the schema overview both link the guide;
 *   - every docsToc anchor has a matching element id on the page;
 *   - the key migration claims stay in the prose: format version vs package
 *     release, native $schema/schemaVersion format declaration, CEM/DTCG
 *     lifecycle profile opt-in (and its legacy fallback), no automatic
 *     conversion, no universal v0.4 consumer support, and dual support
 *     during the transition.
 *
 * Pure file checks: no build, no network, no installed dependencies beyond the
 * checked-in v0.3 snapshots and the installed @designlasagna/schemas package.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(projectRoot, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(projectRoot, rel));

const GUIDE = 'src/content/docs/schemas/migrate-to-v0.4/index.njk';
const SIDEBAR = 'src/_data/docsNav.json';
const OVERVIEW = 'src/content/docs/schemas/index.njk';
const GUIDE_ROUTE = '/docs/schemas/migrate-to-v0.4/';
const PACKAGE_ROOT = path.join(projectRoot, 'node_modules/@designlasagna/schemas');

const source = read(GUIDE);
const normalized = source.replace(/\s+/g, ' ');

// Internal hrefs expected on the guide, derived from the published docs and
// raw contracts. The test asserts the exact set so the page cannot quietly
// grow stale links or lose a reference.
const V03_DOCS = [
  '/docs/schemas/v0.3/tokens/',
  '/docs/schemas/v0.3/utilities/',
  '/docs/schemas/v0.3/components/',
  '/docs/schemas/v0.3/dtcg-extensions/',
];
const V04_DOCS = [
  '/docs/schemas/',
  '/docs/schemas/v0.4/tokens/',
  '/docs/schemas/v0.4/utilities/',
  '/docs/schemas/v0.4/icons/',
  '/docs/schemas/v0.4/components/',
  '/docs/schemas/v0.4/dtcg-extensions/',
  '/docs/schemas/v0.4/lifecycle/',
];
const V03_RAW = [
  '/schemas/v0.3/tokens.json',
  '/schemas/v0.3/utilities.json',
  '/schemas/v0.3/icons.json',
  '/schemas/v0.3/cem-extensions.json',
  '/schemas/v0.3/dtcg-extensions.json',
];
const V04_RAW = [
  '/schemas/v0.4/tokens.json',
  '/schemas/v0.4/utilities.json',
  '/schemas/v0.4/icons.json',
  '/schemas/v0.4/cem-extensions.json',
  '/schemas/v0.4/dtcg-extensions.json',
  '/schemas/v0.4/lifecycle.json',
];
const EXPECTED_INTERNAL = [...V03_DOCS, ...V04_DOCS, ...V03_RAW, ...V04_RAW].sort();

test('migration guide is published at /docs/schemas/migrate-to-v0.4/', () => {
  assert.ok(exists(GUIDE), 'guide source is missing');
  assert.match(source, /^permalink: \/docs\/schemas\/migrate-to-v0\.4\/$/m);
  // Cross-version guide: it must not masquerade as a single-version
  // reference page (no schemaDocVersion, no shared version nav include).
  assert.ok(!/^schemaDocVersion:/m.test(source), 'guide must not set schemaDocVersion');
  assert.ok(!source.includes('schema-version-nav.njk'), 'guide must not include the shared version nav');
});

test('every internal link on the guide points at a published route, and only those', () => {
  const hrefs = [...new Set([...source.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]))];
  const internal = hrefs
    .filter((href) => href.startsWith('/'))
    .sort();
  assert.deepEqual(internal, EXPECTED_INTERNAL, 'guide internal links drifted from the published routes');
});

test('guide links point at real source pages and raw contract files', () => {
  for (const href of V03_RAW) {
    assert.ok(exists(`src/schemas/v0.3${href.slice('/schemas/v0.3'.length)}`), `missing v0.3 raw contract ${href}`);
  }
  for (const href of V04_RAW) {
    const rel = href.replace(/^\/schemas\/v0\.4\//, '');
    assert.ok(fs.existsSync(path.join(PACKAGE_ROOT, 'v0.4', rel)), `missing v0.4 raw contract ${href}`);
  }
  // A docs route must be backed by an actual source page, not merely by a
  // directory that happens to exist (e.g. /docs/schemas/v0.4/ has child
  // pages but no page of its own).
  for (const href of [...V03_DOCS, ...V04_DOCS]) {
    const page = `src/content${href}index.njk`;
    assert.ok(fs.existsSync(path.join(projectRoot, page)), `missing source page for docs route ${href} (${page})`);
  }
});

test('the sidebar and the schema overview both link the migration guide', () => {
  // The sidebar is rendered from this nav data file (src/_includes/docs.njk).
  const sidebar = read(SIDEBAR);
  assert.ok(
    sidebar.includes(`"href": "${GUIDE_ROUTE}"`),
    'docs sidebar must link the migration guide',
  );
  const overview = read(OVERVIEW);
  assert.ok(
    overview.includes(`<a href="${GUIDE_ROUTE}"`),
    'schema overview must link the migration guide',
  );
});

test('every docsToc anchor on the guide resolves to an element id', () => {
  const frontmatter = source.slice(0, source.indexOf('---', 3));
  const tocHrefs = [...frontmatter.matchAll(/href: "#([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.ok(tocHrefs.length >= 5, 'guide must have a substantial table of contents');
  for (const anchor of tocHrefs) {
    assert.match(source, new RegExp(`id="${anchor}"`), `docsToc anchor #${anchor} has no matching id on the page`);
  }
  for (const id of ['start', 'format-vs-package', 'lifecycle-selection', 'per-contract', 'lifecycle-fragment', 'unchanged', 'checklist', 'references']) {
    assert.match(source, new RegExp(`id="${id}"`), `section id "${id}" is missing`);
  }
});

test('key migration claims stay in the guide prose', () => {
  const claims = [
    // Format version vs npm package release.
    'v0.4</code> is the schema format version',
    '0.4.0</code> is the npm release version',
    '@designlasagna/schemas@0.4.0',
    'schemaVersion: "0.4.0"',
    // Native manifests: the $schema URL selects the contract; schemaVersion
    // stays a plain string (no version dispatch); the resolver picks the profile.
    'The URL selects the validating contract',
    'not a version-dispatch algorithm',
    'the consuming resolver selects the matching v0.4 profile itself',
    // CEM/DTCG extensions opt into lifecycle fields within host formats;
    // without selection the legacy profile applies, per the package docs.
    'the consuming project or resolver config selects lifecycle profile',
    'lifecycle fields inside CEM extensions and DTCG extensions become active',
    'Without that selection, the legacy profile applies',
    "documented in the package's lifecycle documentation",
    // CEM slot/cssProperty extensions gain status via the shared reference.
    'gaining <code>status</code> in the process',
    // CEM DeprecatedValue message must now be non-empty.
    '<code>message</code> now required to be non-empty',
    // No automatic conversion, no universal consumer support, dual support.
    'There is no automatic, lossless conversion of legacy data',
    'not assume universal v0.4 consumer support',
    'no lossless upgrade path',
    'keep dual support',
    // The explicit deprecated: false assertion is new.
    'deprecated: false',
    // v0.3 contract URLs moved to /schemas/v0.4/ in v0.4 (HTML-escaped in the page).
    'https://designlasagna.recipes/v0.3/&lt;file&gt;',
    'https://designlasagna.recipes/schemas/v0.4/&lt;file&gt;',
  ];
  for (const claim of claims) {
    assert.ok(normalized.includes(claim), `guide no longer states: ${claim}`);
  }
});

test('the guide covers the expected per-contract sections', () => {
  for (const heading of ['tokens.json', 'utilities.json', 'icons.json', 'cem-extensions.json', 'dtcg-extensions.json']) {
    assert.match(source, new RegExp(`<h3>${heading}</h3>`), `per-contract section for ${heading} is missing`);
  }
});
