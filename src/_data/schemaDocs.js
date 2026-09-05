// Editorial schema guidance is authored in YAML so prose and examples remain
// easy to review and update without touching documentation plumbing.
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const dir = path.join(__dirname, 'schema-guidance');

module.exports = {
  v03Tokens: YAML.parse(
    fs.readFileSync(path.join(dir, 'v03-tokens.yml'), 'utf8'),
  ).v03Tokens,
  v03Utilities: YAML.parse(
    fs.readFileSync(path.join(dir, 'v03-utilities.yml'), 'utf8'),
  ).v03Utilities,
  v03CemExtensions: YAML.parse(
    fs.readFileSync(path.join(dir, 'v03-cem-extensions.yml'), 'utf8'),
  ).v03CemExtensions,
};
