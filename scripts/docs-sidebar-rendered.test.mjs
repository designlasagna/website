/**
 * Rendered docs sidebar information architecture.
 *
 * Asserts the sidebar IA on the built dist/ output (run through
 * `npm run check`, which builds dist/ first):
 *
 *   - the sidebar navigation is grouped, in this order, on every docs
 *     page: Schema reference (Overview, Tokens, Utilities, Icons,
 *     CEM extensions, DTCG extensions, Lifecycle — current v0.4 only, in
 *     that order), Versioning (Migrate v0.3 → v0.4 with the page subnav
 *     directly beneath it), and Language Server (existing links);
 *   - the full v0.3 tree never appears in the normal navigation: v0.4
 *     pages, the migration guide, and the language server page carry no
 *     /docs/schemas/v0.3/ sidebar links and no Previous version group;
 *   - a v0.3 page instead shows one compact contextual "Previous
 *     version" group holding only that page's own link/title (with
 *     aria-current) and its docsToc directly below it — never the other
 *     three v0.3 pages — while the page-level schema-version-nav stays
 *     the mechanism for switching versions.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const V04_PAGES = [
  { route: '/docs/schemas/v0.4/tokens/', dir: 'tokens' },
  { route: '/docs/schemas/v0.4/utilities/', dir: 'utilities' },
  { route: '/docs/schemas/v0.4/icons/', dir: 'icons' },
  { route: '/docs/schemas/v0.4/components/', dir: 'components' },
  { route: '/docs/schemas/v0.4/dtcg-extensions/', dir: 'dtcg-extensions' },
  { route: '/docs/schemas/v0.4/lifecycle/', dir: 'lifecycle' },
];
const MIGRATION_PAGE = { route: '/docs/schemas/migrate-v0.3-to-v0.4/' };
const LANGUAGE_SERVER_PAGE = { route: '/docs/language-server/setup/' };

// The four published v0.3 reference pages: their own titles, and the v0.4
// sibling each page's page-level version nav must link to.
const V03_PAGES = [
  { route: '/docs/schemas/v0.3/dtcg-extensions/', title: 'DTCG token extensions — v0.3', navLabel: 'DTCG extensions', v04Href: '/docs/schemas/v0.4/dtcg-extensions/' },
  { route: '/docs/schemas/v0.3/tokens/', title: 'Tokens — v0.3', navLabel: 'Tokens', v04Href: '/docs/schemas/v0.4/tokens/' },
  { route: '/docs/schemas/v0.3/utilities/', title: 'Utilities — v0.3', navLabel: 'Utilities', v04Href: '/docs/schemas/v0.4/utilities/' },
  { route: '/docs/schemas/v0.3/components/', title: 'Components — v0.3', navLabel: 'Components', v04Href: '/docs/schemas/v0.4/components/' },
];

// The current v0.4 links the Schema reference group must list, in order.
const SCHEMA_REFERENCE_LINKS = [
  '/docs/schemas/',
  '/docs/schemas/v0.4/tokens/',
  '/docs/schemas/v0.4/utilities/',
  '/docs/schemas/v0.4/icons/',
  '/docs/schemas/v0.4/components/',
  '/docs/schemas/v0.4/dtcg-extensions/',
  '/docs/schemas/v0.4/lifecycle/',
];

function readPage(route) {
  const file = path.join(distRoot, `${route}index.html`);
  assert.ok(fs.existsSync(file), `${path.join('dist', route)}index.html must exist; run npm run build before this test`);
  return fs.readFileSync(file, 'utf8');
}

/** The <aside class="docs-sidebar">…</aside> region of a built page. */
function sidebarOf(html, label) {
  const start = html.indexOf('<aside class="docs-sidebar">');
  assert.ok(start >= 0, `${label}: page must render the docs sidebar`);
  const end = html.indexOf('</aside>', start);
  assert.ok(end > start, `${label}: page must close the docs sidebar`);
  return html.slice(start, end);
}

/** The documentation <nav> inside the sidebar. */
function navOf(sidebar, label) {
  const start = sidebar.indexOf('<nav aria-label="Documentation">');
  assert.ok(start >= 0, `${label}: sidebar must keep its documentation nav`);
  const end = sidebar.indexOf('</nav>', start);
  assert.ok(end > start, `${label}: sidebar must close its documentation nav`);
  return sidebar.slice(start, end);
}

/** Ordered group headings in the sidebar nav. */
function groupHeadings(nav) {
  return [...nav.matchAll(/<p class="docs-sidebar__heading">([^<]+)<\/p>/g)].map((m) => m[1]);
}

/** Top-level sidebar links (section subnavs stripped), in document order. */
function topLevelLinks(nav) {
  const withoutSubnavs = nav.replace(/<div class="docs-sidebar__subnav"[\s\S]*?<\/div>/g, '');
  return [...withoutSubnavs.matchAll(/<a href="([^"]+)"([^>]*)>([^<]*)<\/a>/g)].map((m) => ({ href: m[1], attrs: m[2], label: m[3] }));
}

/** The section subnav immediately following the given link, if any. */
function subnavAfterLink(nav, linkHref, label) {
  const linkStart = nav.indexOf(`<a href="${linkHref}"`);
  assert.ok(linkStart >= 0, `${label}: sidebar is missing the ${linkHref} link`);
  const rest = nav.slice(nav.indexOf('</a>', linkStart) + 4);
  const match = rest.match(/^\s*<div class="docs-sidebar__subnav" aria-label="([^"]+)">([\s\S]*?)<\/div>/);
  return match ? { ariaLabel: match[1], html: match[0] } : null;
}

/** The (href, label) pairs inside a subnav, in order. */
function subnavEntries(subnav) {
  return [...subnav.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => ({ href: m[1], label: m[2] }));
}

/** The docsToc of a source page, parsed from its front matter. */
function sourceDocsToc(relRoute) {
  const withoutDocs = relRoute.replace(/^\/docs\//, '').replace(/^\//, '').replace(/\/$/, '');
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'content', 'docs', `${withoutDocs}/index.njk`), 'utf8');
  const frontmatter = source.slice(0, source.indexOf('---', 3));
  return [...frontmatter.matchAll(/- label: (.+)\n\s+href: "#([a-z0-9-]+)"/g)].map((m) => ({ label: m[1].trim(), href: `#${m[2]}` }));
}

const CURRENT_PAGES = [
  ...V04_PAGES.map(({ route, dir }) => ({ route, dir, label: `v0.4 ${dir}` })),
  { ...MIGRATION_PAGE, dir: 'migrate-v0.3-to-v0.4', label: 'migration guide' },
  { ...LANGUAGE_SERVER_PAGE, dir: 'language-server/setup', label: 'language server setup' },
];
const V03_WITH_DIRS = V03_PAGES.map(({ route, ...rest }) => ({
  ...rest,
  route,
  dir: route.replace('/docs/schemas/v0.3/', '').replace(/\/$/, ''),
  label: `v0.3 ${route.replace('/docs/schemas/v0.3/', '').replace(/\/$/, '')}`,
}));

// ---------------------------------------------------------------------------
// Group order and group contents
// ---------------------------------------------------------------------------

test('sidebar groups render in the required order on every docs page', () => {
  for (const { route, label } of CURRENT_PAGES) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    assert.deepEqual(
      groupHeadings(nav),
      ['Schema reference', 'Versioning', 'Language Server'],
      `${label}: groups must be Schema reference, Versioning, Language Server`,
    );
  }
  for (const { route, label } of V03_WITH_DIRS) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    assert.deepEqual(
      groupHeadings(nav),
      ['Schema reference', 'Versioning', 'Previous version', 'Language Server'],
      `${label}: the contextual Previous version group must sit after Versioning`,
    );
  }
});

test('Schema reference group lists only the current v0.4 pages, in order', () => {
  for (const { route, label } of [...CURRENT_PAGES, ...V03_WITH_DIRS]) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    const start = nav.indexOf('>Schema reference</p>');
    const end = nav.indexOf('>Versioning</p>');
    assert.ok(start >= 0 && end > start, `${label}: Schema reference group must precede the Versioning group`);
    const group = topLevelLinks(nav.slice(start, end)).map(({ href }) => href);
    assert.deepEqual(group, SCHEMA_REFERENCE_LINKS, `${label}: Schema reference group must list exactly the current v0.4 pages, in order`);
  }
});

// ---------------------------------------------------------------------------
// No v0.3 tree in the normal navigation
// ---------------------------------------------------------------------------

test('v0.4 and current pages show no v0.3 sidebar links', () => {
  for (const { route, label } of CURRENT_PAGES) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    assert.ok(
      !nav.includes('href="/docs/schemas/v0.3/'),
      `${label}: the normal sidebar must not link the v0.3 reference pages`,
    );
    assert.ok(
      !groupHeadings(nav).includes('Previous version'),
      `${label}: only v0.3 pages may show the contextual Previous version group`,
    );
  }
});

test('v0.3 pages show only their own contextual Previous version link, not all four', () => {
  for (const { route, navLabel, label } of V03_WITH_DIRS) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    const v03Links = topLevelLinks(nav).filter(({ href }) => href.startsWith('/docs/schemas/v0.3/'));
    assert.deepEqual(
      v03Links.map(({ href, label: linkLabel, attrs }) => ({ href, linkLabel, attrs })),
      [{ href: route, linkLabel: navLabel, attrs: ' aria-current="page"' }],
      `${label}: the Previous version group must contain only this page's own link with aria-current`,
    );
    // The page's docsToc sits directly beneath that link.
    const subnav = subnavAfterLink(nav, route, label);
    assert.ok(subnav, `${label}: the contextual link must be followed by the page subnav`);
    assert.deepEqual(subnavEntries(subnav.html), sourceDocsToc(route.replace(/^\/docs/, '')), `${label}: the contextual subnav must be this page's docsToc`);
  }
});

test('v0.3 pages keep the page-level version nav as the version switch', () => {
  for (const { route, v04Href, label } of V03_WITH_DIRS) {
    const html = readPage(route);
    assert.ok(html.includes('class="schema-version-nav__list"'), `${label}: page-level version nav must stay rendered`);
    assert.ok(
      html.includes(`href="${v04Href}"`),
      `${label}: the page-level version nav must still link the v0.4 sibling ${v04Href}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Current link, subnav placement, and aria-current
// ---------------------------------------------------------------------------

test('migration subnav sits directly after the migration link in the Versioning group', () => {
  const label = 'migration guide';
  const nav = navOf(sidebarOf(readPage(MIGRATION_PAGE.route), label), label);
  const linkStart = nav.indexOf(`<a href="${MIGRATION_PAGE.route}"`);
  const linkEnd = nav.indexOf('</a>', linkStart);
  const subnav = subnavAfterLink(nav, MIGRATION_PAGE.route, label);
  assert.ok(subnav, 'the migration page must keep its section subnav');
  assert.match(nav.slice(linkEnd + 4, nav.indexOf('<div class="docs-sidebar__subnav"')), /^\s*$/, 'only whitespace may sit between the migration link and its subnav');
  assert.equal(subnav.ariaLabel, 'Migration sections', 'the migration subnav must keep its section aria-label');
  assert.deepEqual(subnavEntries(subnav.html), sourceDocsToc('/docs/schemas/migrate-v0.3-to-v0.4'), 'the migration subnav must be the guide docsToc');
});

test('every docs page marks exactly one current top-level link with its subnav directly beneath', () => {
  for (const { route, label } of [...CURRENT_PAGES, ...V03_WITH_DIRS]) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    const current = topLevelLinks(nav).filter(({ attrs }) => attrs.includes('aria-current="page"'));
    assert.equal(current.length, 1, `${label}: exactly one top-level sidebar link may carry aria-current="page"`);
    assert.equal(current[0].href, route, `${label}: the current top-level link must be this page`);
    const subnav = subnavAfterLink(nav, route, label);
    assert.ok(subnav, `${label}: the current page link must be directly followed by its section subnav`);
    assert.deepEqual(subnavEntries(subnav.html), sourceDocsToc(route.replace(/^\/docs/, '')), `${label}: the subnav must be this page's docsToc`);
  }
});

test('Language Server group links only Overview then Setup, in order', () => {
  for (const { route, label } of [...CURRENT_PAGES, ...V03_WITH_DIRS]) {
    const nav = navOf(sidebarOf(readPage(route), label), label);
    const start = nav.indexOf('>Language Server</p>');
    assert.ok(start >= 0, `${label}: Language Server group heading must stay`);
    const links = topLevelLinks(nav.slice(start)).map(({ href }) => href);
    assert.deepEqual(links, ['/docs/language-server/', '/docs/language-server/setup/'], `${label}: Language Server group must link Overview then Setup only, not the tool page`);
  }
});
