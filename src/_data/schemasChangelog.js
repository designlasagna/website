// Release history for the schemas changelog page. The page renders the
// `CHANGELOG.md` shipped in @designlasagna/schemas; when the installed
// package has none, `html` is empty and the template falls back to its
// hand-written entries.
//
// Release headings such as `## 0.4.0 - 2026-01-01` get the id `v0-4-0` so
// pages can deep-link `/tools/schemas/changelog/#v0-4-0`; other `##`
// headings (for example `Unreleased`) get a plain slug. The leading `# `
// title is dropped because the page has its own h1.

const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

const PACKAGE_CHANGELOG = path.join(
  __dirname, "..", "..", "node_modules", "@designlasagna", "schemas", "CHANGELOG.md",
);

function releaseId(text) {
  const version = text.match(/^v?(\d+(?:\.\d+)+)/);
  const base = version ? `v${version[1]}` : text.toLowerCase();
  return base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderChangelog(markdown) {
  const md = new MarkdownIt({ html: false, linkify: false });
  const tokens = md.parse(markdown, {});
  const kept = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "heading_open" && token.tag === "h1") {
      i += 2; // inline + heading_close
      continue;
    }
    if (token.type === "heading_open" && token.tag === "h2") {
      token.attrSet("id", releaseId(tokens[i + 1].content));
    }
    kept.push(token);
  }
  return md.renderer.render(kept, md.options, {});
}

function load(file = PACKAGE_CHANGELOG) {
  try {
    return { html: renderChangelog(fs.readFileSync(file, "utf8")) };
  } catch (error) {
    if (error.code === "ENOENT") return { html: "" };
    throw error;
  }
}

module.exports = load();
module.exports.load = load;
module.exports.renderChangelog = renderChangelog;
