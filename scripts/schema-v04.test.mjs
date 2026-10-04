/**
 * v0.4 data-layer checks: the installed @designlasagna/schemas v0.4 contracts
 * compile cleanly with the existing AJV setup (relative lifecycle.json refs
 * resolved across the compiled set), and the minimal examples exposed by
 * src/_data/schemas.js are genuinely valid against them. The lifecycle
 * fragment, the CEM extensions example, and the DTCG example are
 * additionally validated against the applicable definitions (with negative
 * controls), because those schemas' roots are permissive
 * (definitions-only) and would accept anything.
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

test("the lifecycle fragment definitions constrain their records as documented", async () => {
  const docs = await dataFn();
  const guidance = require('../src/_data/schemaDocs.js').v04Lifecycle;
  const lifecycleId = schemas.get('lifecycle.json').$id;

  // The fragment's root has no manifest scope of its own, so the minimal
  // example passes it by construction; the real constraints live in the
  // definitions the v0.4 contracts compose against.
  const validateStatus = ajv.getSchema(`${lifecycleId}#/definitions/Status`);
  const validateDeprecated = ajv.getSchema(`${lifecycleId}#/definitions/Deprecated`);
  const validateStrictDeprecated = ajv.getSchema(`${lifecycleId}#/definitions/StrictDeprecated`);
  const validateNativeDeprecation = ajv.getSchema(`${lifecycleId}#/definitions/NativeDeprecation`);
  const validateDeprecatedValue = ajv.getSchema(`${lifecycleId}#/definitions/DeprecatedValue`);

  // The exposed minimal example is a Deprecated record, not a manifest.
  const example = docs.v04Lifecycle.minimalExample;
  assert.ok(
    validateDeprecated(example),
    `minimal fragment record failed Deprecated validation: ${JSON.stringify(validateDeprecated.errors)}`,
  );

  // Status is an unconstrained string; the record shapes carry the constraints.
  assert.ok(validateStatus('deprecated'), 'Status must accept a plain string');
  assert.ok(!validateStatus(42), 'Status must reject a non-string value');

  // Deprecated requires a non-empty message and types the optional fields.
  assert.ok(!validateDeprecated({}), 'Deprecated must reject a record without message');
  assert.ok(!validateDeprecated({ message: '' }), 'Deprecated must reject an empty message (minLength 1)');
  assert.ok(
    validateDeprecated({ ...example, removal: '2027-01-01', replacement: 'ghost' }),
    'Deprecated must accept the full record',
  );
  assert.ok(!validateDeprecated({ message: 'x', removal: 2027 }), 'Deprecated must reject a non-string removal');
  assert.ok(!validateDeprecated({ message: 'x', replacement: 2 }), 'Deprecated must reject a non-string replacement');
  assert.ok(
    validateDeprecated({ ...example, custom: true }),
    'Deprecated must stay permissive on unknown properties',
  );

  // StrictDeprecated carries the same fields but is closed.
  assert.ok(
    validateStrictDeprecated(example),
    'StrictDeprecated must accept the documented fields',
  );
  assert.ok(
    !validateStrictDeprecated({ ...example, custom: true }),
    'StrictDeprecated must reject unknown properties (additionalProperties: false)',
  );
  assert.ok(!validateStrictDeprecated({}), 'StrictDeprecated must reject a record without message');

  // NativeDeprecation accepts exactly false, null, or a Deprecated record.
  assert.ok(validateNativeDeprecation(false), 'NativeDeprecation must accept the explicit false assertion');
  assert.ok(validateNativeDeprecation(null), 'NativeDeprecation must accept null (not asserted)');
  assert.ok(validateNativeDeprecation(example), 'NativeDeprecation must accept a Deprecated record');
  assert.ok(!validateNativeDeprecation(true), 'NativeDeprecation must reject true');
  assert.ok(!validateNativeDeprecation('deprecated'), 'NativeDeprecation must reject a bare string');
  assert.ok(!validateNativeDeprecation(42), 'NativeDeprecation must reject a number');
  assert.ok(
    !validateNativeDeprecation({ removal: '2027-01-01' }),
    'NativeDeprecation must reject a Deprecated record without message',
  );

  // DeprecatedValue requires both value and message.
  assert.ok(!validateDeprecatedValue({}), 'DeprecatedValue must reject a record without value and message');
  assert.ok(!validateDeprecatedValue({ value: 'flat' }), 'DeprecatedValue must reject a record without message');
  assert.ok(
    !validateDeprecatedValue({ message: 'Use “ghost” instead.' }),
    'DeprecatedValue must reject a record without value',
  );
  assert.ok(
    validateDeprecatedValue({ value: 'flat', message: 'Use “ghost” instead.', removal: '2027-01-01', replacement: 'ghost' }),
    'DeprecatedValue must accept the full record',
  );

  // The reader-facing guidance examples validate against their definitions.
  assert.equal(typeof guidance._definitions.Status.example.status, 'string');
  assert.ok(
    validateStatus(guidance._definitions.Status.example.status),
    'Status guidance example must validate against Status',
  );
  assert.ok(
    validateDeprecated(guidance._definitions.Deprecated.example),
    `Deprecated guidance example must validate: ${JSON.stringify(validateDeprecated.errors)}`,
  );
  assert.ok(
    validateStrictDeprecated(guidance._definitions.StrictDeprecated.example),
    `StrictDeprecated guidance example must validate: ${JSON.stringify(validateStrictDeprecated.errors)}`,
  );
  assert.ok(
    validateNativeDeprecation(guidance._definitions.NativeDeprecation.example.deprecated),
    `NativeDeprecation guidance example must validate: ${JSON.stringify(validateNativeDeprecation.errors)}`,
  );
  assert.ok(
    validateDeprecatedValue(guidance._definitions.DeprecatedValue.example),
    `DeprecatedValue guidance example must validate: ${JSON.stringify(validateDeprecatedValue.errors)}`,
  );
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

test("the DTCG extension example's recipes.designlasagna payload validates against TokenExtensions", async () => {
  const docs = await dataFn();
  const example = docs.v04DtcgExtensions.minimalExample;

  const dtcgSchema = schemas.get('dtcg-extensions.json');
  const dtcgId = dtcgSchema.$id;

  // The fragment's root has no manifest scope of its own, so the whole
  // DTCG-context example passes it by construction; the real constraints
  // live in the TokenExtensions definition the payload is composed against.
  const validateRoot = ajv.getSchema(dtcgId);
  assert.ok(
    validateRoot(example),
    `DTCG-context example failed the permissive root: ${JSON.stringify(validateRoot.errors)}`,
  );

  const payload = example.$extensions['recipes.designlasagna'];
  assert.ok(
    payload && typeof payload === 'object' && Object.keys(payload).length > 0,
    'example should carry a non-empty recipes.designlasagna payload',
  );

  const validateTokenExtensions = ajv.getSchema(`${dtcgId}#/definitions/TokenExtensions`);
  assert.ok(
    validateTokenExtensions(payload),
    `recipes.designlasagna payload failed TokenExtensions validation: ${JSON.stringify(validateTokenExtensions.errors)}`,
  );

  // Negative controls: TokenExtensions is typed and closed, which the
  // permissive root would accept.
  assert.ok(
    !validateTokenExtensions({ ...payload, tier: 42 }),
    'TokenExtensions must reject a non-string tier value',
  );
  assert.ok(
    !validateTokenExtensions({ ...payload, bogus: 'not a real field' }),
    'TokenExtensions must reject unknown fields (additionalProperties: false)',
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
