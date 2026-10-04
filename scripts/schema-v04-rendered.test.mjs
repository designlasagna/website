/**
 * Rendered v0.4 schema reference pages.
 *
 * Asserts the review requirements on the built dist/ output (run through
 * `npm run check`, which builds dist/ first):
 *
 *   - all six v0.4 reference pages follow the shared layout cleanup:
 *     no "Start here" sidebar entry or start navigation target (the page
 *     header is the start), exactly one combined schema-install callout
 *     that carries the raw schema URL (exactly once per page), the npm
 *     import/package link (exactly once per page), and the GitHub source
 *     repository link (exactly once within the callout; the shared footer
 *     legitimately links the repository too), and no separate
 *     schema-docs-source/Sources card;
 *   - the lifecycle page follows the shared schema-reference layout: one
 *     H2 "Nested definitions" section whose Status, Deprecated,
 *     StrictDeprecated, NativeDeprecation, and DeprecatedValue entries are
 *     H3 articles in a .schema-definition-list, keeping their
 *     definition-* anchors and field tables;
 *   - the lifecycle docsToc is simplified to Definitions and Usage;
 *   - the DTCG intro is exactly two concise sentences: the schema
 *     validates only recipes.designlasagna metadata stored in the DTCG
 *     $extensions (with the linked official spec defining the host
 *     format) and the authoring counterpart is the linked resolved v0.4
 *     tokens, and the minimal
 *     example intro is short;
 *   - neither the lifecycle nor the DTCG page renders a literal backtick,
 *     and no built HTML page anywhere under dist/ renders an RFC
 *     reference (raw JSON contracts under dist/schemas/ stay unchanged
 *     and are exempt).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

const LIFECYCLE_PAGE = path.join(distRoot, 'docs', 'schemas', 'v0.4', 'lifecycle', 'index.html');
const DTCG_PAGE = path.join(distRoot, 'docs', 'schemas', 'v0.4', 'dtcg-extensions', 'index.html');

/** All six published v0.4 reference pages and their published raw file. */
const v04Pages = [
  { name: 'tokens', dir: 'tokens', raw: 'tokens.json' },
  { name: 'utilities', dir: 'utilities', raw: 'utilities.json' },
  { name: 'icons', dir: 'icons', raw: 'icons.json' },
  { name: 'components', dir: 'components', raw: 'cem-extensions.json' },
  { name: 'dtcg-extensions', dir: 'dtcg-extensions', raw: 'dtcg-extensions.json' },
  { name: 'lifecycle', dir: 'lifecycle', raw: 'lifecycle.json' },
];

for (const { name, dir, raw } of v04Pages) {
  const pagePath = path.join(distRoot, 'docs', 'schemas', 'v0.4', dir, 'index.html');

  test(`${name} page drops the Start here sidebar entry and start target`, () => {
    const html = readPage(pagePath);
    const subnav = html.match(/<div class="docs-sidebar__subnav"[\s\S]*?<\/div>/);
    assert.ok(subnav, `${name} page must keep its section subnav`);
    assert.ok(!subnav[0].includes('href="#start"'), `${name} sidebar must not link #start`);
    const labels = [...subnav[0].matchAll(/<a href="#[^"]+">([^<]*)<\/a>/g)].map((m) => m[1]);
    assert.ok(!labels.includes('Start here'), `${name} sidebar must not list a Start here entry`);
    assert.ok(!html.includes('id="start"'), `${name} page must not keep the start navigation target`);
  });

  test(`${name} page has one combined schema-install callout and no Sources card`, () => {
    const html = readPage(pagePath);
    assert.equal(
      (html.match(/<aside class="schema-install"/g) ?? []).length,
      1,
      `${name} page must render exactly one .schema-install callout`,
    );
    assert.ok(!html.includes('schema-docs-source'), `${name} page must not render the separate schema-docs-source callout`);
    assert.ok(!/<h2>Sources<\/h2>/.test(html), `${name} page must not render a Sources heading`);

    const calloutStart = html.indexOf('<aside class="schema-install"');
    const callout = html.slice(calloutStart, html.indexOf('</aside>', calloutStart));
    assert.ok(
      callout.includes('generated from the published schema'),
      `${name} callout must state the reference is generated from the published schema`,
    );
    // Uniqueness is asserted page-wide for raw schema and npm links, and
    // within the callout for the repository link (the shared footer also
    // links the repository on every page).
    const sources = [
      ['raw schema', `https://designlasagna.recipes/schemas/v0.4/${raw}`, `<dt>Raw schema</dt><dd><a href="https://designlasagna.recipes/schemas/v0.4/${raw}">`, 'page'],
      ['npm import/package', 'https://www.npmjs.com/package/@designlasagna/schemas', `<dt>npm</dt><dd><a href="https://www.npmjs.com/package/@designlasagna/schemas"><code>@designlasagna/schemas/v0.4/${raw}</code></a>`, 'page'],
      ['source repository', 'https://github.com/designlasagna/schemas', '<dt>Repository</dt><dd><a href="https://github.com/designlasagna/schemas">', 'callout'],
    ];
    for (const [label, url, marker, scope] of sources) {
      assert.ok(callout.includes(marker), `${name} callout must keep its ${label} link`);
      assert.equal(
        (scope === 'page' ? html : callout).split(`href="${url}"`).length - 1,
        1,
        `${name} ${scope} must link its ${label} exactly once, without duplicated source links`,
      );
    }
  });
}

/** Strip tags and collapse whitespace into plain reader-facing text. */
function plain(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/** Count sentence-ending punctuation in plain text. */
function sentenceCount(text) {
  return (text.match(/[.!?]+(?=\s|$)/g) ?? []).length;
}

function readPage(file) {
  assert.ok(fs.existsSync(file), `${path.join('dist', path.relative(distRoot, file))} must exist; run npm run build before this test`);
  return fs.readFileSync(file, 'utf8');
}

const headings = (html) =>
  [...html.matchAll(/<(h[123])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({ level: Number(m[1][1]), html: m[0], text: plain(m[2]).trim() }));

/** The .schema-definition article wrapping the H3 with the given anchor. */
function definitionArticle(html, name) {
  const h3Index = html.indexOf(`<h3 id="definition-${name}">`);
  assert.ok(h3Index >= 0, `missing anchored H3 article for ${name}`);
  const articleStart = html.lastIndexOf('<article class="schema-definition">', h3Index);
  const articleEnd = html.indexOf('</article>', h3Index);
  assert.ok(articleStart >= 0 && articleEnd > articleStart, `missing .schema-definition article wrapping ${name}`);
  return html.slice(articleStart, articleEnd);
}

// ---------------------------------------------------------------------------
// Lifecycle page: heading hierarchy, anchors, field tables, simplified TOC
// ---------------------------------------------------------------------------

test('lifecycle page has one H2 definitions section and the five definitions as H3 articles', () => {
  const html = readPage(LIFECYCLE_PAGE);
  const h2 = headings(html).filter((h) => h.level === 2);
  const h3 = headings(html).filter((h) => h.level === 3);

  const definitionsH2 = h2.filter((h) => /definitions/i.test(h.text));
  assert.equal(definitionsH2.length, 1, `exactly one H2 definitions section expected, got: ${definitionsH2.map((h) => h.text).join(', ')}`);
  assert.match(definitionsH2[0].text, /Nested definitions/i);

  const names = ['Status', 'Deprecated', 'StrictDeprecated', 'NativeDeprecation', 'DeprecatedValue'];
  assert.deepEqual(
    h3.map((h) => h.text),
    names,
    'the five lifecycle definitions must be the only H3s, in reference order',
  );

  for (const name of names) {
    const article = definitionArticle(html, name);
    assert.match(html, new RegExp(`<h3 id="definition-${name}"><code>${name}</code></h3>`), `${name} must keep its definition-${name} anchor`);
    assert.ok(article.startsWith('<article class="schema-definition">'), `${name} must be an .schema-definition article`);
  }

  // The articles share one .schema-definition-list container.
  assert.ok(html.includes('<div class="schema-definition-list">'), 'definitions must live in a .schema-definition-list');
  assert.equal((html.match(/<article class="schema-definition">/g) ?? []).length, names.length, 'exactly one .schema-definition article per definition');

  // No definition is still promoted to an H2 with its own section.
  for (const name of names) {
    assert.ok(!new RegExp(`<h2[^>]*id="definition-${name}"`).test(html), `${name} must not render as an H2`);
  }
});

test('lifecycle page keeps the field tables for the property-bearing definitions', () => {
  const html = readPage(LIFECYCLE_PAGE);
  for (const name of ['Deprecated', 'StrictDeprecated', 'DeprecatedValue']) {
    const article = definitionArticle(html, name);
    assert.ok(article.includes('<table class="schema-table">'), `${name} article lost its field table`);
    assert.ok(article.includes(`id="field-details-${name}-1"`), `${name} article lost its field rows`);
  }
  for (const name of ['Status', 'NativeDeprecation']) {
    const article = definitionArticle(html, name);
    assert.ok(!article.includes('<table class="schema-table">'), `${name} has no properties and must not gain a field table`);
  }
});

test('lifecycle docsToc is simplified to Definitions and Usage', () => {
  const html = readPage(LIFECYCLE_PAGE);
  const subnav = html.match(/<div class="docs-sidebar__subnav" aria-label="Lifecycle fragment sections">[\s\S]*?<\/div>/);
  assert.ok(subnav, 'lifecycle page must keep its section subnav');
  const entries = [...subnav[0].matchAll(/<a href="(#[^"]+)">([^<]*)<\/a>/g)].map((m) => ({ href: m[1], label: m[2] }));
  assert.deepEqual(
    entries,
    [
      { href: '#definitions', label: 'Nested definitions' },
      { href: '#usage', label: 'Usage' },
    ],
    'docsToc must be exactly Definitions and Usage',
  );
  for (const { href } of entries) {
    assert.match(html, new RegExp(`id="${href.slice(1)}"`), `docsToc anchor ${href} has no matching element id`);
  }
});

// ---------------------------------------------------------------------------
// DTCG extensions page: concise intro and minimal-example framing
// ---------------------------------------------------------------------------

function paragraphWith(html, marker) {
  const match = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].find((m) => m[0].includes(marker));
  assert.ok(match, `no paragraph mentioning ${marker} found on the DTCG page`);
  return match[0];
}

test('DTCG intro is exactly two concise sentences with the expected framing', () => {
  const html = readPage(DTCG_PAGE);
  const intro = paragraphWith(html, 'designtokens.org');
  const text = plain(intro);
  const sentences = sentenceCount(text);
  assert.equal(sentences, 2, `DTCG intro must be exactly 2 sentences, got ${sentences}: ${text}`);
  assert.match(text, /validates only/i, 'intro must state the schema validates only the vendor extension');
  assert.match(intro, /<code>recipes\.designlasagna<\/code>/, 'intro must render the extension key in <code>');
  assert.ok(intro.includes('href="/docs/schemas/v0.4/tokens/"'), 'intro must link the resolved v0.4 tokens page as the authoring counterpart');
});

test('DTCG minimal example intro stays short', () => {
  const html = readPage(DTCG_PAGE);
  const heading = html.indexOf('<h2>Minimal example</h2>');
  assert.ok(heading >= 0, 'DTCG page must keep its Minimal example section');
  const section = html.slice(heading, html.indexOf('</section>', heading));
  const intro = section.match(/<p>([\s\S]*?)<\/p>/);
  assert.ok(intro, 'Minimal example section must keep a short intro paragraph');
  assert.ok(sentenceCount(plain(intro[1])) <= 2, `minimal example intro must be at most 2 sentences, got: ${plain(intro[1])}`);
});

// ---------------------------------------------------------------------------
// Rendered output must not surface RFC references or literal backticks.
// Raw JSON contracts under dist/schemas/ are exempt: they ship the
// unchanged source-of-truth documents.
// ---------------------------------------------------------------------------

for (const [label, file] of [
  ['lifecycle', LIFECYCLE_PAGE],
  ['dtcg-extensions', DTCG_PAGE],
]) {
  test(`rendered ${label} page has no literal backticks`, () => {
    const html = readPage(file);
    assert.ok(!html.includes('`'), 'rendered page must not show literal backticks; code text belongs in <code>');
  });
}

/** Every built .html file under dist/, recursively. */
function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files.sort();
}

/** Reader-visible text: drop scripts, styles, and comments, then strip tags. */
function renderedText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
}

test('no built HTML page renders an RFC reference', () => {
  const files = listHtmlFiles(distRoot);
  assert.ok(files.length > 0, 'dist/ must contain built HTML pages; run npm run build first');
  const offenders = files
    .map((file) => ({
      page: path.join('dist', path.relative(distRoot, file)),
      text: renderedText(fs.readFileSync(file, 'utf8')),
    }))
    .filter(({ text }) => /RFC/i.test(text));
  assert.deepEqual(
    offenders.map(({ page }) => page),
    [],
    'no rendered page may show an RFC reference; raw JSON contracts under dist/schemas/ stay unchanged',
  );
});
