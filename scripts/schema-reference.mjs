/**
 * schema-reference.mjs
 *
 * Dependency-free JSON Schema documentation summarizer.
 *
 * `describeSchema(schema)` takes a JSON Schema object (draft-07 /
 * 2020-12 style) and returns a plain, JSON-serializable "reference"
 * structure suitable for driving documentation UIs:
 *
 *   - title / description
 *   - type
 *   - required properties (list + per-property `required` flag)
 *   - properties (recursively summarized)
 *   - $defs / definitions (recursively summarized)
 *   - enums, const, defaults, examples
 *   - common validation constraints
 *   - $ref annotations (plus best-effort resolution to local defs)
 *   - composition branches: allOf / anyOf / oneOf / not
 *
 * The returned value is always safe to pass to JSON.stringify:
 * circular input is guarded via a seen-set and a depth limit, and any
 * non-serializable value inside the source schema is replaced with a
 * marker string.
 */

const DEFAULT_MAX_DEPTH = 16;
const NON_SERIALIZABLE = '<non-serializable value>';
const INTERNAL_REF_RE = /^#\/(definitions|\$defs)\/(.+)$/;

const CONSTRAINT_KEYS = Object.freeze([
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'maxProperties',
  'minProperties',
  'contentEncoding',
  'contentMediaType',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Return `value` if it is JSON-serializable, otherwise a marker string.
 * JSON.stringify succeeds only when the entire (possibly nested) value
 * can be serialized, so a single top-level check is sufficient.
 */
function safeValue(value) {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NON_SERIALIZABLE;
  }
  if (
    typeof value === 'undefined' ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    return value === undefined ? null : NON_SERIALIZABLE;
  }
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return NON_SERIALIZABLE;
  }
}

/** Drop keys whose value is `undefined` so output matches JSON output 1:1. */
function clean(value) {
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out;
}

function summarizeProperties(rawProperties, depth, ctx) {
  if (!isPlainObject(rawProperties)) return undefined;
  const required =
    Array.isArray(ctx.schemaRequired) &&
    ctx.schemaRequired.length > 0
      ? new Set(ctx.schemaRequired)
      : null;
  const entries = [];
  for (const [name, prop] of Object.entries(rawProperties)) {
    const entry = { name, ...summarize(prop, depth + 1, ctx) };
    if (required) entry.required = required.has(name);
    entries.push(entry);
  }
  return entries;
}

function summarizeDefs(definitions, depth, ctx) {
  if (!isPlainObject(definitions)) return undefined;
  const out = {};
  for (const [name, def] of Object.entries(definitions)) {
    out[name] = summarize(def, depth + 1, ctx);
  }
  return out;
}

function summarizeComposition(raw, depth, ctx) {
  const composition = {};
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(raw[key]) && raw[key].length > 0) {
      composition[key] = raw[key].map((branch) =>
        summarize(branch, depth + 1, ctx),
      );
    }
  }
  if (raw.not !== undefined) composition.not = summarize(raw.not, depth + 1, ctx);
  return Object.keys(composition).length > 0 ? composition : undefined;
}

function summarizeItems(rawItems, depth, ctx) {
  if (rawItems === undefined || rawItems === null) return undefined;
  if (Array.isArray(rawItems)) {
    const items = rawItems.map((entry) => summarize(entry, depth + 1, ctx));
    return { kind: 'tuple', items };
  }
  const summary = summarize(rawItems, depth + 1, ctx);
  return { kind: 'single', schema: summary };
}

function summarize(rootSchema, depth, ctx) {
  const raw = rootSchema;

  if (depth > ctx.maxDepth) {
    return { truncated: true, reason: 'max-depth-reached' };
  }

  if (!isPlainObject(raw)) {
    // JSON Schema allows non-object subschemas (e.g. `true`/`false`).
    return { isObject: false, value: safeValue(raw) };
  }

  if (ctx.seen.has(raw)) {
    return { circular: true };
  }
  ctx.seen.add(raw);
  try {
    return buildNode(raw, depth, ctx);
  } finally {
    ctx.seen.delete(raw);
  }
}

function buildNode(raw, depth, ctx) {
  const node = {};

  if (typeof raw.$id === 'string') node.$id = raw.$id;
  if (typeof raw.title === 'string') node.title = raw.title;
  if (typeof raw.description === 'string') node.description = raw.description;
  // Prefer the standard JSON Schema annotation, while supporting the
  // established `DEPRECATED` wording in older published schemas.
  if (raw.deprecated === true || (typeof raw.description === 'string' && /^deprecated\b/i.test(raw.description.trim()))) {
    node.deprecated = true;
  }

  if (typeof raw.type === 'string') {
    node.type = raw.type;
  } else if (Array.isArray(raw.type)) {
    const types = raw.type.filter((t) => typeof t === 'string');
    if (types.length > 0) node.type = types;
  }
  if (typeof raw.format === 'string') node.format = raw.format;

  const required = Array.isArray(raw.required)
    ? raw.required.filter((name) => typeof name === 'string')
    : undefined;
  if (required) node.required = [...required];

  if (typeof raw.$ref === 'string') {
    node.$ref = raw.$ref;
    const match = INTERNAL_REF_RE.exec(raw.$ref);
    if (match) {
      const defName = match[2];
      if (ctx.allDefinitions.has(defName)) node.$refLocalDef = defName;
      else if (ctx.root !== null && ctx.root !== raw && isPlainObject(ctx.root)) {
        const rootDefs = Object.assign(
          {},
          isPlainObject(ctx.root.definitions) ? ctx.root.definitions : {},
          isPlainObject(ctx.root.$defs) ? ctx.root.$defs : {},
        );
        if (defName in rootDefs) node.$refLocalDef = defName;
      }
    }
    ctx.refs.push(raw.$ref);
  }

  const constraints = {};
  for (const key of CONSTRAINT_KEYS) {
    if (raw[key] !== undefined) constraints[key] = safeValue(raw[key]);
  }
  if (Object.keys(constraints).length > 0) node.constraints = constraints;

  if (Array.isArray(raw.enum)) {
    const values = raw.enum.map(safeValue);
    node.enum = { values, count: values.length };
  }
  if (raw.const !== undefined) node.const = safeValue(raw.const);
  if (raw.default !== undefined) node.default = safeValue(raw.default);

  const examples = Array.isArray(raw.examples)
    ? raw.examples
    : raw.example !== undefined
      ? [raw.example]
      : [];
  if (examples.length > 0) node.examples = examples.map(safeValue);

  const properties = summarizeProperties(raw.properties, depth, {
    ...ctx,
    schemaRequired: required,
  });
  if (properties) node.properties = properties;

  if (raw.items !== undefined) node.items = summarizeItems(raw.items, depth, ctx);

  if (isPlainObject(raw.patternProperties)) {
    const subs = {};
    for (const [pattern, sub] of Object.entries(raw.patternProperties)) {
      subs[pattern] = summarize(sub, depth + 1, ctx);
    }
    node.patternProperties = subs;
  }
  if (raw.additionalProperties !== undefined) {
    node.additionalProperties = isPlainObject(raw.additionalProperties)
      ? summarize(raw.additionalProperties, depth + 1, ctx)
      : safeValue(raw.additionalProperties);
  }

  const definitions = {};
  if (isPlainObject(raw.definitions)) Object.assign(definitions, raw.definitions);
  if (isPlainObject(raw.$defs)) Object.assign(definitions, raw.$defs);
  if (Object.keys(definitions).length > 0) {
    node.definitions = summarizeDefs(definitions, depth, ctx);
  }

  const composition = summarizeComposition(raw, depth, ctx);
  if (composition) node.composition = composition;

  return clean(node);
}

/**
 * Summarize a JSON Schema object into serializable documentation data.
 *
 * @param {object} schema JSON Schema object.
 * @param {object} [options]
 * @param {number} [options.maxDepth] Recursion depth limit before a node is
 *   truncated (default 16).
 * @returns {object} Plain, JSON-serializable documentation data.
 */
export function describeSchema(schema, options = {}) {
  const maxDepth =
    Number.isFinite(options.maxDepth) && options.maxDepth >= 0
      ? options.maxDepth
      : DEFAULT_MAX_DEPTH;

  const root = isPlainObject(schema) ? schema : null;
  const ctx = {
    root,
    maxDepth,
    seen: new Set(),
    refs: [],
    allDefinitions: new Set(),
  };

  if (root !== null) {
    for (const key of ['definitions', '$defs']) {
      const defs = root[key];
      if (isPlainObject(defs)) {
        for (const name of Object.keys(defs)) ctx.allDefinitions.add(name);
      }
    }
  }

  const summary = summarize(schema, 0, ctx);

  const uniqueRefs = [...new Set(ctx.refs)];
  if (uniqueRefs.length > 0) summary.refs = uniqueRefs;

  return clean(summary);
}

export default describeSchema;
