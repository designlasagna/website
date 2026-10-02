/**
 * schema-version-nav.test.mjs — source-level checks for the schema-doc
 * versioning foundation:
 *
 *   - the schemas overview presents v0.4 as the current/default format and
 *     v0.3 as previous compatibility documentation, without inventing any
 *     /docs/schemas/v0.4/... reference-page URL;
 *   - every existing v0.3 reference page keeps its route, links, and
 *     contract sources, and carries the shared version nav + maintenance
 *     notice;
 *   - the schema format v0.4 stays distinct from the npm package 0.4.0.
 *
 * Pure file checks: no build, no network, no installed dependencies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(projectRoot, rel), 'utf8');

const OVERVIEW = 'src/content/docs/schemas/index.njk';
const VERSION_NAV = 'src/_includes/schema-version-nav.njk';

const v03Pages = [
  { rel: 'src/content/docs/schemas/v0.3/dtcg-extensions/index.njk', route: '/docs/schemas/v0.3/dtcg-extensions/' },
  { rel: 'src/content/docs/schemas/v0.3/tokens/index.njk', route: '/docs/schemas/v0.3/tokens/' },
  { rel: 'src/content/docs/schemas/v0.3/utilities/index.njk', route: '/docs/schemas/v0.3/utilities/' },
  { rel: 'src/content/docs/schemas/v0.3/components/index.njk', route: '/docs/schemas/v0.3/components/' },
];

// The v0.4 files shipped by the @designlasagna/schemas package release
// 0.4.0 (same set scripts/verify-schema-hosting.mjs checks at build time).
const v04RawFiles = [
  'dtcg-extensions.json',
  'tokens.json',
  'utilities.json',
  'icons.json',
  'cem-extensions.json',
  'lifecycle.json',
];

// Routes that really exist for these templates: the docs overview, the
// four v0.3 reference pages, the Schemas tool page, and the raw v0.4 files
// published into dist/schemas/v0.4/ by publish-schemas.mjs.
const allowedRoutes = new Set([
  '/docs/schemas/',
  '/tools/schemas/',
  ...v03Pages.map(({ route }) => route),
  ...v04RawFiles.map((file) => `/schemas/v0.4/${file}`),
]);

/** Plain reader-facing text: tags stripped, whitespace collapsed. */
function plain(source) {
  return source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/** Literal root-relative hrefs (dynamic {{ ... }} and #fragment hrefs excluded). */
function internalHrefs(source) {
  return [...source.matchAll(/href="(\/[^\"]*)"/g)].map((match) => match[1]);
}

test('overview presents v0.4 as current/default and v0.3 as previous', () => {
  const overview = read(OVERVIEW);
  const text = plain(overview);
  assert.match(overview, /<h2>v0\.4\s*<span class="version-status">Current[^<]*<\/span>/, 'v0.4 heading must be marked current');
  assert.match(overview, /<h2>v0\.3\s*<span class="version-status">Previous[^<]*<\/span>/, 'v0.3 heading must be marked previous');
  assert.match(text, /v0\.4 is the current and default schema format/i, 'overview must state v0.4 is current and default');
  assert.match(text, /v0\.3 is the previous schema format/i, 'overview must state v0.3 is previous');
  assert.match(text, /compatibility/i, 'overview must frame v0.3 as compatibility documentation');
});

test('overview keeps every existing v0.3 reference link', () => {
  const overview = read(OVERVIEW);
  for (const { route } of v03Pages) {
    assert.ok(overview.includes(`href="${route}"`), `overview lost its v0.3 link: ${route}`);
  }
});

test('overview links the v0.4 raw contracts without inventing reference pages', () => {
  const overview = read(OVERVIEW);
  for (const file of v04RawFiles) {
    assert.ok(overview.includes(`href="/schemas/v0.4/${file}"`), `overview missing raw v0.4 link: ${file}`);
  }
  assert.ok(!/href="\/docs\/schemas\/v0\.4/.test(overview), 'overview must not link v0.4 reference pages that do not exist yet');
  assert.match(plain(overview), /v0\.4 reference pages are not published yet/i, 'overview must say v0.4 reference pages do not exist yet');
});

test('overview keeps schema format v0.4 distinct from npm package 0.4.0', () => {
  const overview = read(OVERVIEW);
  const text = plain(overview);
  assert.ok(overview.includes('@designlasagna/schemas'), 'overview must name the npm package');
  assert.match(text, /0\.4\.0 is the package release that ships the v0\.4 format files/, 'overview must distinguish package release 0.4.0 from format v0.4');
  assert.match(text, /Format version ≠ package version/i, 'overview must state the two versioning schemes are different');
});

test('v0.3 pages keep their routes and carry the shared version nav', () => {
  for (const { rel, route } of v03Pages) {
    const source = read(rel);
    assert.ok(source.includes(`permalink: ${route}`), `${rel} must keep permalink ${route}`);
    assert.ok(source.includes('schemaDocVersion: v0.3'), `${rel} must set schemaDocVersion in front matter`);
    assert.ok(source.includes('{% include "schema-version-nav.njk" %}'), `${rel} must include the shared version nav`);
    // The schema-install contract sources stay untouched.
    assert.ok(source.includes('canonicalUrl'), `${rel} must keep its canonical schema URL source`);
    assert.ok(source.includes('npmImportPath'), `${rel} must keep its npm import path source`);
  }
});

test('shared version nav falls back to the overview for v0.4 and explains v0.3 status', () => {
  const nav = read(VERSION_NAV);
  assert.ok(nav.includes("href: '/docs/schemas/'"), 'v0.4 entry must fall back to the schema overview');
  assert.ok(!/href="\/docs\/schemas\/v0\.4/.test(nav), 'version nav must not link v0.4 reference pages that do not exist yet');
  assert.ok(nav.includes('Previous version:'), 'version nav must carry a maintenance notice for previous versions');
  assert.ok(nav.includes('kept for compatibility'), 'version nav must explain the compatibility role');
  assert.ok(nav.includes('aria-current="page"'), 'version nav must mark the page\'s own version');
});

test('schema docs templates only link routes that exist', () => {
  const templates = [OVERVIEW, VERSION_NAV, ...v03Pages.map(({ rel }) => rel)];
  for (const rel of templates) {
    for (const href of internalHrefs(read(rel))) {
      assert.ok(allowedRoutes.has(href), `${rel} links an unknown route: ${href}`);
    }
  }
});
