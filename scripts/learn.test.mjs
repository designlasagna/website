/**
 * Learn section checks.
 *
 * Guides are Markdown files in src/content/learn/ rendered through
 * src/_includes/guide.njk. They are maintained rather than dated, so each one
 * must say what the reader will have at the end, what they need first, and
 * which releases it was last checked against. These tests verify the source
 * front matter, the built index and guide pages, and the main navigation.
 *
 * Run through `npm run check`, which builds dist/ first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const learnSource = path.join(projectRoot, 'src', 'content', 'learn');

function loadGuides() {
  const guides = [];
  for (const name of fs.readdirSync(learnSource)) {
    if (!name.endsWith('.md')) continue;
    const raw = fs.readFileSync(path.join(learnSource, name), 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(match, `${name} must start with front matter`);
    guides.push({ slug: name.replace(/\.md$/, ''), data: YAML.parse(match[1]) });
  }
  return guides;
}

const published = () => loadGuides().filter((guide) => guide.data.draft !== true);

// With every guide drafted, the section is not built at all; the index and
// nav checks are skipped and the empty-section test runs instead.
const NONE_PUBLISHED = published().length === 0 && 'no published guides (the section is not built)';
const mainNav = (html) => html.slice(html.indexOf('<nav class="site-nav"'), html.indexOf('</nav>', html.indexOf('<nav class="site-nav"')));

test('every guide states its outcome, prerequisites and when it was last checked', () => {
  const guides = loadGuides();
  assert.ok(guides.length > 0, 'the section must have at least one guide, published or draft');
  for (const { slug, data } of guides) {
    assert.equal(data.layout, 'guide.njk', `${slug}: guides use the guide layout`);
    assert.equal(data.permalink, `/learn/${slug}/`, `${slug}: permalink must match the file name`);
    assert.ok(data.tags?.includes('learn'), `${slug}: must be tagged "learn" to join the section`);
    for (const field of ['title', 'description', 'outcome', 'updated']) {
      assert.ok(data[field], `${slug}: must set ${field}`);
    }
    assert.ok(Array.isArray(data.prerequisites) && data.prerequisites.length, `${slug}: must list prerequisites`);
    assert.ok(Array.isArray(data.testedWith) && data.testedWith.length, `${slug}: must list the releases it was checked with`);
  }
});

test('the Learn index lists every published guide', { skip: NONE_PUBLISHED }, () => {
  const html = fs.readFileSync(path.join(distRoot, 'learn', 'index.html'), 'utf8');
  const shown = [...html.matchAll(/href="(\/learn\/[a-z0-9-]+\/)"/g)].map((m) => m[1]);
  const expected = published().map((guide) => `/learn/${guide.slug}/`);
  assert.deepEqual([...shown].sort(), [...expected].sort(), 'index must list every published guide once');
});

test('guide pages show the facts panel and link back to Learn', () => {
  for (const { slug, data } of published()) {
    const html = fs.readFileSync(path.join(distRoot, 'learn', slug, 'index.html'), 'utf8');
    assert.match(html, /<dl class="guide-facts">/, `${slug}: page must open with the facts panel`);
    for (const label of ['You will have', 'Before you start', 'Last checked']) {
      assert.ok(html.includes(`<dt>${label}</dt>`), `${slug}: facts panel must include "${label}"`);
    }
    for (const release of data.testedWith) {
      assert.ok(html.includes(release), `${slug}: page must name "${release}"`);
    }
    assert.ok(html.includes('href="/learn/"'), `${slug}: page must link back to the index`);
  }
});

test('drafted guides are left out of the production build', () => {
  const indexFile = path.join(distRoot, 'learn', 'index.html');
  const index = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '';
  for (const { slug } of loadGuides().filter((guide) => guide.data.draft === true)) {
    assert.ok(!fs.existsSync(path.join(distRoot, 'learn', slug)), `${slug}: draft must not be built`);
    assert.ok(!index.includes(`/learn/${slug}/`), `${slug}: draft must not be listed`);
  }
});

test('with nothing published, Learn is not built or linked', { skip: !NONE_PUBLISHED && 'guides are published' }, () => {
  assert.ok(!fs.existsSync(path.join(distRoot, 'learn')), 'no /learn/ pages are built');
  for (const page of ['index.html', 'tools/index.html', 'docs/index.html']) {
    const html = fs.readFileSync(path.join(distRoot, page), 'utf8');
    assert.ok(!mainNav(html).includes('href="/learn/"'), `${page}: nav must not link the empty section`);
  }
  assert.ok(!fs.readFileSync(path.join(distRoot, 'sitemap.xml'), 'utf8').includes('/learn/'), 'sitemap must not list it');
});

test('the main navigation names the tools "Tasty parts", then Docs, Learn and Writing when they have content', () => {
  const html = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  const links = [...mainNav(html).matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
  const built = (section) => fs.existsSync(path.join(distRoot, section, 'index.html'));
  assert.deepEqual(links, [
    ['/tools/', 'Tasty parts'],
    ['/docs/', 'Docs'],
    ...(built('learn') ? [['/learn/', 'Learn']] : []),
    ...(built('writing') ? [['/writing/', 'Writing']] : []),
  ]);
});
