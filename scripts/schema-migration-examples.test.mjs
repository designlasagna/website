/**
 * The before/after examples on the migration guide (src/_data/migrationExamples.js)
 * are real documents: each "after" example validates against the v0.4
 * contracts, and each "before" example that has a matching contract validates
 * against the v0.3 snapshot. Negative controls pin the lifecycle rules the
 * guide states next to the examples.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const examples = require('../src/_data/migrationExamples.js');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const V03_FILES = ['tokens.json', 'utilities.json', 'icons.json', 'cem-extensions.json', 'dtcg-extensions.json'];
const V04_FILES = [...V03_FILES, 'lifecycle.json'];

// One instance per format version: the v0.4 contracts resolve relative
// lifecycle.json refs by $id, and the v0.3 and v0.4 $ids differ.
const ajvFor = (schemas) => {
  const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true, logger: false });
  for (const schema of schemas) ajv.addSchema(schema);
  return ajv;
};
const v03 = V03_FILES.map((file) => readJson(new URL(`../src/schemas/v0.3/${file}`, import.meta.url)));
const v04 = V04_FILES.map((file) => readJson(require.resolve(`@designlasagna/schemas/v0.4/${file}`)));
const ajv = { 'v0.3': ajvFor(v03), 'v0.4': ajvFor(v04) };
const byFile = { 'v0.3': new Map(V03_FILES.map((f, i) => [f, v03[i]])), 'v0.4': new Map(V04_FILES.map((f, i) => [f, v04[i]])) };

const validatorFor = ({ version, file, definition }) => {
  const id = byFile[version].get(file).$id;
  const validate = ajv[version].getSchema(definition ? `${id}#/definitions/${definition}` : id);
  assert.ok(validate, `no validator for ${version} ${file} ${definition ?? ''}`);
  return validate;
};
const pick = (value, path = []) => path.reduce((node, key) => node[key], value);

test('the migration guide has native, DTCG and CEM examples', () => {
  assert.deepEqual(examples.map((example) => example.id), ['native', 'dtcg', 'cem']);
  for (const example of examples) {
    assert.ok(example.before.value && example.after.value, `${example.id}: both sides are required`);
    assert.ok(example.after.validates, `${example.id}: the after example must name the contract it validates against`);
  }
});

test('every after example validates against the v0.4 contracts', () => {
  for (const { id, after } of examples) {
    assert.equal(after.validates.version, 'v0.4', `${id}: after must target v0.4`);
    const validate = validatorFor(after.validates);
    assert.ok(
      validate(pick(after.value, after.validates.path)),
      `${id}: after example failed v0.4 validation: ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('every before example with a matching contract validates against v0.3', () => {
  const checked = examples.filter(({ before }) => before.validates);
  assert.ok(checked.length >= 1, 'at least the native before example must be validated');
  for (const { id, before } of checked) {
    assert.equal(before.validates.version, 'v0.3', `${id}: before must target v0.3`);
    const validate = validatorFor(before.validates);
    assert.ok(
      validate(pick(before.value, before.validates.path)),
      `${id}: before example failed v0.3 validation: ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('lifecycle rules the guide states are enforced by the contracts', () => {
  const [native, dtcg, cem] = examples;

  // Native: an object needs a non-empty message.
  const tokens = validatorFor(native.after.validates);
  const badNative = structuredClone(native.after.value);
  badNative.tokens[0].deprecated.message = '';
  assert.ok(!tokens(badNative), 'native deprecated must reject an empty message');

  // DTCG: false and null never go in the extension payload.
  const tokenExtensions = validatorFor(dtcg.after.validates);
  const payload = pick(dtcg.after.value, dtcg.after.validates.path);
  assert.ok(!tokenExtensions({ ...payload, deprecated: false }), 'DTCG extension deprecated must reject false');
  assert.ok(!tokenExtensions({ ...payload, deprecated: null }), 'DTCG extension deprecated must reject null');

  // CEM: deprecated is a boolean or string, never an object.
  const attributeExtensions = validatorFor(cem.after.validates);
  assert.ok(
    !attributeExtensions({ ...cem.after.value, deprecated: { message: 'Use variant.' } }),
    'CEM deprecated must reject an object',
  );
});
