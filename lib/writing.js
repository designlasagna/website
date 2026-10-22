// Helpers for the writing section: draft handling, code colouring for
// Markdown fences, responsive images, and the figure/video shortcodes. Kept
// separate from eleventy.config.js so scripts/writing-media.test.mjs can call
// them directly. Resizing uses @11ty/eleventy-img; everything else is
// dependency-free.

const fs = require("node:fs");
const path = require("node:path");

const SRC_ROOT = path.resolve(__dirname, "..", "src");

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Drafts render while writing (`eleventy --serve` / `--watch`) and are left
// out of production builds: no page, no index entry, no feed item.
function isPublished(data, runMode) {
  return !data.draft || runMode === "serve" || runMode === "watch";
}

// Fenced code colouring for the languages the posts use: JSON and CSS for
// design-system artifacts, HTML for usage, JavaScript for tooling. Any other
// language is escaped and shown as plain text.
// Each colouriser receives text with only &, < and > escaped (quotes are
// safe in element content), as the docs' jsonCode filter does.
const COLOURISERS = {
  json: (code) =>
    code.replace(
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      (match, comment, key) =>
        `<span class="code-${comment ? "comment" : key ? "key" : "value"}">${match}</span>`,
    ),
  css: (code) =>
    code.replace(
      /(\/\*[\s\S]*?\*\/)|(--[\w-]+)|([\w-]+)(?=\s*:[^;{}]*[;}])|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[0-9a-fA-F]{3,8}\b|(?<![\w-])-?\d*\.?\d+(?:px|rem|em|%|ms|s|vh|vw|deg)?(?![\w.]))/g,
      (match, comment, custom, property) =>
        `<span class="code-${comment ? "comment" : custom ? "value" : property ? "key" : "value"}">${match}</span>`,
    ),
  html: (code) =>
    code.replace(
      /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w-]+)|([\w:-]+)(?==)|("[^"\n]*")/g,
      (match, comment, open, tag, attribute) =>
        comment ? `<span class="code-comment">${match}</span>`
          : tag ? `${open}<span class="code-key">${tag}</span>`
          : attribute ? `<span class="code-attr">${match}</span>`
          : `<span class="code-value">${match}</span>`,
    ),
  js: (code) =>
    code.replace(
      /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(import|export|from|default|const|let|var|function|return|if|else|for|of|in|new|await|async|with|true|false|null|undefined)\b|(?<![\w$])(\d+(?:\.\d+)?)\b/g,
      (match, comment, string, keyword) =>
        `<span class="code-${comment ? "comment" : keyword ? "key" : "value"}">${match}</span>`,
    ),
};
COLOURISERS.jsonc = COLOURISERS.json;
COLOURISERS.javascript = COLOURISERS.js;
COLOURISERS.mjs = COLOURISERS.js;

function highlight(code, language) {
  const escaped = String(code).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const colourise = COLOURISERS[(language || "").toLowerCase()];
  return colourise ? colourise(escaped) : escaped;
}

// markdown-it plugin: every table cell gets its column heading as
// data-label, so on phones a row can be shown as a stacked card with each
// value labelled. Heading Markdown (backticks, emphasis) is stripped.
function labelTableCells(md) {
  md.core.ruler.push("table_cell_labels", (state) => {
    let headings = [];
    let column = 0;
    let inHead = false;
    state.tokens.forEach((token, index) => {
      if (token.type === "thead_open") { inHead = true; headings = []; }
      if (token.type === "thead_close") inHead = false;
      if (token.type === "tr_open") column = 0;
      if (inHead && token.type === "th_open") {
        headings.push(state.tokens[index + 1].content.replace(/[`*_]/g, "").trim());
      }
      if (!inHead && token.type === "td_open") {
        token.attrSet("data-label", headings[column] ?? "");
        column += 1;
      }
    });
  });
}

// Intrinsic size of a local PNG, JPEG, GIF or WebP, read from its header so
// every figure reserves its space before the image loads.
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) === "PNG") return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
    }
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length; ) {
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error(`Cannot read the dimensions of ${file}; pass width and height`);
}

// Site paths ("/assets/x.webp") resolve against src/, where passthrough
// assets live.
function sizeOf(src, options) {
  if (options.width && options.height) return { width: options.width, height: options.height };
  if (!src.startsWith("/")) throw new Error(`${src}: use a site path such as /assets/…, or pass width and height`);
  return imageSize(path.join(SRC_ROOT, src));
}

// Shortcode keyword arguments arrive as one object; Nunjucks marks it with
// __keywords.
function keywords(args, shortcode) {
  const options = args.find((arg) => arg && typeof arg === "object" && arg.__keywords);
  if (!options) throw new Error(`{% ${shortcode} %} takes keyword arguments, e.g. {% ${shortcode} src="/assets/…" %}`);
  return options;
}

function captionHtml(caption, renderInline) {
  return caption ? `\n  <figcaption>${renderInline(caption)}</figcaption>` : "";
}

// Responsive images. Each source is resized to the widths below (never
// upscaled; the original width is kept as the largest) and encoded as AVIF
// with a WebP fallback. Files land in <output>/assets/img/ with content-hashed
// names, so unchanged images are not re-encoded between builds.
const IMAGE_WIDTHS = [480, 960, 1440, 1920, 2400, "auto"];
const IMAGE_FORMATS = ["avif", "webp"];

// How wide each kind of image is drawn, for the browser to pick a file:
// article figures fill the 46rem reading column, heroes the 68rem canvas,
// index cards the 68rem list minus card padding.
const SIZES = {
  figure: "(min-width: 50rem) 46rem, calc(100vw - 2.5rem)",
  hero: "(min-width: 76rem) 68rem, calc(100vw - 2.5rem)",
  card: "(min-width: 76rem) 64rem, calc(100vw - 5.5rem)",
};

async function loadImage() {
  return (await import("@11ty/eleventy-img")).default;
}

function sourcePath(src) {
  if (!src.startsWith("/")) throw new Error(`${src}: use a site path such as /assets/…`);
  return path.join(SRC_ROOT, src);
}

async function picture(src, attributes, { outputDir, sizes }) {
  const Image = await loadImage();
  const metadata = await Image(sourcePath(src), {
    widths: IMAGE_WIDTHS,
    formats: IMAGE_FORMATS,
    outputDir: path.join(outputDir, "assets", "img"),
    urlPath: "/assets/img/",
  });
  // Browsers pick from srcset, but feed readers usually read src alone, so
  // src is the largest WebP rather than eleventy-img's default smallest.
  const html = Image.generateHTML(metadata, { decoding: "async", sizes, ...attributes });
  return html.replace(`src="${metadata.webp[0].url}"`, `src="${metadata.webp.at(-1).url}"`);
}

// A 1200px JPEG for link previews: the size and format every platform reads.
async function shareImage(src, { outputDir }) {
  const Image = await loadImage();
  const metadata = await Image(sourcePath(src), {
    widths: [1200],
    formats: ["jpeg"],
    outputDir: path.join(outputDir, "assets", "img"),
    urlPath: "/assets/img/",
  });
  const { url, width, height } = metadata.jpeg[0];
  return { url, width, height };
}

// {% figure src="/assets/x.webp", alt="…", caption="**Lead.** Text" %}
// alt is required (pass alt="" for a purely decorative image); the caption
// accepts inline Markdown.
async function figure(options, renderInline, { outputDir }) {
  const { src, alt, caption } = options;
  if (!src) throw new Error("{% figure %} needs src");
  if (typeof alt !== "string") throw new Error(`{% figure src="${src}" %} needs alt text (alt="" if decorative)`);
  const img = await picture(src, { alt, loading: "lazy" }, { outputDir, sizes: SIZES.figure });
  return `<figure>\n  ${img}${captionHtml(caption, renderInline)}\n</figure>`;
}

const VIDEO_TYPES = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime" };

// {% video src="/assets/x.mp4", poster="/assets/x.webp", label="…", caption="…", captions="/assets/x.vtt", loop=true %}
// Never autoplays. A poster is required so the page reserves space and the
// feed has a still; label names the video for screen readers; captions adds
// a WebVTT track; loop makes a silent, looping clip for short UI demos.
function video(options, renderInline) {
  const { src, poster, label, caption, captions, loop } = options;
  if (!src) throw new Error("{% video %} needs src");
  if (!poster) throw new Error(`{% video src="${src}" %} needs a poster image`);
  if (!label) throw new Error(`{% video src="${src}" %} needs a label describing the video`);
  const type = VIDEO_TYPES[path.extname(src).toLowerCase()];
  if (!type) throw new Error(`{% video %}: ${src} must be .mp4, .webm or .mov`);
  const { width, height } = sizeOf(poster, options);
  const attrs = [
    "controls",
    'preload="none"',
    "playsinline",
    ...(loop ? ["loop", "muted"] : []),
    `poster="${escapeHtml(poster)}"`,
    `width="${width}"`,
    `height="${height}"`,
    `aria-label="${escapeHtml(label)}"`,
  ].join(" ");
  const track = captions
    ? `\n    <track kind="captions" src="${escapeHtml(captions)}" srclang="en" label="English" default>`
    : "";
  return `<figure class="article-video">\n  <video ${attrs}>\n    <source src="${escapeHtml(src)}" type="${type}">${track}\n    <a href="${escapeHtml(src)}">Download the video</a>\n  </video>${captionHtml(caption, renderInline)}\n</figure>`;
}

// Front-matter hero image: `hero: { src, alt, caption? }`. Checked and sized
// here so the article page, the index card, the feed and the share preview
// all agree. Returns null when the post has no hero.
function heroImage(hero) {
  if (!hero) return null;
  if (typeof hero !== "object" || !hero.src) throw new Error("hero needs src, e.g. hero: { src: /assets/writing/x.webp, alt: … }");
  if (typeof hero.alt !== "string") throw new Error(`hero ${hero.src} needs alt text (alt: "" if decorative)`);
  return { ...hero, ...sizeOf(hero.src, hero) };
}

// The hero as a responsive <picture>: eager and high priority on the article
// page, where it is the largest thing above the fold; on index cards it is
// decorative (the title next to it names the post) and only the newest card
// loads eagerly.
async function heroPicture(hero, placement, { outputDir }) {
  const { src, alt } = heroImage(hero);
  if (placement === "page") {
    return picture(src, { alt, loading: "eager", fetchpriority: "high" }, { outputDir, sizes: SIZES.hero });
  }
  return picture(
    src,
    { alt: "", class: "writing-card__image", loading: placement === "card-first" ? "eager" : "lazy" },
    { outputDir, sizes: SIZES.card },
  );
}

// Feed readers expect absolute URLs: site-relative href, src, poster and
// srcset candidates become absolute against the site origin.
function absoluteLinks(html, baseUrl) {
  const origin = baseUrl.replace(/\/$/, "");
  return html
    .replace(/\b(href|src|poster)="\//g, `$1="${origin}/`)
    .replace(/\bsrcset="([^"]*)"/g, (match, list) => `srcset="${list.replace(/(^|,\s*)\//g, `$1${origin}/`)}"`);
}

module.exports = {
  absoluteLinks, escapeHtml, labelTableCells, isPublished, highlight, imageSize, keywords,
  figure, video, heroImage, heroPicture, shareImage, IMAGE_WIDTHS,
};
