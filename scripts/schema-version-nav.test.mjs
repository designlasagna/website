/**
 * schema-version-nav.test.mjs — source-level checks for the schema-doc
 * versioning foundation:
 *
 *   - the schemas overview presents v0.4 as the current/default format and
 *     v0.3 as previous compatibility documentation, linking the published
 *     v0.4 reference pages (dtcg-extensions, tokens, utilities, icons, and
 *     components) and not inventing any other /docs/schemas/v0.4/...
 *     reference-page URL;
 *   - every existing v0.3 reference page keeps its route, links, and
 *     contract sources, and carries the shared version nav + maintenance
 *     notice;
 *   - the shared version nav links each page's own version entry to the
 *     page itself, maps published sibling pairs in both directions
 *     (v0.3 tokens -> v0.4 tokens and v0.3 utilities -> v0.4 utilities via
 *     schemaDocV04Href, v0.4 tokens -> v0.3 tokens and v0.4 utilities ->
 *     v0.3 utilities via schemaDocV03Href), and otherwise falls back to the
 *     schema overview with an explicit visible "overview fallback" label
 *     (currently only the v0.4 icons page's v0.3 entry, which has no v0.3
 *     sibling yet);
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
  { version: 'v0.3', rel: 'src/content/docs/schemas/v0.3/dtcg-extensions/index.njk', route: '/docs/schemas/v0.3/dtcg-extensions/', v04Href: '/docs/schemas/v0.4/dtcg-extensions/' },
  // v04Href: the published v0.4 sibling the shared nav must link to.
  { version: 'v0.3', rel: 'src/content/docs/schemas/v0.3/tokens/index.njk', route: '/docs/schemas/v0.3/tokens/', v04Href: '/docs/schemas/v0.4/tokens/' },
  { version: 'v0.3', rel: 'src/content/docs/schemas/v0.3/utilities/index.njk', route: '/docs/schemas/v0.3/utilities/', v04Href: '/docs/schemas/v0.4/utilities/' },
  { version: 'v0.3', rel: 'src/content/docs/schemas/v0.3/components/index.njk', route: '/docs/schemas/v0.3/components/', v04Href: '/docs/schemas/v0.4/components/' },
];

// v0.4 reference pages published so far. The shared version nav must not
// link any other /docs/schemas/v0.4/... route until the page exists.
// v03Href: the published v0.3 sibling each page must link back to.
const v04Pages = [
  // The v0.4 dtcg-extensions, tokens, utilities, and components reference
  // pages exist, so they override the nav's previous-version href to point
  // at their v0.3 siblings. The v0.4 icons page has no published v0.3
  // sibling yet, so its v0.3 entry keeps the explicit overview fallback
  // (labeled in the nav). The v0.4 lifecycle reference page is not
  // published yet, so no lifecycle route may be invented (the overview
  // links it to the raw file).
  { version: 'v0.4', rel: 'src/content/docs/schemas/v0.4/dtcg-extensions/index.njk', route: '/docs/schemas/v0.4/dtcg-extensions/', v03Href: '/docs/schemas/v0.3/dtcg-extensions/' },
  { version: 'v0.4', rel: 'src/content/docs/schemas/v0.4/tokens/index.njk', route: '/docs/schemas/v0.4/tokens/', v03Href: '/docs/schemas/v0.3/tokens/' },
  { version: 'v0.4', rel: 'src/content/docs/schemas/v0.4/utilities/index.njk', route: '/docs/schemas/v0.4/utilities/', v03Href: '/docs/schemas/v0.3/utilities/' },
  { version: 'v0.4', rel: 'src/content/docs/schemas/v0.4/icons/index.njk', route: '/docs/schemas/v0.4/icons/' },
  { version: 'v0.4', rel: 'src/content/docs/schemas/v0.4/components/index.njk', route: '/docs/schemas/v0.4/components/', v03Href: '/docs/schemas/v0.3/components/' },
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
// v0.3 reference pages, the published v0.4 reference pages, the Schemas
// tool page, the other docs/tool landing pages linked from the shared docs
// sidebar, and the raw v0.4 files published into dist/schemas/v0.4/ by
// publish-schemas.mjs.
const allowedRoutes = new Set([
  '/docs/',
  '/docs/schemas/',
  '/docs/language-server/',
  '/tools/schemas/',
  '/tools/language-server/',
  ...v03Pages.map(({ route }) => route),
  ...v04Pages.map(({ route }) => route),
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

test('overview links the v0.4 raw contracts and only published v0.4 reference pages', () => {
  const overview = read(OVERVIEW);
  for (const file of v04RawFiles) {
    assert.ok(overview.includes(`href="/schemas/v0.4/${file}"`), `overview missing raw v0.4 link: ${file}`);
  }
  const referenceHrefs = internalHrefs(overview).filter((href) => href.startsWith('/docs/schemas/v0.4/'));
  assert.deepEqual(
    referenceHrefs,
    v04Pages.map(({ route }) => route),
    'overview must link exactly the published v0.4 reference pages',
  );
  assert.match(plain(overview), /the remaining v0\.4 reference page is not published yet/i, 'overview must say the remaining v0.4 reference page does not exist yet');
});

test('overview keeps schema format v0.4 distinct from npm package 0.4.0', () => {
  const overview = read(OVERVIEW);
  const text = plain(overview);
  assert.ok(overview.includes('@designlasagna/schemas'), 'overview must name the npm package');
  assert.match(text, /0\.4\.0 is the package release that ships the v0\.4 format files/, 'overview must distinguish package release 0.4.0 from format v0.4');
  assert.match(text, /Format version ≠ package version/i, 'overview must state the two versioning schemes are different');
});

test('reference pages keep their routes and carry the shared version nav', () => {
  for (const { version, rel, route } of [...v03Pages, ...v04Pages]) {
    const source = read(rel);
    assert.ok(source.includes(`permalink: ${route}`), `${rel} must keep permalink ${route}`);
    assert.ok(source.includes(`schemaDocVersion: ${version}`), `${rel} must set schemaDocVersion in front matter`);
    assert.ok(source.includes('{% include "schema-version-nav.njk" %}'), `${rel} must include the shared version nav`);
    // The schema-install contract sources stay untouched.
    assert.ok(source.includes('canonicalUrl'), `${rel} must keep its canonical schema URL source`);
    assert.ok(source.includes('npmImportPath'), `${rel} must keep its npm import path source`);
  }
});

test('v0.4 pages point the shared nav back at their v0.3 sibling reference when one exists', () => {
  for (const { rel, v03Href } of v04Pages) {
    const source = read(rel);
    if (v03Href) {
      assert.ok(source.includes(`schemaDocV03Href: ${v03Href}`), `${rel} must override the nav's previous-version href to its v0.3 sibling`);
    } else {
      assert.ok(!source.includes('schemaDocV03Href'), `${rel} has no published v0.3 sibling; the nav must keep the overview fallback`);
    }
  }
});

test('v0.3 pages point the shared nav at their published v0.4 sibling when one exists', () => {
  for (const { rel, v04Href } of v03Pages) {
    const source = read(rel);
    if (v04Href) {
      assert.ok(source.includes(`schemaDocV04Href: ${v04Href}`), `${rel} must override the nav's current-version href to its v0.4 sibling`);
    } else {
      assert.ok(!source.includes('schemaDocV04Href'), `${rel} has no published v0.4 sibling; the nav must keep the overview fallback`);
    }
  }
});

test("shared version nav links each page's own version to the current page", () => {
  const nav = read(VERSION_NAV);
  assert.ok(
    /if schemaDocVersion == 'v0\.4'[\s\S]*?set v04Href = page\.url/.test(nav),
    'v0.4 entry must link to the page itself on v0.4 pages',
  );
  assert.ok(
    /elif schemaDocVersion == 'v0\.3'[\s\S]*?set v03Href = page\.url/.test(nav),
    'v0.3 entry must link to the page itself on v0.3 pages',
  );
  assert.ok(nav.includes('aria-current="page"'), 'version nav must mark the page\'s own version');
  assert.ok(!/href="\/docs\/schemas\/v0\.4/.test(nav), 'version nav must not link v0.4 reference pages that do not exist yet');
  assert.ok(!/href="\/docs\/schemas\/v0\.3/.test(nav), 'version nav must not link v0.3 reference pages that do not exist yet');
});

test('shared version nav honours sibling overrides and labels the overview fallback', () => {
  const nav = read(VERSION_NAV);
  assert.ok(
    /if schemaDocVersion == 'v0\.4'[\s\S]*?set v03Href = schemaDocV03Href or '\/docs\/schemas\/'/.test(nav),
    'on v0.4 pages the v0.3 entry must use the v0.3 sibling override or fall back to the schema overview',
  );
  assert.ok(
    /elif schemaDocVersion == 'v0\.3'[\s\S]*?set v04Href = schemaDocV04Href or '\/docs\/schemas\/'/.test(nav),
    'on v0.3 pages the v0.4 entry must use the v0.4 sibling override or fall back to the schema overview',
  );
  assert.ok(nav.includes("set v04Fallback = not schemaDocV04Href"), 'v0.4 entry must flag the overview fallback when no v0.4 sibling override is provided');
  assert.ok(nav.includes("set v03Fallback = not schemaDocV03Href"), 'v0.3 entry must flag the overview fallback when no v0.3 sibling override is provided');
  assert.ok(
    nav.includes('<span class="schema-version-nav__fallback">overview fallback</span>'),
    'version nav must render an explicit visible/accessible "overview fallback" label for absent counterpart entries',
  );
});

test('shared version nav keeps the v0.3 maintenance notice', () => {
  const nav = read(VERSION_NAV);
  assert.ok(nav.includes('Previous version:'), 'version nav must carry a maintenance notice for previous versions');
  assert.ok(nav.includes('kept for compatibility'), 'version nav must explain the compatibility role');
});

test('schema docs templates only link routes that exist', () => {
  const templates = [OVERVIEW, VERSION_NAV, 'src/_includes/docs.njk', ...v03Pages.map(({ rel }) => rel), ...v04Pages.map(({ rel }) => rel)];
  for (const rel of templates) {
    for (const href of internalHrefs(read(rel))) {
      assert.ok(allowedRoutes.has(href), `${rel} links an unknown route: ${href}`);
    }
  }
});
