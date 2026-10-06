// Build-time data for the schema reference docs.
//
// Reads the immutable v0.3 snapshots that are served at /schemas/ and the
// six v0.4 contracts from the installed @designlasagna/schemas package
// exports, then runs every schema through scripts/schema-reference.mjs so
// pages get a plain, JSON-serializable "ref" structure at build time.
//
// Exposed on every page as `schemas.v03Tokens`, `schemas.v03Utilities`,
// `schemas.v03CemExtensions`, plus the v0.4 entries `schemas.v04Lifecycle`,
// `schemas.v04Tokens`, `schemas.v04Utilities`, `schemas.v04Icons`,
// `schemas.v04CemExtensions`, and `schemas.v04DtcgExtensions`.

module.exports = async function () {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { describeSchema } = await import('../../scripts/schema-reference.mjs');
  const { createRequire } = await import('node:module');
  const require = createRequire(__filename);

  const loadSchema = async (filename) =>
    JSON.parse(await fs.readFile(path.join(__dirname, '..', 'schemas', 'v0.3', filename), 'utf8'));

  // v0.4 contracts are read from the installed package's export map (not
  // local snapshots) so the docs always describe exactly what npm consumers
  // import.
  const loadV04Schema = async (filename) =>
    JSON.parse(await fs.readFile(require.resolve(`@designlasagna/schemas/v0.4/${filename}`), 'utf8'));

  const tokensSchema = await loadSchema('tokens.json');
  const utilitiesSchema = await loadSchema('utilities.json');
  const cemExtensionsSchema = await loadSchema('cem-extensions.json');
  const dtcgExtensionsSchema = await loadSchema('dtcg-extensions.json');

  const ref = describeSchema(tokensSchema);
  const utilitiesRef = describeSchema(utilitiesSchema);
  const cemExtensionsRef = describeSchema(cemExtensionsSchema);
  const dtcgExtensionsRef = describeSchema(dtcgExtensionsSchema);

  const v04LifecycleSchema = await loadV04Schema('lifecycle.json');
  const v04TokensSchema = await loadV04Schema('tokens.json');
  const v04UtilitiesSchema = await loadV04Schema('utilities.json');
  const v04IconsSchema = await loadV04Schema('icons.json');
  const v04CemExtensionsSchema = await loadV04Schema('cem-extensions.json');
  const v04DtcgExtensionsSchema = await loadV04Schema('dtcg-extensions.json');

  const v04LifecycleRef = describeSchema(v04LifecycleSchema);
  const v04TokensRef = describeSchema(v04TokensSchema);
  const v04UtilitiesRef = describeSchema(v04UtilitiesSchema);
  const v04IconsRef = describeSchema(v04IconsSchema);
  const v04CemExtensionsRef = describeSchema(v04CemExtensionsSchema);
  const v04DtcgExtensionsRef = describeSchema(v04DtcgExtensionsSchema);

  // Hand-written minimal valid manifest (required root fields:
  // schemaVersion, tokens; required token fields: id, resolved).
  const minimalExample = {
    $schema: 'https://designlasagna.recipes/schemas/v0.3/tokens.json',
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
    $schema: 'https://designlasagna.recipes/schemas/v0.3/utilities.json',
    schemaVersion: '0.3.0',
    utilities: [
      {
        name: 'layout:grid',
        description: 'Arrange content on a CSS grid.',
        status: 'stable',
      },
    ],
  };

  // The v0.4 lifecycle schema is a definitions-only fragment (RFC 0002): it
  // validates no full manifest. This example is a minimal `Deprecated`
  // record grounded in that definition's required `message` field.
  const v04LifecycleExample = {
    message: 'Use the \u201cghost\u201d variant instead.',
  };

  // v0.4 tokens manifest: a condition dimension and a collection, a token
  // with authored modes, a platform reference and contrast data, and a
  // deprecated token with a lifecycle record pointing to its replacement.
  const v04TokensExample = {
    "$schema": "https://designlasagna.recipes/schemas/v0.4/tokens.json",
    "schemaVersion": "0.4.0",
    "designSystem": {
      "name": "Acme UI",
      "version": "2.3.0"
    },
    "conditions": {
      "colorScheme": {
        "type": "colorScheme",
        "values": [
          "light",
          "dark"
        ],
        "default": "light"
      }
    },
    "collections": {
      "semantic": {
        "name": "Semantic",
        "conditions": [
          "colorScheme"
        ],
        "defaults": {
          "tier": "semantic"
        }
      }
    },
    "tokens": [
      {
        "id": "color.action.primary",
        "path": [
          "color",
          "action",
          "primary"
        ],
        "collection": "semantic",
        "type": "color",
        "description": "Background for primary actions.",
        "platforms": {
          "web": {
            "reference": "var(--color-action-primary)"
          }
        },
        "resolved": {
          "light": "#0b5fff",
          "dark": "#5b93ff"
        },
        "modes": {
          "light": "{color.blue.500}",
          "dark": "{color.blue.300}"
        },
        "a11y": {
          "wcagContrast": {
            "light": {
              "ratio": 5.2,
              "against": "#ffffff",
              "level": "AA"
            }
          }
        },
        "keywords": [
          "button",
          "cta"
        ],
        "tags": [
          "interactive"
        ]
      },
      {
        "id": "color.brand.legacy",
        "collection": "semantic",
        "type": "color",
        "resolved": {
          "light": "#0b5fff",
          "dark": "#5b93ff"
        },
        "status": "deprecated",
        "deprecated": {
          "message": "Use color.action.primary instead.",
          "removal": "2027-01-01",
          "replacement": "color.action.primary"
        }
      }
    ]
  };

  // Minimal v0.4 utilities manifest: the root requires schemaVersion, and
  // its oneOf requires either categories or utilities; a UtilityClass needs
  // only its name.
  const v04UtilitiesExample = {
    $schema: 'https://designlasagna.recipes/schemas/v0.4/utilities.json',
    schemaVersion: '0.4.0',
    utilities: [
      {
        name: 'layout:grid',
      },
    ],
  };

  // Minimal v0.4 icons manifest: the root requires schemaVersion + icons;
  // each icon requires name + platforms (at least one platform entry), and
  // each platform entry must assert import, usage, or component per its
  // oneOf.
  const v04IconsExample = {
    $schema: 'https://designlasagna.recipes/schemas/v0.4/icons.json',
    schemaVersion: '0.4.0',
    icons: [
      {
        name: 'lasagna',
        platforms: {
          web: {
            import: 'lasagna-icon.js',
          },
        },
      },
    ],
  };

  // The v0.4 CEM extensions schema is definitions-only: it describes
  // lifecycle fields a design system may add to a Custom Elements Manifest
  // entry. This example shows those fields applied to a CEM declaration
  // (illustrative, not directly validated against the extension schema):
  // `deprecated` is the string branch of its oneOf, and each
  // `deprecatedValues` entry carries the required value + message pair.
  const v04CemDeclarationExample = {
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
            status: 'deprecated',
            deprecated: 'Use \u201clasagna-action-button\u201d instead.',
            attributes: [
              {
                name: 'variant',
                enum: ['primary', 'ghost'],
                deprecatedValues: [
                  {
                    value: 'flat',
                    message: 'Use \u201cghost\u201d instead.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  // The v0.4 DTCG extensions schema is definitions-only: it describes the
  // `recipes.designlasagna` entry of a DTCG node's `$extensions`. This
  // example shows that entry applied to a minimal DTCG token (illustrative,
  // not directly validated against the extension schema); TokenExtensions is
  // closed and has no required fields, so a single `tier` value is a valid,
  // minimal extension record.
  const v04DtcgTokenExample = {
    $type: 'color',
    $value: '#0b5fff',
    $extensions: {
      'recipes.designlasagna': {
        tier: 'primitive',
      },
    },
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
    v03DtcgExtensions: {
      ref: dtcgExtensionsRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.3/dtcg-extensions.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.3/dtcg-extensions.json',
    },
    v03CemExtensions: {
      ref: cemExtensionsRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.3/cem-extensions.json',
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
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.3/utilities.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.3/utilities.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: utilitiesMinimalExample,
      minimalExampleJson: JSON.stringify(utilitiesMinimalExample, null, 2),
      refJson: JSON.stringify(utilitiesRef, null, 2),
    },
    v04Lifecycle: {
      ref: v04LifecycleRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/lifecycle.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/lifecycle.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04LifecycleExample,
      minimalExampleJson: JSON.stringify(v04LifecycleExample, null, 2),
      refJson: JSON.stringify(v04LifecycleRef, null, 2),
    },
    v04Tokens: {
      ref: v04TokensRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/tokens.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/tokens.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04TokensExample,
      minimalExampleJson: JSON.stringify(v04TokensExample, null, 2),
      refJson: JSON.stringify(v04TokensRef, null, 2),
    },
    v04Utilities: {
      ref: v04UtilitiesRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/utilities.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/utilities.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04UtilitiesExample,
      minimalExampleJson: JSON.stringify(v04UtilitiesExample, null, 2),
      refJson: JSON.stringify(v04UtilitiesRef, null, 2),
    },
    v04Icons: {
      ref: v04IconsRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/icons.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/icons.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04IconsExample,
      minimalExampleJson: JSON.stringify(v04IconsExample, null, 2),
      refJson: JSON.stringify(v04IconsRef, null, 2),
    },
    v04CemExtensions: {
      ref: v04CemExtensionsRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/cem-extensions.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/cem-extensions.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04CemDeclarationExample,
      minimalExampleJson: JSON.stringify(v04CemDeclarationExample, null, 2),
      refJson: JSON.stringify(v04CemExtensionsRef, null, 2),
    },
    v04DtcgExtensions: {
      ref: v04DtcgExtensionsRef,
      canonicalUrl: 'https://designlasagna.recipes/schemas/v0.4/dtcg-extensions.json',
      npmPackage: '@designlasagna/schemas',
      npmImportPath: '@designlasagna/schemas/v0.4/dtcg-extensions.json',
      // Pre-formatted (2-space indent) JSON strings for <pre><code> blocks,
      // so the template doesn't need a JSON-stringify filter.
      minimalExample: v04DtcgTokenExample,
      minimalExampleJson: JSON.stringify(v04DtcgTokenExample, null, 2),
      refJson: JSON.stringify(v04DtcgExtensionsRef, null, 2),
    },
  };
};
