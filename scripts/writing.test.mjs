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
    articles.push({ slug: name.replace(/\.md$/, ''), data });
  }
  return articles;
}

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
  assert.ok(articles.length > 0, 'at least one article must be published');
});

test('the writing index lists every article, newest first', () => {
  const indexFile = path.join(distRoot, 'writing', 'index.html');
  assert.ok(fs.existsSync(indexFile), 'dist/writing/index.html must exist; run npm run build first');
  const html = fs.readFileSync(indexFile, 'utf8');
  const articles = loadArticles();

  for (const article of articles) {
    assert.ok(html.includes(article.data.title), `index must list "${article.data.title}"`);
    assert.ok(html.includes(article.data.description), `index must summarize "${article.data.title}"`);
  }

  const shown = [...html.matchAll(/href="(\/writing\/[a-z0-9-]+\/)"/g)].map((m) => m[1]);
  const expected = newestFirst(articles).map((article) => `/writing/${article.slug}/`);
  assert.deepEqual(shown, expected, 'index must list every article exactly once, newest first');
});

test('the index offers the RSS feed as an alternate', () => {
  const html = fs.readFileSync(path.join(distRoot, 'writing', 'index.html'), 'utf8');
  assert.ok(html.includes('href="/writing/feed.xml"'), 'index must link the feed');
  assert.ok(/<a[^>]*href="\/writing\/feed\.xml"[^>]*rel="alternate"/.test(html)
    || /<a[^>]*rel="alternate"[^>]*href="\/writing\/feed\.xml"/.test(html),
    'feed link must be marked rel="alternate"');
});

test('every article page renders its title, date, summary, tags, and related links', () => {
  for (const article of loadArticles()) {
    const file = path.join(distRoot, 'writing', article.slug, 'index.html');
    assert.ok(fs.existsSync(file), `${article.slug}: built article page must exist`);
    const html = fs.readFileSync(file, 'utf8');

    // The article must be a full page (layout chain intact), with the site's
    // title treatment, not a bare fragment.
    assert.ok(html.startsWith('<!doctype html>'), `${article.slug}: page must be a full HTML document`);
    assert.ok(html.includes(`<title>${article.data.title} — ${site.title}</title>`),
      `${article.slug}: page title must combine the article and site titles`);
    assert.ok(html.includes(`<link rel="canonical" href="${site.url}/writing/${article.slug}/">`),
      `${article.slug}: page must declare its canonical URL`);

    const heading = new RegExp(`<h1[^>]*>[\\s\\S]*?${escapeRegExp(article.data.title)}[\\s\\S]*?</h1>`);
    assert.ok(heading.test(html), `${article.slug}: page must have the title as its heading`);
    assert.ok(html.includes(article.data.description), `${article.slug}: page must show the summary`);
    assert.ok(html.includes(longDate(article.data.date)), `${article.slug}: page must show its date`);
    for (const tag of displayTags(article)) {
      assert.ok(html.includes(tag), `${article.slug}: page must show tag "${tag}"`);
    }
    for (const related of article.data.related ?? []) {
      assert.ok(html.includes(`href="${related.href}"`),
        `${article.slug}: page must link related target "${related.href}"`);
    }
    assert.ok(html.includes('href="/writing/"'), `${article.slug}: page must link back to the index`);
  }
});

test('the RSS feed mirrors the article list, newest first', () => {
  const feedFile = path.join(distRoot, 'writing', 'feed.xml');
  assert.ok(fs.existsSync(feedFile), 'dist/writing/feed.xml must exist; run npm run build first');
  const xml = fs.readFileSync(feedFile, 'utf8');
  const siteUrl = site.url;

  assert.ok(xml.startsWith('<?xml version="1.0"'), 'feed must be XML');
  assert.ok(xml.includes('<rss version="2.0"'), 'feed must be RSS 2.0');

  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);
  const articles = loadArticles();
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

test('the main navigation offers the writing section', () => {
  const html = fs.readFileSync(path.join(distRoot, 'index.html'), 'utf8');
  const header = html.slice(0, html.indexOf('<main'));
  assert.ok(header.includes('<a href="/writing/"'), 'site nav must link /writing/');
});

function longDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
