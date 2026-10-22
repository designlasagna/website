/**
 * Writing section checks.
 *
 * The writing section is generated from Markdown articles in
 * src/content/writing/ plus two templates: the index (which must list every
 * article, newest first) and the RSS feed. These tests verify the built
 * output keeps the three in sync, that every article renders its required
 * front-matter fields, and that the section is reachable from the main nav.
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
const writingSource = path.join(projectRoot, 'src', 'content', 'writing');
const site = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'src', '_data', 'site.json'), 'utf8'),
);

/** Front matter and slug for each Markdown article in the source. */
function loadArticles() {
  const articles = [];
  for (const name of fs.readdirSync(writingSource)) {
    if (!name.endsWith('.md')) continue;
    const raw = fs.readFileSync(path.join(writingSource, name), 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(match, `${name} must start with front matter`);
    const data = YAML.parse(match[1]);
    assert.ok(data.title, `${name} must set a title`);
    assert.ok(data.date, `${name} must set a date`);
    assert.ok(data.description, `${name} must set a description (index summary)`);
    assert.ok(Array.isArray(data.tags) && data.tags.includes('writing'),
      `${name} must be tagged "writing" to join the section`);
    articles.push({ slug: name.replace(/\.md$/, ''), data, draft: data.draft === true });
  }
  return articles;
}

/** Articles a production build publishes (drafts are left out). */
function loadPublished() {
  return loadArticles().filter((article) => !article.draft);
}

// With every article drafted, the section is not built at all; the checks
// that need a built index, feed or nav item are skipped and the empty-section
// test runs instead.
const NONE_PUBLISHED = loadPublished().length === 0 && 'no published articles (the section is not built)';
const mainNav = (html) => html.slice(html.indexOf('<nav class="site-nav"'), html.indexOf('</nav>', html.indexOf('<nav class="site-nav"')));

/** Articles sorted newest first, the order the index and feed must use. */
function newestFirst(articles) {
  return [...articles].sort((a, b) =>
    a.data.date.valueOf() === b.data.date.valueOf()
      ? a.slug.localeCompare(b.slug)
      : b.data.date.valueOf() - a.data.date.valueOf(),
  );
}

function displayTags(article) {
  return article.data.tags.filter((tag) => tag !== 'all' && tag !== 'writing');
}

test('writing articles have complete front matter', () => {
  const articles = loadArticles();
  assert.ok(articles.length > 0, 'the section must have at least one article, published or draft');
});

test('the writing index lists every article, newest first', { skip: NONE_PUBLISHED }, () => {
  const indexFile = path.join(distRoot, 'writing', 'index.html');
  assert.ok(fs.existsSync(indexFile), 'dist/writing/index.html must exist; run npm run build first');
  const html = fs.readFileSync(indexFile, 'utf8');
  const articles = loadPublished();

  for (const article of articles) {
    assert.ok(html.includes(escapeHtml(article.data.title)), `index must list "${article.data.title}"`);
    assert.ok(html.includes(escapeHtml(article.data.description)), `index must summarize "${article.data.title}"`);
  }

  const shown = [...html.matchAll(/href="(\/writing\/[a-z0-9-]+\/)"/g)].map((m) => m[1]);
  const expected = newestFirst(articles).map((article) => `/writing/${article.slug}/`);
  assert.deepEqual(shown, expected, 'index must list every article exactly once, newest first');
});

test('the index offers the RSS feed as an alternate', { skip: NONE_PUBLISHED }, () => {
  const html = fs.readFileSync(path.join(distRoot, 'writing', 'index.html'), 'utf8');
  assert.ok(html.includes('href="/writing/feed.xml"'), 'index must link the feed');
  assert.ok(/<a[^>]*href="\/writing\/feed\.xml"[^>]*rel="alternate"/.test(html)
    || /<a[^>]*rel="alternate"[^>]*href="\/writing\/feed\.xml"/.test(html),
    'feed link must be marked rel="alternate"');
});

test('every article page renders its title, date, summary, tags, and related links', () => {
  for (const article of loadPublished()) {
    const file = path.join(distRoot, 'writing', article.slug, 'index.html');
    assert.ok(fs.existsSync(file), `${article.slug}: built article page must exist`);
    const html = fs.readFileSync(file, 'utf8');

    // The article must be a full page (layout chain intact), with the site's
    // title treatment, not a bare fragment.
    assert.ok(html.startsWith('<!doctype html>'), `${article.slug}: page must be a full HTML document`);
    assert.ok(html.includes(`<title>${escapeHtml(article.data.title)} — ${site.title}</title>`),
      `${article.slug}: page title must combine the article and site titles`);
    assert.ok(html.includes(`<link rel="canonical" href="${site.url}/writing/${article.slug}/">`),
      `${article.slug}: page must declare its canonical URL`);

    const heading = new RegExp(`<h1[^>]*>[\\s\\S]*?${escapeRegExp(escapeHtml(article.data.title))}[\\s\\S]*?</h1>`);
    assert.ok(heading.test(html), `${article.slug}: page must have the title as its heading`);
    assert.ok(html.includes(escapeHtml(article.data.description)), `${article.slug}: page must show the summary`);
    assert.ok(html.includes(longDate(article.data.date)), `${article.slug}: page must show its date`);
    for (const tag of displayTags(article)) {
      assert.ok(html.includes(tag), `${article.slug}: page must show tag "${tag}"`);
    }
    for (const related of article.data.related ?? []) {
      assert.ok(html.includes(`href="${related.href}"`),
        `${article.slug}: page must link related target "${related.href}"`);
    }
    assert.ok(html.includes('href="/writing/"'), `${article.slug}: page must link back to the index`);

    // Sharing and search metadata identify the page as a dated article.
    assert.ok(html.includes('<meta property="og:type" content="article">'), `${article.slug}: og:type must be article`);
    assert.ok(html.includes(`<meta property="article:published_time" content="${isoDate(article.data.date)}">`),
      `${article.slug}: page must declare its publish date`);
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ld, `${article.slug}: page must carry JSON-LD`);
    const posting = JSON.parse(ld[1]);
    assert.equal(posting['@type'], 'BlogPosting');
    assert.equal(posting.headline, article.data.title);
    assert.equal(posting.datePublished, isoDate(article.data.date));
    assert.ok(html.includes('<link rel="alternate" type="application/rss+xml"'), `${article.slug}: page must advertise the feed`);

    // A hero image is shown on the page and becomes the share preview.
    if (article.data.hero) {
      const og = html.match(/<meta property="og:image" content="([^"]+)">/);
      assert.ok(og && og[1].startsWith(`${site.url}/assets/img/`) && og[1].endsWith('-1200.jpeg'),
        `${article.slug}: the hero's 1200px JPEG must be the og:image`);
      assert.ok(fs.existsSync(path.join(distRoot, new URL(og[1]).pathname)), `${article.slug}: og:image file must be built`);
      assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), `${article.slug}: hero posts use the large card`);
      assert.match(html, /<figure class="article-hero">\s*<picture>/, `${article.slug}: page must show its hero`);
    } else {
      assert.ok(!html.includes('og:image'), `${article.slug}: no og:image without a hero`);
    }

    // Every image and video reserves its space before loading.
    for (const media of html.matchAll(/<(img|video)\b[^>]*>/g)) {
      if (media[0].includes('logotype.svg')) continue;
      assert.match(media[0], /width="\d+" height="\d+"/, `${article.slug}: ${media[1]} must be sized`);
    }
  }
});

test('drafts are left out of the production build', () => {
  const read = (...parts) => {
    const file = path.join(distRoot, ...parts);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  };
  const index = read('writing', 'index.html');
  const feed = read('writing', 'feed.xml');
  const sitemap = fs.readFileSync(path.join(distRoot, 'sitemap.xml'), 'utf8');
  for (const article of loadArticles().filter((a) => a.draft)) {
    const url = `/writing/${article.slug}/`;
    assert.ok(!fs.existsSync(path.join(distRoot, 'writing', article.slug)), `${article.slug}: draft must not be built`);
    for (const [name, text] of [['index', index], ['feed', feed], ['sitemap', sitemap]]) {
      assert.ok(!text.includes(url), `${article.slug}: draft must not appear in the ${name}`);
    }
  }
});

test('other pages stay typed as websites', () => {
  const html = fs.readFileSync(path.join(distRoot, 'tools', 'index.html'), 'utf8');
  assert.ok(html.includes('<meta property="og:type" content="website">'));
  assert.ok(!html.includes('application/ld+json'));
});

test('the RSS feed mirrors the article list, newest first', { skip: NONE_PUBLISHED }, () => {
  const feedFile = path.join(distRoot, 'writing', 'feed.xml');
  assert.ok(fs.existsSync(feedFile), 'dist/writing/feed.xml must exist; run npm run build first');
  const xml = fs.readFileSync(feedFile, 'utf8');
  const siteUrl = site.url;

  assert.ok(xml.startsWith('<?xml version="1.0"'), 'feed must be XML');
  assert.ok(xml.includes('<rss version="2.0"'), 'feed must be RSS 2.0');

  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);
  const articles = loadPublished();
  assert.equal(items.length, articles.length, 'feed must contain one item per article');

  for (const [index, article] of newestFirst(articles).entries()) {
    const item = items[index];
    const url = `${siteUrl}/writing/${article.slug}/`;
    assert.ok(item.includes(`<link>${url}</link>`), `feed item ${index + 1} must link the article`);
    assert.ok(item.includes(`<title>${article.data.title}</title>`),
      `feed item ${index + 1} must carry the article title`);
    assert.ok(item.includes('<pubDate>'), `feed item ${index + 1} must carry a pubDate`);
    assert.ok(item.includes('content:encoded'), `feed item ${index + 1} must embed the content`);
  }
});

test('the main navigation offers the writing section', { skip: NONE_PUBLISHED }, () => {
  const html = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  const header = html.slice(0, html.indexOf('<main'));
  assert.ok(header.includes('<a href="/writing/"'), 'site nav must link /writing/');
});

test('with nothing published, Writing is not built or linked', { skip: !NONE_PUBLISHED && 'articles are published' }, () => {
  assert.ok(!fs.existsSync(path.join(distRoot, 'writing')), 'no /writing/ pages or feed are built');
  for (const page of ['index.html', 'tools/index.html', 'docs/index.html']) {
    const html = fs.readFileSync(path.join(distRoot, page), 'utf8');
    assert.ok(!mainNav(html).includes('href="/writing/"'), `${page}: nav must not link the empty section`);
  }
  assert.ok(!fs.readFileSync(path.join(distRoot, 'sitemap.xml'), 'utf8').includes('/writing/'), 'sitemap must not list it');
});

function longDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Mirrors Nunjucks autoescaping, which the templates apply to front matter. */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function isoDate(value) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
