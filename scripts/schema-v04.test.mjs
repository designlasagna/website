/**
 * v0.4 data-layer checks: the installed @designlasagna/schemas v0.4 contracts
 * compile cleanly with the existing AJV setup (relative lifecycle.json refs
 * resolved across the compiled set), and the minimal examples exposed by
 * src/_data/schemas.js are genuinely valid against them. The CEM
 * extensions example additionally has its extension fields validated
 * against the applicable definitions, because that schema's root is
 * permissive (definitions-only) and would accept anything.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const dataFn = require('../src/_data/schemas.js');

const CONTRACTS = [
  ['lifecycle.json', 'v04Lifecycle'],
  ['tokens.json', 'v04Tokens'],
  ['utilities.json', 'v04Utilities'],
  ['icons.json', 'v04Icons'],
  ['cem-extensions.json', 'v04CemExtensions'],
  ['dtcg-extensions.json', 'v04DtcgExtensions'],
];

const schemas = new Map(
  CONTRACTS.map(([file]) => [
    file,
    JSON.parse(fs.readFileSync(require.resolve(`@designlasagna/schemas/v0.4/${file}`), 'utf8')),
  ]),
);

// Compile every contract together on one instance so the relative
// `lifecycle.json#/definitions/...` refs resolve exactly the way consumers
// do (same options as scripts/verify-schema-hosting.mjs).
const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true, logger: false });
for (const schema of schemas.values()) {
  assert.ok(ajv.validateSchema(schema), `${schema.$id}: invalid JSON Schema`);
  ajv.addSchema(schema);
}

test('every v0.4 contract compiles and its documented example validates', async () => {
  const docs = await dataFn();
  for (const [file, entryKey] of CONTRACTS) {
    const schema = schemas.get(file);
    const entry = docs[entryKey];
    assert.ok(entry, `missing data entry: ${entryKey}`);
    assert.equal(entry.canonicalUrl, schema.$id, `${file}: canonicalUrl must match the installed $id`);
    assert.equal(entry.npmImportPath, `@designlasagna/schemas/v0.4/${file}`, `${file}: npmImportPath must match the package export`);
    assert.ok(entry.ref && typeof entry.ref === 'object', `${file}: ref must be a describeSchema object`);
    assert.equal(entry.refJson, JSON.stringify(entry.ref, null, 2), `${file}: refJson must be the 2-space-indented ref`);
    assert.ok(
      entry.minimalExample && typeof entry.minimalExample === 'object',
      `${file}: minimalExample must be an object`,
    );
    const validate = ajv.getSchema(schema.$id);
    assert.ok(
      validate(entry.minimalExample),
      `${file}: minimal example failed validation: ${JSON.stringify(validate.errors)}`,
    );
  }
});

test("the CEM extension example's extension fields validate against the applicable definitions", async () => {
  const docs = await dataFn();
  const example = docs.v04CemExtensions.minimalExample;
  const declaration = example.modules[0].declarations[0];
  const attribute = declaration.attributes[0];

  const cemSchema = schemas.get('cem-extensions.json');
  const cemId = cemSchema.$id;
  const lifecycleId = schemas.get('lifecycle.json').$id;

  // The fragment's root has no manifest scope of its own, so the whole
  // CEM-context example passes it by construction; the real constraints
  // live in the definitions the extension fields are composed against.
  const validateRoot = ajv.getSchema(cemId);
  assert.ok(
    validateRoot(example),
    `CEM-context example failed the permissive root: ${JSON.stringify(validateRoot.errors)}`,
  );

  const pickExtensionFields = (entry, definition) =>
    Object.fromEntries(
      Object.keys(definition.properties)
        .filter((key) => key in entry)
        .map((key) => [key, entry[key]]),
    );

  const validateLifecycleFields = ajv.getSchema(`${cemId}#/definitions/LifecycleFields`);
  const validateAttributeExtensions = ajv.getSchema(`${cemId}#/definitions/AttributeExtensions`);
  const validateDeprecatedValue = ajv.getSchema(`${lifecycleId}#/definitions/DeprecatedValue`);

  // Declaration scope: the shared lifecycle fields composed onto the CEM declaration.
  const declarationFields = pickExtensionFields(declaration, cemSchema.definitions.LifecycleFields);
  assert.ok(
    declarationFields.deprecated !== undefined && declarationFields.status !== undefined,
    'example should carry declaration lifecycle fields',
  );
  assert.ok(
    validateLifecycleFields(declarationFields),
    `declaration lifecycle fields failed validation: ${JSON.stringify(validateLifecycleFields.errors)}`,
  );

  // Attribute scope: the extension fields composed onto the CEM attribute entry.
  const attributeFields = pickExtensionFields(attribute, cemSchema.definitions.AttributeExtensions);
  assert.ok(
    attributeFields.enum !== undefined && attributeFields.deprecatedValues !== undefined,
    'example should carry attribute extension fields',
  );
  assert.ok(
    validateAttributeExtensions(attributeFields),
    `attribute extension fields failed validation: ${JSON.stringify(validateAttributeExtensions.errors)}`,
  );

  // Per-value records validate against the shared lifecycle fragment's DeprecatedValue.
  for (const record of attribute.deprecatedValues) {
    assert.ok(
      validateDeprecatedValue(record),
      `deprecated value record failed validation: ${JSON.stringify(validateDeprecatedValue.errors)}`,
    );
  }

  // Negative controls: the applicable definitions actually constrain the
  // example's fields, which the permissive root would accept.
  assert.ok(
    !validateLifecycleFields({ ...declarationFields, deprecated: 42 }),
    'LifecycleFields must reject a non-boolean/string deprecated value',
  );
  assert.ok(
    !validateAttributeExtensions({ ...attributeFields, deprecatedValues: [{ value: 'flat' }] }),
    'AttributeExtensions must reject a DeprecatedValue record without message',
  );
});

test('the v0.4 data entries preserve the existing v0.3 entries', async () => {
  const docs = await dataFn();
  const expected = {
    v03Tokens: 'https://designlasagna.recipes/schemas/v0.3/tokens.json',
    v03DtcgExtensions: 'https://designlasagna.recipes/schemas/v0.3/dtcg-extensions.json',
    v03CemExtensions: 'https://designlasagna.recipes/schemas/v0.3/cem-extensions.json',
    v03Utilities: 'https://designlasagna.recipes/schemas/v0.3/utilities.json',
  };
  for (const [key, canonicalUrl] of Object.entries(expected)) {
    const entry = docs[key];
    assert.ok(entry, `missing existing data entry: ${key}`);
    assert.equal(entry.canonicalUrl, canonicalUrl, `${key}: canonicalUrl changed`);
    assert.equal(entry.npmImportPath, canonicalUrl.replace('https://designlasagna.recipes/schemas', '@designlasagna/schemas'));
    assert.ok(entry.ref && typeof entry.ref === 'object', `${key}: ref must remain a describeSchema object`);
  }
  // v03DtcgExtensions never carried a minimalExample; only these three did.
  for (const key of ['v03Tokens', 'v03CemExtensions', 'v03Utilities']) {
    assert.ok(
      docs[key].minimalExample && typeof docs[key].minimalExample === 'object',
      `${key}: minimalExample must be preserved`,
    );
  }
  assert.equal(docs.v03DtcgExtensions.minimalExample, undefined, 'v03DtcgExtensions must not gain a minimalExample');
});
