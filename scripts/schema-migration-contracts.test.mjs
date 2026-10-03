/**
 * Contract-diff regression tests pinning the v0.3 → v0.4 migration guide
 * claims against the actual schemas:
 *
 *   - v0.3 contracts are read from the checked-in snapshots under
 *     src/schemas/v0.3/ (immutable Eleventy passthrough files);
 *   - v0.4 contracts are read from the installed
 *     @designlasagna/schemas package (v0.4/);
 *   - the CEM/DTCG profile-selection mechanism the guide relies on is
 *     verified against the package's lifecycle documentation.
 *
 * If a claim in the migration guide stops matching the schemas, these tests
 * fail before the prose can silently drift.
 *
 * Pure file checks: no build, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v03 = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/schemas/v0.3', file), 'utf8'));
const v04 = (file) => JSON.parse(fs.readFileSync(path.join(projectRoot, 'node_modules/@designlasagna/schemas/v0.4', file), 'utf8'));

const STATUS_REF = 'lifecycle.json#/definitions/Status';
const DEPRECATED_REF = 'lifecycle.json#/definitions/Deprecated';
const STRICT_DEPRECATED_REF = 'lifecycle.json#/definitions/StrictDeprecated';
const NATIVE_DEPRECATION_REF = 'lifecycle.json#/definitions/NativeDeprecation';

test('v0.4 adds a new lifecycle.json fragment with no v0.3 counterpart', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'src/schemas/v0.3/lifecycle.json')), 'v0.3 must not have a lifecycle.json');
  const lifecycle = v04('lifecycle.json');
  assert.deepEqual(Object.keys(lifecycle.definitions).sort(), ['Deprecated', 'DeprecatedValue', 'NativeDeprecation', 'Status', 'StrictDeprecated']);
  // Definitions-only composable fragment: not a manifest validator.
  assert.ok(!('properties' in lifecycle), 'lifecycle.json must be definitions-only');
  assert.ok(!('required' in lifecycle), 'lifecycle.json must be definitions-only');
  assert.deepEqual(lifecycle.definitions.Status.type, 'string');
  const native = lifecycle.definitions.NativeDeprecation.oneOf;
  assert.equal(native.length, 3);
  assert.equal(native[0].const, false, 'NativeDeprecation must accept explicit false');
  assert.equal(native[0].type, 'boolean');
  assert.equal(native[1].type, 'null');
  assert.equal(native[2].$ref, '#/definitions/Deprecated');
  assert.equal(lifecycle.definitions.StrictDeprecated.additionalProperties, false);
  assert.notEqual(lifecycle.definitions.Deprecated.additionalProperties, false, 'Deprecated record must stay permissive');
  assert.equal(lifecycle.definitions.Deprecated.properties.message.minLength, 1);
  assert.deepEqual(lifecycle.definitions.DeprecatedValue.required.sort(), ['message', 'value']);
});

test('contract URLs move from /v0.3/ to /schemas/v0.4/', () => {
  const v03Files = ['tokens.json', 'utilities.json', 'icons.json', 'cem-extensions.json', 'dtcg-extensions.json'];
  for (const file of v03Files) {
    assert.equal(v03(file).$id, `https://designlasagna.recipes/v0.3/${file}`, `v0.3 ${file} $id moved`);
  }
  for (const file of [...v03Files, 'lifecycle.json']) {
    assert.equal(v04(file).$id, `https://designlasagna.recipes/schemas/v0.4/${file}`, `v0.4 ${file} $id moved`);
  }
});

test('root manifest requirements are unchanged', () => {
  for (const [file, required] of [
    ['tokens.json', ['schemaVersion', 'tokens']],
    ['utilities.json', ['schemaVersion']],
    ['icons.json', ['schemaVersion', 'icons']],
  ]) {
    assert.deepEqual(v03(file).required, required, `v0.3 ${file} root required changed`);
    assert.deepEqual(v04(file).required, required, `v0.4 ${file} root required changed`);
    assert.deepEqual(v04(file).properties.schemaVersion.type, 'string', `${file} schemaVersion must stay a plain string`);
  }
});

test('tokens.json: status added, deprecated gains explicit false, platform mappings closed', () => {
  const a = v03('tokens.json');
  const b = v04('tokens.json');
  assert.ok(!('status' in a.definitions.Token.properties), 'v0.3 Token must not have status');
  assert.equal(b.definitions.Token.properties.status.$ref, STATUS_REF);
  // v0.3: null or a record. v0.4: the shared NativeDeprecation union (adds false).
  assert.equal(a.definitions.Token.properties.deprecated.oneOf.length, 2);
  assert.ok(a.definitions.Token.properties.deprecated.oneOf.every((branch) => branch.const !== false), 'v0.3 Token.deprecated must not accept false');
  assert.equal(b.definitions.Token.properties.deprecated.$ref, NATIVE_DEPRECATION_REF);
  // Platform mappings: usage removed, now closed.
  assert.ok('usage' in a.definitions.PlatformMapping.properties, 'v0.3 PlatformMapping must have usage');
  assert.equal(a.definitions.PlatformMapping.additionalProperties, true);
  assert.ok(!('usage' in b.definitions.PlatformMapping.properties), 'v0.4 PlatformMapping must not have usage');
  assert.equal(b.definitions.PlatformMapping.additionalProperties, false);
  // Local Deprecated becomes an alias of the shared definition (message now non-empty).
  assert.ok(!('minLength' in a.definitions.Deprecated.properties.message), 'v0.3 tokens Deprecated.message must not require minLength');
  assert.equal(b.definitions.Deprecated.$ref, DEPRECATED_REF);
});

test('utilities.json: status now references the shared definition, deprecated gains explicit false', () => {
  const a = v03('utilities.json');
  const b = v04('utilities.json');
  assert.equal(a.definitions.UtilityClass.properties.status.type, 'string', 'v0.3 UtilityClass.status was a free string');
  assert.ok(!('$ref' in a.definitions.UtilityClass.properties.status), 'v0.3 UtilityClass.status must not be a $ref');
  assert.equal(b.definitions.UtilityClass.properties.status.$ref, STATUS_REF, 'v0.4 UtilityClass.status must still accept any string via Status');
  assert.equal(a.definitions.UtilityClass.properties.deprecated.oneOf.length, 2);
  assert.equal(b.definitions.UtilityClass.properties.deprecated.$ref, NATIVE_DEPRECATION_REF);
  assert.ok(!('minLength' in a.definitions.Deprecated.properties.message), 'v0.3 utilities Deprecated.message must not require minLength');
  assert.equal(b.definitions.Deprecated.$ref, DEPRECATED_REF);
});

test('icons.json: status added, deprecated gains explicit false', () => {
  const a = v03('icons.json');
  const b = v04('icons.json');
  assert.ok(!('status' in a.definitions.Icon.properties), 'v0.3 Icon must not have status');
  assert.equal(b.definitions.Icon.properties.status.$ref, STATUS_REF);
  assert.equal(a.definitions.Icon.properties.deprecated.oneOf.length, 2);
  assert.equal(b.definitions.Icon.properties.deprecated.$ref, NATIVE_DEPRECATION_REF);
  assert.equal(b.definitions.Deprecated.$ref, DEPRECATED_REF);
});

test('cem-extensions.json: definitions-only in both versions, deprecated marker and status reference added', () => {
  const a = v03('cem-extensions.json');
  const b = v04('cem-extensions.json');
  for (const [label, contract] of [['v0.3', a], ['v0.4', b]]) {
    assert.ok('definitions' in contract, `${label} cem must be definitions-only`);
    assert.ok(!('properties' in contract), `${label} cem must be definitions-only`);
  }
  assert.deepEqual(Object.keys(a.definitions.LifecycleFields.properties).sort(), ['removal', 'replacement', 'status']);
  assert.equal(a.definitions.LifecycleFields.properties.status.type, 'string', 'v0.3 CEM status was a free string');
  assert.equal(b.definitions.LifecycleFields.properties.status.$ref, STATUS_REF);
  assert.deepEqual(b.definitions.LifecycleFields.properties.deprecated.oneOf, [
    { type: 'boolean' },
    { type: 'string' },
  ]);
  // New per-entity extension definitions in v0.4.
  for (const name of ['DeclarationExtensions', 'MemberExtensions', 'CssPartExtensions', 'EventExtensions']) {
    assert.ok(!(name in a.definitions), `v0.3 cem must not have ${name}`);
    assert.equal(b.definitions[name].$ref, '#/definitions/LifecycleFields', `v0.4 ${name} must reference LifecycleFields`);
  }
  // Slot/CssProperty extensions collapse to the shared LifecycleFields.
  for (const name of ['SlotExtensions', 'CssPropertyExtensions']) {
    assert.equal(a.definitions[name].type, 'object', `v0.3 ${name} was inline`);
    assert.equal(b.definitions[name].$ref, '#/definitions/LifecycleFields');
  }
  // AttributeExtensions gains deprecated and status.
  assert.ok(!('deprecated' in a.definitions.AttributeExtensions.properties), 'v0.3 AttributeExtensions must not have deprecated');
  assert.ok(!('status' in a.definitions.AttributeExtensions.properties), 'v0.3 AttributeExtensions must not have status');
  assert.deepEqual(b.definitions.AttributeExtensions.properties.deprecated.oneOf, [{ type: 'boolean' }, { type: 'string' }]);
  assert.equal(b.definitions.AttributeExtensions.properties.status.$ref, STATUS_REF);
  assert.equal(b.definitions.DeprecatedValue.$ref, 'lifecycle.json#/definitions/DeprecatedValue');
});

test('dtcg-extensions.json: status added to token and group extensions, StrictDeprecated alias, platform mappings closed', () => {
  const a = v03('dtcg-extensions.json');
  const b = v04('dtcg-extensions.json');
  for (const name of ['TokenExtensions', 'GroupExtensions']) {
    assert.ok(!('status' in a.definitions[name].properties), `v0.3 ${name} must not have status`);
    assert.equal(b.definitions[name].properties.status.$ref, STATUS_REF);
    assert.equal(b.definitions[name].additionalProperties, false, `${name} must stay closed`);
  }
  // v0.3 local closed Deprecated record; v0.4 aliases the shared StrictDeprecated.
  assert.equal(a.definitions.Deprecated.additionalProperties, false);
  assert.equal(a.definitions.Deprecated.required[0], 'message');
  assert.ok(!('minLength' in a.definitions.Deprecated.properties.message), 'v0.3 dtcg Deprecated.message must not require minLength');
  assert.equal(b.definitions.Deprecated.$ref, STRICT_DEPRECATED_REF);
  // Platform mappings: usage removed, now closed.
  assert.ok('usage' in a.definitions.PlatformMapping.properties, 'v0.3 dtcg PlatformMapping must have usage');
  assert.equal(a.definitions.PlatformMapping.additionalProperties, true);
  assert.ok(!('usage' in b.definitions.PlatformMapping.properties), 'v0.4 dtcg PlatformMapping must not have usage');
  assert.equal(b.definitions.PlatformMapping.additionalProperties, false);
});

test('the shared Deprecated record requires a non-empty message in v0.4 (a real constraint change)', () => {
  const lifecycle = v04('lifecycle.json');
  assert.equal(lifecycle.definitions.Deprecated.properties.message.minLength, 1);
  assert.equal(lifecycle.definitions.StrictDeprecated.properties.message.minLength, 1);
  for (const file of ['tokens.json', 'utilities.json', 'icons.json']) {
    assert.equal(v03(file).definitions.Deprecated.properties.message.minLength, undefined, `v0.3 ${file} allowed empty messages`);
  }
});

test('CEM slot/cssProperty extensions gain status in v0.4 (v0.3 inline forms had none)', () => {
  const a = v03('cem-extensions.json');
  for (const name of ['SlotExtensions', 'CssPropertyExtensions']) {
    assert.ok(!('status' in (a.definitions[name].properties ?? {})), `v0.3 ${name} had no status`);
    assert.ok('deprecated' in a.definitions[name].properties, `v0.3 ${name} had an inline deprecated`);
  }
  assert.equal(v04('cem-extensions.json').definitions.LifecycleFields.properties.status.$ref, STATUS_REF, 'v0.4 slot/cssProperty status comes from the shared Status definition');
});

test('CEM DeprecatedValue.message gains a non-empty requirement in v0.4', () => {
  assert.ok(!('minLength' in v03('cem-extensions.json').definitions.DeprecatedValue.properties.message), 'v0.3 CEM DeprecatedValue.message allowed empty strings');
  assert.equal(v04('lifecycle.json').definitions.DeprecatedValue.properties.message.minLength, 1, 'v0.4 DeprecatedValue.message requires minLength 1');
});

test('v0.4 makes DTCG group deprecation replacement semantics explicit in the contract description', () => {
  const v3Desc = v03('dtcg-extensions.json').definitions.GroupExtensions.properties.deprecated.description ?? '';
  const v4Desc = v04('dtcg-extensions.json').definitions.GroupExtensions.properties.deprecated.description ?? '';
  assert.ok(!v3Desc.includes('replaces this whole record'), 'v0.3 group deprecation did not state whole-record replacement');
  assert.ok(v4Desc.includes('replaces this whole record'), 'v0.4 group deprecation must state whole-record replacement');
  assert.ok(v4Desc.includes('$deprecated: false'), 'v0.4 group deprecation must state that $deprecated: false clears inherited deprecation');
});

test('CEM/DTCG lifecycle profile selection is documented by the shipped package', () => {
  const doc = fs.readFileSync(path.join(projectRoot, 'node_modules/@designlasagna/schemas/docs/lifecycle-migration.md'), 'utf8');
  assert.match(doc, /Select lifecycle profile `0\.4` in project\/resolver configuration/);
  assert.match(doc, /No profile selection means legacy behavior/);
});
