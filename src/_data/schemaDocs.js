// Editorial schema guidance is authored in YAML so prose and examples remain
// easy to review and update without touching documentation plumbing.
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const guidancePath = path.join(__dirname, 'schema-guidance', 'v03-tokens.yml');

module.exports = YAML.parse(fs.readFileSync(guidancePath, 'utf8'));
