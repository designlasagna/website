/**
 * The schemas changelog page renders the package's CHANGELOG.md through
 * src/_data/schemasChangelog.js, and falls back to hand-written entries when
 * the installed package ships none. Both modes must expose #v0-4-0, which the
 * v0.3 to v0.4 migration guide links to.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const changelog = require('../src/_data/schemasChangelog.js');

const FIXTURE = `# Changelog

## Unreleased

### Added

- Something <new>.

## 0.4.0 - 2026-02-03

### Breaking

- Closed \`usage\`.

## 0.3.4

- Older.
`;

test('Markdown changelog renders release anchors and headings', () => {
  const html = changelog.renderChangelog(FIXTURE);
  assert.ok(!html.includes('<h1'), 'package title h1 is dropped; the page has its own');
  assert.match(html, /<h2 id="unreleased">Unreleased<\/h2>/);
  assert.match(html, /<h2 id="v0-4-0">0\.4\.0 - 2026-02-03<\/h2>/);
  assert.match(html, /<h2 id="v0-3-4">0\.3\.4<\/h2>/);
  assert.match(html, /<h3>Breaking<\/h3>/);
  assert.match(html, /<code>usage<\/code>/);
  assert.ok(html.includes('&lt;new&gt;'), 'raw HTML in Markdown is escaped');
});

test('load() reads a file and returns empty html when it is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelog-'));
  try {
    const file = path.join(dir, 'CHANGELOG.md');
    assert.equal(changelog.load(file).html, '');
    fs.writeFileSync(file, FIXTURE);
    assert.match(changelog.load(file).html, /id="v0-4-0"/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the build reads the installed package CHANGELOG.md', () => {
  const src = fs.readFileSync('src/_data/schemasChangelog.js', 'utf8');
  assert.match(src, /node_modules", "@designlasagna", "schemas", "CHANGELOG\.md"/);
});

test('the page template keeps hand-written fallback entries with the v0-4-0 anchor', () => {
  const page = fs.readFileSync('src/content/tools/schemas/changelog/index.html', 'utf8');
  assert.match(page, /\{% else %\}[\s\S]*<section class="change-entry" id="v0-4-0">[\s\S]*\{% endif %\}/);
  assert.ok(!/<h3>/.test(page), 'per-contract lists live in the package changelog, not the page');
});

test('built page exposes #v0-4-0 whichever mode is active', { skip: !fs.existsSync('dist/tools/schemas/changelog/index.html') }, () => {
  const html = fs.readFileSync('dist/tools/schemas/changelog/index.html', 'utf8');
  assert.match(html, /id="v0-4-0"/);
});
