// Build-time data for the schema reference docs.
//
// Reads the v0.3 tokens schema from the installed @designlasagna/schemas
// package and runs it through scripts/schema-reference.mjs so pages get a
// plain, JSON-serializable "ref" structure at build time.
//
// Exposed on every page as `schemas.v03Tokens`.

module.exports = async function () {
  const fs = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const { describeSchema } = await import('../../scripts/schema-reference.mjs');

  const require = createRequire(__filename);
  const schemaPath = require.resolve('@designlasagna/schemas/v0.3/tokens.json');
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));

  const ref = describeSchema(schema);

  // Hand-written minimal valid manifest (required root fields:
  // schemaVersion, tokens; required token fields: id, resolved).
  const minimalExample = {
    schemaVersion: '0.3.0',
    tokens: [
      {
        id: 'color.blue.500',
        path: ['color', 'blue', '500'],
        resolved: { light: '#0b5fff', dark: '#5b93ff' },
      },
    ],
  };

  return {
    v03Tokens: {
      ref,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.3/tokens.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.3/tokens.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample,
      minimalExampleJson: JSON.stringify(minimalExample, null, 2),
      refJson: JSON.stringify(ref, null, 2),
    },
  };
};
