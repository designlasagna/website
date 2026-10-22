// Which content sections have something to show in this build. A section
// whose posts or guides are all drafts is left out of production builds — no
// nav item, index page or feed — so the site never links to an empty page.
// Under `eleventy --serve` drafts count, so the sections show while writing.

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const { isPublished } = require('../../lib/writing.js');

const contentRoot = path.join(__dirname, '..', 'content');

function hasPublished(section) {
  const dir = path.join(contentRoot, section);
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .some((name) => {
      const match = fs.readFileSync(path.join(dir, name), 'utf8').match(/^---\n([\s\S]*?)\n---/);
      const data = (match && YAML.parse(match[1])) || {};
      return isPublished(data, process.env.ELEVENTY_RUN_MODE);
    });
}

module.exports = {
  writing: hasPublished('writing'),
  learn: hasPublished('learn'),
};
