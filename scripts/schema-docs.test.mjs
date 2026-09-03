import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const schema = require('@designlasagna/schemas/v0.3/tokens.json');
const docs = require('../src/_data/schemaDocs.js').v03Tokens;

function propertyGroups(schema) {
  const definitions = schema.definitions ?? schema.$defs ?? {};
  return {
    manifest: schema.properties,
    ...Object.fromEntries(
      Object.entries(definitions)
        .filter(([, definition]) => definition.properties)
        .map(([name, definition]) => [name, definition.properties]),
    ),
    ConditionsEntry: definitions.Conditions.additionalProperties.properties,
    CollectionsEntry: definitions.Collections.additionalProperties.properties,
  };
}

test('v0.3 token documentation overlay covers every documented schema property', () => {
  for (const [scope, properties] of Object.entries(propertyGroups(schema))) {
    assert.ok(docs[scope], `missing documentation scope: ${scope}`);
    for (const field of Object.keys(properties)) {
      const guide = docs[scope][field];
      assert.ok(guide, `missing documentation for ${scope}.${field}`);
      for (const key of ['summary', 'useWhen', 'provenance']) {
        assert.equal(typeof guide[key], 'string', `${scope}.${field}.${key} must be text`);
        assert.ok(guide[key].length > 0, `${scope}.${field}.${key} must not be empty`);
      }
    }
  }
});

test('v0.3 token definitions have reader-facing introductions', () => {
  const definitions = schema.definitions ?? schema.$defs ?? {};
  for (const name of Object.keys(definitions)) {
    if (name === 'Token') continue; // introduced by the dedicated Token fields section
    assert.ok(docs._definitions[name]?.summary, `missing definition introduction: ${name}`);
  }
});

test('v0.3 token documentation overlay does not contain stale field entries', () => {
  const groups = propertyGroups(schema);
  for (const [scope, fields] of Object.entries(docs)) {
    if (scope.startsWith('_')) continue;
    assert.ok(groups[scope], `stale documentation scope: ${scope}`);
    for (const field of Object.keys(fields)) {
      assert.ok(groups[scope][field], `stale documentation field: ${scope}.${field}`);
    }
  }
});
