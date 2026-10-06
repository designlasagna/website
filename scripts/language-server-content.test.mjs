import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const pages = [
  { route: '/tools/language-server/', file: 'tools/language-server/index.html' },
  { route: '/tools/language-server/changelog/', file: 'tools/language-server/changelog/index.html' },
  { route: '/docs/language-server/', file: 'docs/language-server/index.html' }
];
const contents = pages.map(p => ({ ...p, html: fs.readFileSync(path.join(distDir, p.file), 'utf8') }));
const [tool, changelog, docs] = contents;

function resolveInternal(href, pageRoute) {
  if (!href || (!href.startsWith('/') && !href.startsWith('#'))) return null;
  const url = new URL(href, 'https://local.test' + pageRoute);
  if (url.origin !== 'https://local.test') return null;
  let pathname = decodeURIComponent(url.pathname);
  const hash = url.hash ? decodeURIComponent(url.hash.slice(1)) : null;
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = path.join(distDir, pathname);
  if (!fs.existsSync(filePath)) return { error: 'file_not_found' };
  if (hash) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(`id="${hash}"`)) return { error: 'anchor_not_found' };
  }
  return { filePath };
}

const v04Links = ['/schemas/v0.4/tokens.json', '/schemas/v0.4/utilities.json', '/schemas/v0.4/icons.json', '/schemas/v0.4/cem-extensions.json', '/schemas/v0.4/dtcg-extensions.json', '/schemas/v0.4/lifecycle.json'];
const sections = changelog.html.match(/<section class="change-entry">[\s\S]*?<\/section>/g) || [];
const vscodeSection = sections.find(s => s.includes('v0.2.0') && s.includes('>VS Code extension</span>'));
const npmSection = sections.find(s => s.includes('v0.2.0') && s.includes('>npm server</span>'));
const oldSection = sections.find(s => s.includes('v0.1.4'));

const allHrefs = [];
for (const p of contents) {
  for (const m of p.html.matchAll(/href="([^"]+)"/g)) {
    if (m[1].startsWith('/') || m[1].startsWith('#')) allHrefs.push({ href: m[1], route: p.route });
  }
}

test('tool page version and Zed availability', () => {
  assert.match(tool.html, /v0\.2\.0/i);
  assert.match(tool.html, /pre-?release/i);
  assert.match(tool.html, /minimum\s+vs\s*code\s+1\.90/i);
  assert.match(tool.html, /awaiting\s+review/i);
  assert.match(tool.html, /no\s+public\s+registry\s+install/i);
});

test('changelog separates released editor and npm artifacts', () => {
  assert.ok(vscodeSection, 'VS Code 0.2.0 section missing');
  assert.match(vscodeSection, /2026-10-02/);
  assert.match(vscodeSection, /pre-?release/i);
  assert.match(vscodeSection, /no\s+separate\s+npm\s+install/i);
  assert.ok(npmSection, 'npm section missing');
  assert.notEqual(npmSection, vscodeSection);
  assert.ok(oldSection, '0.1.4 section missing');
  assert.ok(!oldSection.includes('Latest'), '0.1.4 should not be latest');
});

test('docs installation, compatibility and lifecycle', () => {
  assert.match(docs.html, /Install Pre-Release/i);
  assert.match(docs.html, /Switch to Pre-Release Version/i);
  assert.match(docs.html, /Minimum VS Code version is 1\.90/i);
  assert.match(docs.html, /@designlasagna\/ds-language-server@0\.2\.0/);
  assert.match(docs.html, /href="\/docs\/schemas\/v0\.4\/tokens\//);
  assert.doesNotMatch(docs.html, /compatibility\s+references/i);
  assert.match(docs.html, /opt-?in/i);
  assert.match(docs.html, /lifecycle\.profile/i);
  assert.match(docs.html, /schemaVersion/);
  assert.match(docs.html, /0\.4\.0/);
});

test('v0.4 links', () => {
  for (const link of v04Links) {
    assert.ok(docs.html.includes(`href="${link}"`), `Missing ${link}`);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(distDir, link), 'utf8')));
  }
});

test('internal links and anchors resolve', () => {
  for (const { href, route } of allHrefs) {
    const res = resolveInternal(href, route);
    if (new URL(href, 'https://local.test' + route).origin !== 'https://local.test') continue;
    assert.ok(res, `Failed to resolve ${href}`);
    assert.ok(!res.error, `${route} → ${href}: ${res.error}`);
  }
});

test('negative missing file and fragment; query and external handling', () => {
  assert.equal(resolveInternal('/nonexistent/', '/tools/language-server/').error, 'file_not_found');
  assert.equal(resolveInternal('/tools/language-server/#bad', '/tools/language-server/').error, 'anchor_not_found');
  assert.ok(!resolveInternal('/docs/language-server/?from=tool#install', '/tools/language-server/').error);
  assert.equal(resolveInternal('//example.org/elsewhere', '/tools/language-server/'), null);
});
