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

  // Raw schemas are published at their documented, versioned URLs. Keep the
  // package-relative layout so, for example, v0.3/cem-extensions.json is
  // available as /schemas/v0.3/cem-extensions.json in the deployed site.
  eleventyConfig.addPassthroughCopy({
    "node_modules/@designlasagna/schemas/v0.2": "schemas/v0.2",
    "node_modules/@designlasagna/schemas/v0.3": "schemas/v0.3",
    "node_modules/@designlasagna/schemas/dtcg/2025.10": "schemas/dtcg/2025.10",
  });

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
  };
};
