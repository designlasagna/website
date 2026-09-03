// Minimal Eleventy skeleton config.
//
// Input:  src/   — Eleventy templates and source directories
// Output: dist/  — generated static site (never hand-edit)
//
// The existing landing page and 404 page live in src/ and are passed
// through unchanged, and the existing assets/ directory plus CNAME are
// moved into src/ and copied to dist/ while src/ templates are added
// incrementally.

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

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/CNAME");

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
  };
};
