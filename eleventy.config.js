// Eleventy configuration for Design Lasagna static site.
// Input: src/ templates and data; Output: dist/ (never hand-edit).
// Adds JSON code filters and passthrough copies for assets and hosted schemas.

const writing = require("./lib/writing.js");

module.exports = function (eleventyConfig) {
  // Dependency-free JSON rendering for readable, static code examples.
  eleventyConfig.addFilter("jsonCode", (value) => {
    const escaped = JSON.stringify(value, null, 2)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    return escaped.replace(
      /("(?:\\.|[^"])*")(?=\s*:)|("(?:\\.|[^"])*"|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?)/g,
      (match, key) => `<span class="json-${key ? "key" : "value"}">${match}</span>`,
    );
  });

  // Deterministic date formatting for editorial content, independent of the
  // build machine's timezone (front-matter dates are UTC midnight).
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const toDate = (value) => (value instanceof Date ? value : new Date(value));
  eleventyConfig.addFilter("dateISO", (value) => {
    const date = toDate(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  });
  eleventyConfig.addFilter("dateLong", (value) => {
    const date = toDate(value);
    return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("dateRSS", (value) => toDate(value).toUTCString());

  // Newest-first ordering for the writing index and its RSS feed.
  eleventyConfig.addFilter("writingNewestFirst", (pages) =>
    [...pages].sort((a, b) => (a.date === b.date ? 0 : a.date > b.date ? -1 : 1)),
  );

  // Tags shown to readers: the section tag and Eleventy's implicit "all"
  // are collection machinery, not labels.
  eleventyConfig.addFilter("writingTags", (tags) =>
    (Array.isArray(tags) ? tags : []).filter((tag) => tag !== "all" && tag !== "writing"),
  );

  // Feed readers expect absolute URLs, so embedded article links, image and
  // video sources, srcset candidates and video posters become absolute
  // against the site origin.
  eleventyConfig.addFilter("absoluteLinks", writing.absoluteLinks);

  // JSON-LD inside <script>: "</" is escaped so text cannot close the tag.
  eleventyConfig.addFilter("jsonLd", (value) => JSON.stringify(value).replaceAll("</", "<\\/"));

  // Drafts (`draft: true`) render under `eleventy --serve` and are skipped
  // entirely in production builds.
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    if (!writing.isPublished(data, process.env.ELEVENTY_RUN_MODE)) return false;
  });

  // Fenced code in articles is coloured like the docs' JSON examples, and
  // table cells are labelled with their column heading for phone layouts.
  eleventyConfig.amendLibrary("md", (md) => md.set({ highlight: writing.highlight }).use(writing.labelTableCells));

  // Article media. Captions accept inline Markdown.
  let renderInline = (text) => writing.escapeHtml(text);
  eleventyConfig.amendLibrary("md", (md) => {
    renderInline = (text) => md.renderInline(String(text));
  });
  // Images are resized into whichever output folder is building (dist/ for
  // builds, .dev/ for npm run dev).
  const output = () => ({ outputDir: eleventyConfig.directories.output });
  eleventyConfig.addFilter("heroImage", writing.heroImage);
  eleventyConfig.addFilter("markdownInline", (text) => renderInline(text));
  eleventyConfig.addShortcode("figure", async (...args) =>
    writing.figure(writing.keywords(args, "figure"), renderInline, output()),
  );
  eleventyConfig.addShortcode("heroPicture", async (hero, placement) =>
    writing.heroPicture(hero, placement, output()),
  );
  eleventyConfig.addShortcode("shareImageMeta", async (hero) => {
    const image = writing.heroImage(hero);
    if (!image) return '<meta name="twitter:card" content="summary">';
    const { url, width, height } = await writing.shareImage(image.src, output());
    const site = require("./src/_data/site.json");
    return [
      `<meta property="og:image" content="${site.url}${url}">`,
      `<meta property="og:image:width" content="${width}">`,
      `<meta property="og:image:height" content="${height}">`,
      `<meta property="og:image:alt" content="${writing.escapeHtml(image.alt)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
    ].join("\n  ");
  });
  eleventyConfig.addShortcode("video", (...args) =>
    writing.video(writing.keywords(args, "video"), renderInline),
  );

  // Local schema references are presented as links to their reader-facing
  // definition rather than exposing JSON Pointer internals in the UI.
  eleventyConfig.addFilter("schemaDefinitionName", (reference) => {
    const prefix = "#/definitions/";
    return typeof reference === "string" && reference.startsWith(prefix)
      ? reference.slice(prefix.length)
      : null;
  });

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Historical raw contracts are immutable snapshots. The build then adds
  // v0.4 directly from the released package via publish-schemas.mjs, so
  // /schemas/v0.4/ always tracks the latest compatible 0.4.x patch.
  eleventyConfig.addPassthroughCopy("src/schemas");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    // Articles use Nunjucks shortcodes ({% figure %}, {% video %}) like the
    // rest of the site's templates.
    markdownTemplateEngine: "njk",
  };
};
