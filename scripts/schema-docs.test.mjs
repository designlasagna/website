import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const docs = require('../src/_data/schemaDocs.js');

// v0.3 suites read the checked-in schema copies; the v0.4 suite reads the
// installed @designlasagna/schemas package, the same source
// src/_data/schemas.js uses to power the reference pages.
const suites = [
  {
    version: 'v0.3',
    label: 'token',
    schema: require('../src/schemas/v0.3/tokens.json'),
    docs: docs.v03Tokens,
    mainDefinition: 'Token', // introduced by the dedicated Token fields section
  },
  {
    version: 'v0.3',
    label: 'utility',
    schema: require('../src/schemas/v0.3/utilities.json'),
    docs: docs.v03Utilities,
    mainDefinition: 'UtilityClass', // introduced by the dedicated utility class section
  },
  {
    version: 'v0.3',
    label: 'component (CEM extensions)',
    schema: require('../src/schemas/v0.3/cem-extensions.json'),
    docs: docs.v03CemExtensions,
    mainDefinition: 'LifecycleFields', // introduced by the dedicated lifecycle fields section
  },
  {
    version: 'v0.4',
    label: 'token',
    schema: JSON.parse(
      fs.readFileSync(require.resolve('@designlasagna/schemas/v0.4/tokens.json'), 'utf8'),
    ),
    docs: docs.v04Tokens,
    mainDefinition: 'Token', // introduced by the dedicated Token fields section
  },
  {
    version: 'v0.4',
    label: 'utility',
    schema: JSON.parse(
      fs.readFileSync(require.resolve('@designlasagna/schemas/v0.4/utilities.json'), 'utf8'),
    ),
    docs: docs.v04Utilities,
    mainDefinition: 'UtilityClass', // introduced by the dedicated utility class section
  },
];

function propertyGroups(schema) {
  const definitions = schema.definitions ?? schema.$defs ?? {};
  const groups = {};
  // Extension schemas (CEM) have no root properties of their own; guard so
  // a missing manifest scope does not become an `undefined` group.
  if (schema.properties) groups.manifest = schema.properties;
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition.properties) groups[name] = definition.properties;
    if (definition.additionalProperties?.properties) groups[`${name}Entry`] = definition.additionalProperties.properties;
  }
  return groups;
}

for (const suite of suites) {
  const { version, label, schema, docs } = suite;

  test(`${version} ${label} documentation overlay covers every documented schema property`, () => {
    for (const [scope, properties] of Object.entries(propertyGroups(schema))) {
      assert.ok(docs[scope], `missing documentation scope: ${scope}`);
      for (const field of Object.keys(properties)) {
        const guide = docs[scope][field];
        assert.ok(guide, `missing documentation for ${scope}.${field}`);
        for (const key of ['summary', 'useWhen', 'provenance']) {
          assert.equal(typeof guide[key], 'string', `${scope}.${field}.${key} must be text`);
          assert.ok(guide[key].length > 0, `${scope}.${field}.${key} must not be empty`);
        }
        assert.ok(guide.example && typeof guide.example === 'object', `${scope}.${field}.example must be an object`);
      }
    }
  });

  test(`${version} ${label} definitions have reader-facing introductions`, () => {
    const definitions = schema.definitions ?? schema.$defs ?? {};
    for (const name of Object.keys(definitions)) {
      if (name === suite.mainDefinition) continue;
      assert.ok(docs._definitions[name]?.summary, `missing definition introduction: ${name}`);
    }
  });

  test(`${version} ${label} documentation overlay does not contain stale field entries`, () => {
    const groups = propertyGroups(schema);
    for (const [scope, fields] of Object.entries(docs)) {
      if (scope.startsWith('_')) continue;
      assert.ok(groups[scope], `stale documentation scope: ${scope}`);
      for (const field of Object.keys(fields)) {
        assert.ok(groups[scope][field], `stale documentation field: ${scope}.${field}`);
      }
    }
  });
}
