/**
 * Writing helpers: draft visibility, fenced-code colouring, the
 * {% figure %} / {% video %} shortcodes and hero images from lib/writing.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const writing = require('../lib/writing.js');

const plain = (text) => text;
const kw = (options) => ({ ...options, __keywords: true });

test('drafts render only while serving or watching', () => {
  assert.equal(writing.isPublished({ draft: true }, 'build'), false);
  assert.equal(writing.isPublished({ draft: true }, undefined), false);
  assert.equal(writing.isPublished({ draft: true }, 'serve'), true);
  assert.equal(writing.isPublished({ draft: true }, 'watch'), true);
  assert.equal(writing.isPublished({}, 'build'), true);
});

test('JSON fences colour keys, values and comments, and escape markup', () => {
  const html = writing.highlight('{\n  // note\n  "id": "a<b>",\n  "n": 2\n}', 'jsonc');
  assert.match(html, /<span class="code-comment">\/\/ note<\/span>/);
  assert.match(html, /<span class="code-key">"id"<\/span>/);
  assert.match(html, /<span class="code-value">"a&lt;b&gt;"<\/span>/);
  assert.match(html, /<span class="code-value">2<\/span>/);
});

test('CSS fences colour properties, custom properties and values', () => {
  const html = writing.highlight('h1 { color: var(--brand); width: 50%; }', 'css');
  assert.match(html, /<span class="code-key">color<\/span>/);
  assert.match(html, /<span class="code-value">--brand<\/span>/);
  assert.match(html, /<span class="code-value">50%<\/span>/);
  assert.ok(html.startsWith('h1 {'), 'digits inside selectors stay plain');
});

test('HTML fences colour tags, attributes, values and comments', () => {
  const html = writing.highlight('<!-- note -->\n<acme-button variant="x">Save</acme-button>', 'html');
  assert.match(html, /<span class="code-comment">&lt;!-- note --&gt;<\/span>/);
  assert.match(html, /&lt;<span class="code-key">acme-button<\/span> <span class="code-attr">variant<\/span>=<span class="code-value">"x"<\/span>&gt;Save/);
  assert.match(html, /&lt;\/<span class="code-key">acme-button<\/span>&gt;/);
});

test('JavaScript fences colour keywords, strings, numbers and comments', () => {
  const html = writing.highlight('import a from "b"; // see "c"\nconst t = `${x}`; n = 1;', 'js');
  assert.match(html, /<span class="code-key">import<\/span> a <span class="code-key">from<\/span> <span class="code-value">"b"<\/span>/);
  assert.match(html, /<span class="code-comment">\/\/ see "c"<\/span>/, 'quotes inside comments stay comment');
  assert.match(html, /<span class="code-value">`\$\{x\}`<\/span>/);
  assert.match(html, /<span class="code-value">1<\/span>/);
  assert.equal(writing.highlight('x', 'javascript'), writing.highlight('x', 'js'));
});

test('table cells are labelled with their column heading', async () => {
  const MarkdownIt = (await import('markdown-it')).default;
  const html = new MarkdownIt().use(writing.labelTableCells).render('| | The `a` | B |\n| --- | --- | --- |\n| Row | 1 | 2 |\n');
  assert.match(html, /<td data-label="">Row<\/td>/);
  assert.match(html, /<td data-label="The a">1<\/td>/);
  assert.match(html, /<td data-label="B">2<\/td>/);
});

test('unknown fence languages are escaped but not coloured', () => {
  assert.equal(writing.highlight('<b> & "x"', 'sh'), '&lt;b&gt; &amp; "x"');
});

test('image sizes are read from the file header', () => {
  const size = writing.imageSize(path.resolve('src/assets/language-server-token-deprecation-hover.webp'));
  assert.deepEqual(size, { width: 1891, height: 1032 });

  // A minimal PNG header: signature + IHDR with 640x360.
  const png = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(360, 20);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'writing-')), 'x.png');
  fs.writeFileSync(file, png);
  assert.deepEqual(writing.imageSize(file), { width: 640, height: 360 });
});

const SCREENSHOT = '/assets/language-server-token-deprecation-hover.webp';
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'writing-img-'));

test('figure renders a responsive, lazy picture with an inline-Markdown caption', async () => {
  const html = await writing.figure(
    { src: SCREENSHOT, alt: 'A "hover"', caption: '**Lead.** Text' },
    (text) => text.replace(/\*\*(.+?)\*\*/, '<strong>$1</strong>'),
    { outputDir },
  );
  assert.match(html, /<picture><source type="image\/avif" srcset="[^"]*480w[^"]*1891w"/);
  assert.match(html, /<img src="\/assets\/img\/[\w-]+-1891\.webp"/, 'src is the largest WebP');
  assert.match(html, /alt="A &quot;hover&quot;"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /width="1891" height="1032"/);
  assert.match(html, /sizes="[^"]+"/);
  assert.match(html, /<figcaption><strong>Lead\.<\/strong> Text<\/figcaption>/);

  const files = fs.readdirSync(path.join(outputDir, 'assets', 'img'));
  const widths = files.filter((f) => f.endsWith('.webp')).map((f) => Number(f.match(/-(\d+)\.webp$/)[1])).sort((a, b) => a - b);
  assert.deepEqual(widths, [480, 960, 1440, 1891], 'resized to the standard widths, never upscaled');
  assert.ok(files.some((f) => f.endsWith('.avif')), 'AVIF versions are written');
});

test('figure requires alt text', async () => {
  await assert.rejects(writing.figure({ src: SCREENSHOT }, plain, { outputDir }), /needs alt text/);
});

test('heroes are eager on the page and decorative on index cards', async () => {
  const hero = { src: SCREENSHOT, alt: 'A hover' };
  const page = await writing.heroPicture(hero, 'page', { outputDir });
  assert.match(page, /alt="A hover"/);
  assert.match(page, /loading="eager"/);
  assert.match(page, /fetchpriority="high"/);

  const card = await writing.heroPicture(hero, 'card', { outputDir });
  assert.match(card, /alt=""/);
  assert.match(card, /class="writing-card__image"/);
  assert.match(card, /loading="lazy"/);
  assert.match(await writing.heroPicture(hero, 'card-first', { outputDir }), /loading="eager"/);
});

test('share images are 1200px JPEGs', async () => {
  const share = await writing.shareImage(SCREENSHOT, { outputDir });
  assert.match(share.url, /^\/assets\/img\/[\w-]+-1200\.jpeg$/);
  assert.equal(share.width, 1200);
  assert.equal(share.height, 654);
});

test('feed links, sources, posters and srcset candidates become absolute', () => {
  const html = writing.absoluteLinks(
    '<a href="/a"><source srcset="/x.avif 480w, /y.avif 960w"><img src="/z.webp"><video poster="/p.webp"><a href="https://e.org/">',
    'https://designlasagna.recipes/',
  );
  assert.equal(
    html,
    '<a href="https://designlasagna.recipes/a"><source srcset="https://designlasagna.recipes/x.avif 480w, https://designlasagna.recipes/y.avif 960w"><img src="https://designlasagna.recipes/z.webp"><video poster="https://designlasagna.recipes/p.webp"><a href="https://e.org/">',
  );
});

test('video renders an accessible, non-autoplaying player sized by its poster', () => {
  const html = writing.video(
    {
      src: '/assets/demo.mp4',
      poster: '/assets/language-server-token-deprecation-hover.webp',
      label: 'Demo',
      captions: '/assets/demo.vtt',
      loop: true,
    },
    plain,
  );
  assert.match(html, /<video controls preload="none" playsinline loop muted poster="[^"]+" width="1891" height="1032" aria-label="Demo">/);
  assert.match(html, /<source src="\/assets\/demo\.mp4" type="video\/mp4">/);
  assert.match(html, /<track kind="captions" src="\/assets\/demo\.vtt" srclang="en" label="English" default>/);
  assert.doesNotMatch(html, /autoplay/);
});

test('video requires a poster, a label and a known format', () => {
  assert.throws(() => writing.video({ src: '/a.mp4', label: 'x' }, plain), /needs a poster/);
  assert.throws(() => writing.video({ src: '/a.mp4', poster: '/p.png', width: 1, height: 1 }, plain), /needs a label/);
  assert.throws(() => writing.video({ src: '/a.avi', poster: '/p.png', label: 'x', width: 1, height: 1 }, plain), /\.mp4, \.webm or \.mov/);
});

test('shortcodes insist on keyword arguments', () => {
  assert.throws(() => writing.keywords(['/a.png'], 'figure'), /keyword arguments/);
  assert.deepEqual(writing.keywords([kw({ src: '/a.png' })], 'figure').src, '/a.png');
});

test('hero images are optional, need alt text, and are sized from the file', () => {
  assert.equal(writing.heroImage(undefined), null);
  assert.throws(() => writing.heroImage({ src: '/assets/language-server-token-deprecation-hover.webp' }), /needs alt text/);
  assert.throws(() => writing.heroImage('/assets/x.webp'), /needs src/);
  assert.deepEqual(
    writing.heroImage({ src: '/assets/language-server-token-deprecation-hover.webp', alt: 'A hover', caption: 'C' }),
    { src: '/assets/language-server-token-deprecation-hover.webp', alt: 'A hover', caption: 'C', width: 1891, height: 1032 },
  );
});
