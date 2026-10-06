/**
 * Regression tests for the v0.3 → v0.4 migration guide page:
 *
 *   - the guide is published at /docs/schemas/migrate-v0.3-to-v0.4/ and is a
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

const GUIDE = 'src/content/docs/schemas/migrate-v0.3-to-v0.4/index.njk';
const SIDEBAR = 'src/_data/docsNav.json';
const OVERVIEW = 'src/content/docs/schemas/index.njk';
const GUIDE_ROUTE = '/docs/schemas/migrate-v0.3-to-v0.4/';
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
const MOVED_CONTENT = [
  '/docs/schemas/v0.4/lifecycle/#lifecycle-selection',
  '/tools/schemas/changelog/#v0-4-0',
];
const EXPECTED_INTERNAL = [...MOVED_CONTENT, ...V03_DOCS, ...V04_DOCS, ...V03_RAW, ...V04_RAW].sort();

test('migration guide is published at /docs/schemas/migrate-v0.3-to-v0.4/', () => {
  assert.ok(exists(GUIDE), 'guide source is missing');
  assert.match(source, /^permalink: \/docs\/schemas\/migrate-v0\.3-to-v0\.4\/$/m);
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
  for (const id of ['start', 'at-a-glance', 'examples', 'format-vs-package', 'lifecycle-selection', 'per-contract', 'unchanged', 'checklist', 'references']) {
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
    // Compact selection list: native opt-in per document, CEM/DTCG per profile.
    'Per document: v0.4 <code>$schema</code> URL',
    'Select lifecycle profile <code>0.4</code> in project or resolver config',
    'Legacy profile; v0.4 fields are not applied',
    'Nothing converts automatically',
    // The explicit deprecated: false assertion is new.
    'deprecated: false',
  ];
  for (const claim of claims) {
    assert.ok(normalized.includes(claim), `guide no longer states: ${claim}`);
  }
});

test('the guide is compact: moved sections are gone and link to where the content lives', () => {
  for (const heading of ['tokens.json', 'utilities.json', 'icons.json', 'cem-extensions.json', 'dtcg-extensions.json']) {
    assert.ok(!source.includes(`<h3>${heading}</h3>`), `per-contract h3 for ${heading} moved to the changelog`);
  }
  assert.ok(!source.includes('id="lifecycle-fragment"'), 'lifecycle-fragment section was removed');
  assert.ok(!source.includes('<h3>Lifecycle rules</h3>'), 'lifecycle rules moved to the lifecycle reference');
  assert.ok(source.includes('href="/docs/schemas/v0.4/lifecycle/#lifecycle-selection"'), 'guide must deep-link the lifecycle selection reference');
  assert.ok(source.includes('href="/tools/schemas/changelog/#v0-4-0"'), 'guide must deep-link the v0.4.0 changelog entry');
});

const CHANGELOG = 'src/content/tools/schemas/changelog/index.html';
const LIFECYCLE_PAGE = 'src/content/docs/schemas/v0.4/lifecycle/index.njk';

test('the changelog page keeps a v0.4.0 entry the guide can link to', () => {
  // Per-contract breakdowns now ship in the package CHANGELOG.md (rendered at
  // build time; see schemas-changelog.test.mjs). The page's fallback entry
  // keeps the anchor and the summary.
  const changelog = read(CHANGELOG);
  assert.match(changelog, /<section class="change-entry" id="v0-4-0">/, 'fallback v0.4.0 entry needs id="v0-4-0"');
  assert.ok(!/<h3>/.test(changelog), 'per-contract h3 lists moved to the package changelog');
  const log = changelog.replace(/\s+/g, ' ');
  for (const claim of [
    'canonical <code>status</code> field',
    'explicit <code>deprecated: false</code>',
    'href="/docs/schemas/migrate-v0.3-to-v0.4/"',
  ]) {
    assert.ok(log.includes(claim), `changelog no longer states: ${claim}`);
  }
});

test('the lifecycle reference page carries the selection details and rules', () => {
  const page = read(LIFECYCLE_PAGE);
  assert.match(page, /id="lifecycle-selection"/);
  assert.match(page, /href: "#lifecycle-selection"/, 'lifecycle page TOC must list the selection section');
  const text = page.replace(/\s+/g, ' ');
  for (const claim of [
    'the <code>$schema</code> URL selects the validating contract',
    'not version dispatch',
    'the consuming resolver selects the matching v0.4 profile',
    'apply only when project or resolver config selects lifecycle profile <code>0.4</code>',
    'otherwise the legacy profile applies',
    "docs/lifecycle-migration.md",
    'no automatic, lossless conversion',
    'do not assume universal v0.4 consumer support',
    'no lossless upgrade path',
    'v0.3 and v0.4 documents coexist',
    '<code>lifecycle-conflict</code>',
    '<code>removed</code> is always an error',
    'Expand DTCG <code>$extends</code> before lifecycle selection',
    'register all six exported v0.4 schemas',
  ]) {
    assert.ok(text.includes(claim), `lifecycle page no longer states: ${claim}`);
  }
});

test('guide uses flat lists, not tables, for selection and references', () => {
  assert.ok(!source.includes('<table'), 'guide listings must not be tables');
  const selection = source.match(/<section id="lifecycle-selection">[\s\S]*?<\/section>/)[0];
  const profiles = [...selection.matchAll(/<dt class="schema-list__title">([^<]+)<\/dt>/g)].map((m) => m[1]);
  assert.deepEqual(profiles, ['Native manifests', 'CEM', 'DTCG'], 'selection list must name each profile');
  assert.equal((selection.match(/<dd>/g) ?? []).length, 6, 'each profile needs an opt-in and an otherwise line');

  const references = source.match(/<section id="references">[\s\S]*?<\/section>/)[0];
  const items = references.match(/<li>[\s\S]*?<\/li>/g) ?? [];
  const contracts = ['tokens', 'utilities', 'cem-extensions', 'dtcg-extensions', 'icons', 'lifecycle'];
  assert.equal(items.length, contracts.length, 'references list needs one item per contract');
  const v03Pages = { tokens: 'tokens', utilities: 'utilities', 'cem-extensions': 'components', 'dtcg-extensions': 'dtcg-extensions' };
  const v04Pages = { ...v03Pages, icons: 'icons', lifecycle: 'lifecycle' };
  contracts.forEach((contract, i) => {
    const item = items[i];
    assert.ok(item.includes(`<code>${contract}.json</code>`), `references item ${i} must be ${contract}.json`);
    assert.ok(item.includes(`href="/docs/schemas/v0.4/${v04Pages[contract]}/"`), `${contract} must link its v0.4 reference`);
    assert.ok(item.includes(`href="/schemas/v0.4/${contract}.json"`), `${contract} must link its v0.4 raw file`);
    if (contract === 'lifecycle') {
      assert.ok(item.includes('Not in v0.3'), 'lifecycle must say it is not in v0.3');
      return;
    }
    assert.ok(item.includes(`href="/schemas/v0.3/${contract}.json"`), `${contract} must link its v0.3 raw file`);
    if (v03Pages[contract]) {
      assert.ok(item.includes(`href="/docs/schemas/v0.3/${v03Pages[contract]}/"`), `${contract} must link its v0.3 reference`);
    } else {
      assert.ok(item.includes('No reference page'), `${contract} must say it has no v0.3 reference page`);
    }
  });
});
