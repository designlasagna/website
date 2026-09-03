// Focused tests for scripts/schema-reference.mjs — run with
// `node --test scripts/schema-reference.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeSchema } from './schema-reference.mjs';
import describeDefault from './schema-reference.mjs';

assert.equal(describeDefault, describeSchema, 'default export is the named function');

const fixtureSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://example.com/schemas/widget.json',
  title: 'Widget',
  description: 'A configurable widget.',
  type: 'object',
  required: ['name', 'size'],
  properties: {
    name: {
      type: 'string',
      description: 'Display name shown in the UI.',
      minLength: 1,
      maxLength: 120,
      examples: ['Comfy Chair', 'Standing Desk'],
    },
    size: {
      type: 'string',
      enum: ['S', 'M', 'L', 'XL'],
      default: 'M',
      examples: ['S'],
    },
    tags: {
      type: 'array',
      items: { type: 'string', maxLength: 40 },
      maxItems: 8,
      uniqueItems: true,
      default: [],
    },
    price: {
      type: 'number',
      description: 'Unit price, in USD.',
      minimum: 0,
      exclusiveMinimum: 0,
      multipleOf: 0.01,
    },
    id: { $ref: '#/$defs/uuid' },
    color: { $ref: '#/definitions/color' },
    kind: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
  },
  allOf: [{ required: ['id'] }],
  anyOf: [
    { properties: { price: { minimum: 100 } } },
    { properties: { discount: { type: 'boolean' } } },
  ],
  oneOf: [
    { properties: { kind: { type: 'string' } } },
    { properties: { kind: { type: 'integer' } } },
  ],
  not: { required: ['deprecated'] },
  $defs: {
    uuid: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    },
  },
  definitions: {
    color: { type: 'string', enum: ['red', 'green', 'blue'], default: 'red' },
  },
};

function propByName(summary, name) {
  const prop = (summary.properties ?? []).find((p) => p.name === name);
  assert.ok(prop, `property ${name} should be present`);
  return prop;
}

test('summarizes title, description, $id, and type', () => {
  const summary = describeSchema(fixtureSchema);
  assert.equal(summary.title, 'Widget');
  assert.equal(summary.description, 'A configurable widget.');
  assert.equal(summary.$id, 'https://example.com/schemas/widget.json');
  assert.equal(summary.type, 'object');
});

test('lists required properties and flags them per property', () => {
  const summary = describeSchema(fixtureSchema);
  assert.deepEqual(summary.required, ['name', 'size']);
  assert.equal(propByName(summary, 'name').required, true);
  assert.equal(propByName(summary, 'size').required, true);
  assert.equal(
    propByName(summary, 'price').required,
    false,
    'non-required properties are flagged required: false',
  );
});

test('summarizes enums, defaults, and examples', () => {
  const summary = describeSchema(fixtureSchema);
  const size = propByName(summary, 'size');
  assert.deepEqual(size.enum.values, ['S', 'M', 'L', 'XL']);
  assert.equal(size.enum.count, 4);
  assert.equal(size.default, 'M');
  assert.deepEqual(size.examples, ['S']);
  const tags = propByName(summary, 'tags');
  assert.deepEqual(tags.default, []);
});

test('summarizes common constraints and array items', () => {
  const summary = describeSchema(fixtureSchema);
  const name = propByName(summary, 'name');
  assert.deepEqual(name.constraints, { minLength: 1, maxLength: 120 });
  const price = propByName(summary, 'price');
  assert.deepEqual(price.constraints, {
    minimum: 0,
    exclusiveMinimum: 0,
    multipleOf: 0.01,
  });
  const tags = propByName(summary, 'tags');
  assert.deepEqual(tags.constraints, { maxItems: 8, uniqueItems: true });
  assert.equal(tags.items.kind, 'single');
  assert.equal(tags.items.schema.type, 'string');
});

test('summarizes $defs and legacy definitions together', () => {
  const summary = describeSchema(fixtureSchema);
  assert.ok(summary.definitions, 'definitions block should be present');
  assert.equal(summary.definitions.uuid.type, 'string');
  assert.match(summary.definitions.uuid.constraints.pattern, /\[0-9a-f\]\{8\}/);
  assert.equal(summary.definitions.color.type, 'string');
  assert.deepEqual(summary.definitions.color.enum.values, ['red', 'green', 'blue']);
  assert.equal(summary.definitions.color.default, 'red');
});

test('records $refs and resolves internal definition references', () => {
  const summary = describeSchema(fixtureSchema);
  const id = propByName(summary, 'id');
  assert.equal(id.$ref, '#/$defs/uuid');
  assert.equal(id.$refLocalDef, 'uuid');
  const color = propByName(summary, 'color');
  assert.equal(color.$ref, '#/definitions/color');
  assert.equal(color.$refLocalDef, 'color');
  assert.ok(summary.refs.includes('#/$defs/uuid'));
  assert.ok(summary.refs.includes('#/definitions/color'));
});

test('captures allOf / anyOf / oneOf / not composition branches', () => {
  const summary = describeSchema(fixtureSchema);
  assert.ok(summary.composition, 'composition should be present');
  assert.equal(summary.composition.allOf.length, 1);
  assert.deepEqual(summary.composition.allOf[0].required, ['id']);
  assert.equal(summary.composition.anyOf.length, 2);
  const anyBranch = summary.composition.anyOf.find((b) => b.properties);
  assert.equal(
    anyBranch.properties[0].name === 'price'
      ? anyBranch.properties[0].constraints.minimum
      : anyBranch.properties[0].type,
    anyBranch.properties[0].name === 'price' ? 100 : 'boolean',
  );
  assert.equal(summary.composition.oneOf.length, 2);
  assert.deepEqual(summary.composition.not.required, ['deprecated']);
});

test('summarizes local composition on individual properties', () => {
  const summary = describeSchema(fixtureSchema);
  const kind = propByName(summary, 'kind');
  assert.equal(kind.composition.oneOf.length, 2);
  assert.deepEqual(
    kind.composition.oneOf.map((b) => b.type),
    ['string', 'integer'],
  );
});

test('returns JSON-serializable data for the full fixture', () => {
  const summary = describeSchema(fixtureSchema);
  const roundTrip = JSON.parse(JSON.stringify(summary));
  assert.deepEqual(roundTrip, summary, 'output must survive a JSON round trip');
});

test('handles non-object and primitive schemas without throwing', () => {
  assert.deepEqual(describeSchema(true), { isObject: false, value: true });
  assert.deepEqual(describeSchema('just a string'), {
    isObject: false,
    value: 'just a string',
  });
  const empty = describeSchema({});
  assert.deepEqual(empty, {});
});

test('handles circular schema data without hanging', () => {
  const circular = {
    title: 'Recursive',
    type: 'object',
    properties: { self: {} },
  };
  circular.properties.self.properties = circular.properties;

  const summary = describeSchema(circular);
  assert.equal(summary.title, 'Recursive');
  // Walks must not emit a cycle; the output must still serialize.
  const roundTrip = JSON.parse(JSON.stringify(summary));
  assert.deepEqual(roundTrip, summary);
});

test('replaces non-serializable values with a marker', () => {
  const fn = () => {};
  const summary = describeSchema({
    type: 'object',
    properties: {
      fn: { type: 'string', default: fn, enum: [fn, 'ok'] },
    },
  });
  const value = JSON.stringify(summary);
  assert.ok(!value.includes('() =>'), 'functions must not leak into output');
  const prop = summary.properties.find((p) => p.name === 'fn');
  assert.equal(prop.default, '<non-serializable value>');
  assert.ok(prop.enum.values.includes('<non-serializable value>'));
  assert.ok(prop.enum.values.includes('ok'));
});

test('truncates deeply nested schemas at maxDepth', () => {
  let node = { type: 'object' };
  const root = node;
  for (let i = 0; i < 60; i += 1) {
    const child = { type: 'object' };
    node.properties = { child };
    node = child;
  }
  const summary = describeSchema(root);
  const text = JSON.stringify(summary);
  assert.ok(text.length < 200_000, 'deep nesting should be truncated');
  assert.ok(text.includes('max-depth-reached'));
  JSON.parse(text);
});
