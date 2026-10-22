// Eleventy configuration for Design Lasagna static site.
// Input: src/ templates and data; Output: dist/ (never hand-edit).
// Adds JSON code filters and passthrough copies for assets and hosted schemas.

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

  // Feed readers expect absolute URLs, so embedded article links become
  // absolute against the site origin.
  eleventyConfig.addFilter("absoluteLinks", (html, baseUrl) =>
    html.replaceAll('href="/', `href="${baseUrl.replace(/\/$/, "")}/`),
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
  };
};
