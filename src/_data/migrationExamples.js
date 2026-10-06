// Before/after examples for the v0.3 → v0.4 migration guide, adapted from the
// package's docs/lifecycle-migration.md. Each side is a complete JSON value
// that the page renders through the `jsonCode` filter. `validates` names the
// contract (and optional definition) the value is checked against by
// scripts/schema-migration-examples.test.mjs; a side without it has no
// matching contract (standard DTCG and CEM fields sit outside the extensions).

module.exports = [
  {
    id: 'native',
    title: 'Native example',
    intro:
      'Tokens, utilities and icons share the same lifecycle fields; this is a tokens manifest. Opt in at the manifest root, and put status and deprecated on each entry.',
    before: {
      caption: 'v0.3',
      validates: { version: 'v0.3', file: 'tokens.json' },
      value: {
        $schema: 'https://designlasagna.recipes/schemas/v0.3/tokens.json',
        schemaVersion: '0.3.0',
        tokens: [
          {
            id: 'color.old',
            resolved: { default: '#0b5fff' },
            deprecated: { message: 'Use color.new.' },
          },
        ],
      },
    },
    after: {
      caption: 'v0.4',
      validates: { version: 'v0.4', file: 'tokens.json' },
      value: {
        $schema: 'https://designlasagna.recipes/schemas/v0.4/tokens.json',
        schemaVersion: '0.4.0',
        tokens: [
          {
            id: 'color.old',
            resolved: { default: '#0b5fff' },
            status: 'deprecated',
            deprecated: {
              message: 'Use color.new.',
              replacement: 'color.new',
              removal: '2027-01-01',
            },
          },
        ],
      },
    },
  },
  {
    id: 'dtcg',
    title: 'DTCG example',
    intro:
      'Keep the standard $deprecated mirror and add the structured record to the vendor extension. Only the extension payload is checked against the contract.',
    before: {
      caption: 'Before',
      value: {
        color: {
          old: {
            $type: 'color',
            $value: '#0b5fff',
            $deprecated: 'Use color.new.',
          },
        },
      },
    },
    after: {
      caption: 'After',
      validates: {
        version: 'v0.4',
        file: 'dtcg-extensions.json',
        definition: 'TokenExtensions',
        path: ['color', 'old', '$extensions', 'recipes.designlasagna'],
      },
      value: {
        color: {
          old: {
            $type: 'color',
            $value: '#0b5fff',
            $deprecated: 'Use color.new.',
            $extensions: {
              'recipes.designlasagna': {
                status: 'deprecated',
                deprecated: { message: 'Use color.new.', replacement: 'color.new' },
              },
            },
          },
        },
      },
    },
  },
  {
    id: 'cem',
    title: 'CEM example',
    intro:
      'Keep the standard deprecated string and add sibling fields. Do not use an object in deprecated. The attribute and its values are deprecated independently.',
    before: {
      caption: 'Before',
      value: { name: 'size', deprecated: 'Use variant.' },
    },
    after: {
      caption: 'After',
      validates: {
        version: 'v0.4',
        file: 'cem-extensions.json',
        definition: 'AttributeExtensions',
      },
      value: {
        name: 'size',
        deprecated: 'Use variant.',
        status: 'deprecated',
        replacement: 'variant',
        removal: '2027-Q1',
        deprecatedValues: [
          { value: 'medium', message: 'Use large.', replacement: 'large' },
        ],
      },
    },
  },
];
