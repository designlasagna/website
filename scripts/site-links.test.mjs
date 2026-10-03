/**
 * Built-site internal link check.
 *
 * Walks every HTML file in dist/ and resolves each root-relative href
 * against the built output. A route is only published if a real file backs
 * it: a trailing-slash route needs <dir>/index.html, and a directory without
 * an index is treated as missing — that is exactly how the
 * /docs/schemas/v0.4/ directory-only "route" slipped through.
 *
 * Run through `npm run check`, which builds dist/ first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

/** The dist file that would publish a root-relative route. */
function routeFile(href) {
  const base = path.join(distRoot, href);
  return href.endsWith('/') ? path.join(base, 'index.html') : base;
}

function isPublishedRoute(href) {
  const file = routeFile(href);
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

test('every root-relative link in the built site resolves to a published file', () => {
  assert.ok(fs.existsSync(distRoot) && fs.statSync(distRoot).isDirectory(), 'dist/ must exist; run npm run build before this test');
  const htmlFiles = listHtmlFiles(distRoot);
  assert.ok(htmlFiles.length > 0, 'no built HTML files found in dist/');

  const routes = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      // Skip in-page anchors, external/protocol URLs, and protocol-relative URLs.
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const pathname = new URL(href, 'http://localhost').pathname;
      if (pathname) routes.add(pathname);
    }
  }

  const missing = [...routes].filter((href) => !isPublishedRoute(href)).sort();
  assert.deepEqual(
    missing,
    [],
    `built site links to unpublished routes (a directory without index.html is missing): ${missing.join(', ')}`,
  );
});
