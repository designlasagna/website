// Build-time data for the schema reference docs.
//
// Reads the v0.3 tokens, utilities, and CEM-extensions schemas from the
// installed @designlasagna/schemas package and runs them through
// scripts/schema-reference.mjs so pages get a plain, JSON-serializable
// "ref" structure at build time.
//
// Exposed on every page as `schemas.v03Tokens`, `schemas.v03Utilities`,
// and `schemas.v03CemExtensions`.

module.exports = async function () {
  const fs = await import('node:fs/promises');
  const { createRequire } = await import('node:module');
  const { describeSchema } = await import('../../scripts/schema-reference.mjs');

  const require = createRequire(__filename);

  const loadSchema = async (importPath) =>
    JSON.parse(await fs.readFile(require.resolve(importPath), 'utf8'));

  const tokensSchema = await loadSchema('@designlasagna/schemas/v0.3/tokens.json');
  const utilitiesSchema = await loadSchema('@designlasagna/schemas/v0.3/utilities.json');
  const cemExtensionsSchema = await loadSchema(
    '@designlasagna/schemas/v0.3/cem-extensions.json',
  );

  const ref = describeSchema(tokensSchema);
  const utilitiesRef = describeSchema(utilitiesSchema);
  const cemExtensionsRef = describeSchema(cemExtensionsSchema);

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

  // Hand-written minimal valid utilities manifest (required root field:
  // schemaVersion; oneOf requires either categories or utilities).
  const utilitiesMinimalExample = {
    schemaVersion: '0.3.0',
    utilities: [
      {
        name: 'layout:grid',
        description: 'Arrange content on a CSS grid.',
        status: 'stable',
      },
    ],
  };

  // The v0.3 CEM extensions schema has no root properties of its own: it
  // describes fields a design system may add to a Custom Elements Manifest
  // declaration or member. This example shows those fields applied to a CEM
  // declaration (illustrative, not directly validated against the extension
  // schema).
  const cemDeclarationExample = {
    schemaVersion: '1.0.0',
    modules: [
      {
        kind: 'javascript-module',
        path: 'src/lasagna-button.js',
        declarations: [
          {
            kind: 'class',
            name: 'LasagnaButton',
            tagName: 'lasagna-button',
            status: 'stable',
            attributes: [
              {
                name: 'variant',
                enum: ['primary', 'ghost'],
                deprecatedValues: [
                  {
                    value: 'flat',
                    message: 'Use \u201cghost\u201d instead.',
                    replacement: 'ghost',
                    removal: '3.0.0',
                  },
                ],
              },
            ],
          },
        ],
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
    v03CemExtensions: {
      ref: cemExtensionsRef,
      canonicalUrl: cemExtensionsSchema.$id,
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.3/cem-extensions.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: cemDeclarationExample,
      minimalExampleJson: JSON.stringify(cemDeclarationExample, null, 2),
      refJson: JSON.stringify(cemExtensionsRef, null, 2),
    },
    v03Utilities: {
      ref: utilitiesRef,
      canonicalUrl: utilitiesSchema.$id,
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.3/utilities.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: utilitiesMinimalExample,
      minimalExampleJson: JSON.stringify(utilitiesMinimalExample, null, 2),
      refJson: JSON.stringify(utilitiesRef, null, 2),
    },
  };
};
