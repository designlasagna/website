// Editorial schema guidance is authored in YAML so prose and examples remain
// easy to review and update without touching documentation plumbing.
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const dir = path.join(__dirname, 'schema-guidance');

const v03Tokens = YAML.parse(
  fs.readFileSync(path.join(dir, 'v03-tokens.yml'), 'utf8'),
).v03Tokens;
const v03DtcgExtensions = YAML.parse(
  fs.readFileSync(path.join(dir, 'v03-dtcg-extensions.yml'), 'utf8'),
).v03DtcgExtensions;

// DTCG token extensions and resolved token manifests deliberately share the
// same reader guidance for their overlapping metadata fields. The extension
// page changes only the provenance: these values are authored in the source
// DTCG file, whereas the manifest documents their resolved consumer view.
function sourceTokenGuidance(overrides = {}) {
  return Object.fromEntries(
    Object.entries({ ...v03Tokens.Token, ...overrides }).map(([name, guide]) => [
      name,
      { ...guide, ...(overrides[name] || {}), provenance: 'Authored source metadata.' },
    ]),
  );
}

v03DtcgExtensions.TokenExtensions = sourceTokenGuidance(
  v03DtcgExtensions.TokenExtensions,
);
v03DtcgExtensions.GroupExtensions = sourceTokenGuidance(
  v03DtcgExtensions.GroupExtensions,
);

module.exports = {
  v03Tokens,
  v03Utilities: YAML.parse(
    fs.readFileSync(path.join(dir, 'v03-utilities.yml'), 'utf8'),
  ).v03Utilities,
  v03CemExtensions: YAML.parse(
    fs.readFileSync(path.join(dir, 'v03-cem-extensions.yml'), 'utf8'),
  ).v03CemExtensions,
  v03DtcgExtensions,
};
