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
  // v0.4 directly from the released package via publish-schemas.mjs.
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
