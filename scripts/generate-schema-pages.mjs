import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = '/home/magnus/Code/Private/website';
const schemasRoot = '/home/magnus/Code/Private/schemas';

const pages = [
  {
    out: 'schemas/v0.2/tokens.html',
    schema: 'v0.2/tokens.json',
    title: 'v0.2 tokens.json',
    url: 'https://designlasagna.recipes/v0.2/tokens.json',
    rawPath: '/v0.2/tokens.json',
    sections: [
      { label: 'Manifest fields', ptr: ['properties'], requiredPtr: ['required'] },
      { label: 'Token fields', ptr: ['definitions', 'Token', 'properties'], requiredPtr: ['definitions', 'Token', 'required'] }
    ],
    exampleRootCollection: 'tokens',
    exampleDefinition: 'Token'
  },
  {
    out: 'schemas/v0.2/utilities.html',
    schema: 'v0.2/utilities.json',
    title: 'v0.2 utilities.json',
    url: 'https://designlasagna.recipes/v0.2/utilities.json',
    rawPath: '/v0.2/utilities.json',
    sections: [
      { label: 'Manifest fields', ptr: ['properties'], requiredPtr: ['required'] },
      { label: 'Category fields', ptr: ['definitions', 'Category', 'properties'], requiredPtr: ['definitions', 'Category', 'required'] },
      { label: 'Utility fields', ptr: ['definitions', 'UtilityClass', 'properties'], requiredPtr: ['definitions', 'UtilityClass', 'required'] }
    ],
    exampleRootCollection: 'categories',
    exampleDefinition: 'Category'
  },
  {
    out: 'schemas/v0.2/cem-extensions.html',
    schema: 'v0.2/cem-extensions.json',
    title: 'v0.2 cem-extensions.json',
    url: 'https://designlasagna.recipes/v0.2/cem-extensions.json',
    rawPath: '/v0.2/cem-extensions.json',
    sections: [
      { label: 'LifecycleFields', ptr: ['definitions', 'LifecycleFields', 'properties'], requiredPtr: ['definitions', 'LifecycleFields', 'required'] },
      { label: 'DeprecatedValue', ptr: ['definitions', 'DeprecatedValue', 'properties'], requiredPtr: ['definitions', 'DeprecatedValue', 'required'] },
      { label: 'AttributeExtensions', ptr: ['definitions', 'AttributeExtensions', 'properties'], requiredPtr: ['definitions', 'AttributeExtensions', 'required'] },
      { label: 'SlotExtensions', ptr: ['definitions', 'SlotExtensions', 'properties'], requiredPtr: ['definitions', 'SlotExtensions', 'required'] },
      { label: 'CssPropertyExtensions', ptr: ['definitions', 'CssPropertyExtensions', 'properties'], requiredPtr: ['definitions', 'CssPropertyExtensions', 'required'] }
    ],
    customExample: {
      status: 'deprecated',
      removal: '2026-07-30',
      replacement: 'new-attribute'
    }
  },
  {
    out: 'schemas/v0.3/tokens.html',
    schema: 'v0.3/tokens.json',
    title: 'v0.3 tokens.json',
    url: 'https://designlasagna.recipes/v0.3/tokens.json',
    rawPath: '/v0.3/tokens.json',
    sections: [
      { label: 'Manifest fields', ptr: ['properties'], requiredPtr: ['required'] },
      { label: 'Token fields', ptr: ['definitions', 'Token', 'properties'], requiredPtr: ['definitions', 'Token', 'required'] }
    ],
    exampleRootCollection: 'tokens',
    exampleDefinition: 'Token'
  },
  {
    out: 'schemas/v0.3/utilities.html',
    schema: 'v0.3/utilities.json',
    title: 'v0.3 utilities.json',
    url: 'https://designlasagna.recipes/v0.3/utilities.json',
    rawPath: '/v0.3/utilities.json',
    sections: [
      { label: 'Manifest fields', ptr: ['properties'], requiredPtr: ['required'] },
      { label: 'Category fields', ptr: ['definitions', 'Category', 'properties'], requiredPtr: ['definitions', 'Category', 'required'] },
      { label: 'Utility fields', ptr: ['definitions', 'UtilityClass', 'properties'], requiredPtr: ['definitions', 'UtilityClass', 'required'] }
    ],
    exampleRootCollection: 'utilities',
    exampleDefinition: 'UtilityClass'
  },
  {
    out: 'schemas/v0.3/cem-extensions.html',
    schema: 'v0.3/cem-extensions.json',
    title: 'v0.3 cem-extensions.json',
    url: 'https://designlasagna.recipes/v0.3/cem-extensions.json',
    rawPath: '/v0.3/cem-extensions.json',
    sections: [
      { label: 'LifecycleFields', ptr: ['definitions', 'LifecycleFields', 'properties'], requiredPtr: ['definitions', 'LifecycleFields', 'required'] },
      { label: 'DeprecatedValue', ptr: ['definitions', 'DeprecatedValue', 'properties'], requiredPtr: ['definitions', 'DeprecatedValue', 'required'] },
      { label: 'AttributeExtensions', ptr: ['definitions', 'AttributeExtensions', 'properties'], requiredPtr: ['definitions', 'AttributeExtensions', 'required'] },
      { label: 'SlotExtensions', ptr: ['definitions', 'SlotExtensions', 'properties'], requiredPtr: ['definitions', 'SlotExtensions', 'required'] },
      { label: 'CssPropertyExtensions', ptr: ['definitions', 'CssPropertyExtensions', 'properties'], requiredPtr: ['definitions', 'CssPropertyExtensions', 'required'] }
    ],
    customExample: {
      status: 'deprecated',
      removal: '2026-07-30',
      replacement: 'new-attribute'
    }
  },
  {
    out: 'schemas/v0.3/icons.html',
    schema: 'v0.3/icons.json',
    title: 'v0.3 icons.json',
    url: 'https://designlasagna.recipes/v0.3/icons.json',
    rawPath: '/v0.3/icons.json',
    sections: [
      { label: 'Manifest fields', ptr: ['properties'], requiredPtr: ['required'] },
      { label: 'Icon fields', ptr: ['definitions', 'Icon', 'properties'], requiredPtr: ['definitions', 'Icon', 'required'] }
    ],
    exampleRootCollection: 'icons',
    exampleDefinition: 'Icon'
  }
];

function get(obj, ptr) {
  return ptr.reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);
}

function esc(v = '') {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function typeOfSchema(schema) {
  if (!schema) return '';
  if (schema.$ref) return schema.$ref.replace('#/definitions/', 'def:');
  if (schema.type) return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type;
  if (schema.oneOf) return schema.oneOf.map(typeOfSchema).filter(Boolean).join(' | ');
  if (schema.anyOf) return schema.anyOf.map(typeOfSchema).filter(Boolean).join(' | ');
  if (schema.enum) return `enum(${schema.enum.join(', ')})`;
  return '';
}

function exampleValue(spec, schema, depth = 0) {
  if (!spec || depth > 4) return 'string';
  if (spec.$ref) {
    const defName = spec.$ref.replace('#/definitions/', '');
    return exampleValue(schema.definitions?.[defName], schema, depth + 1);
  }
  if (spec.oneOf?.length) return exampleValue(spec.oneOf[0], schema, depth + 1);
  if (spec.anyOf?.length) return exampleValue(spec.anyOf[0], schema, depth + 1);
  if (spec.enum?.length) return spec.enum[0];

  const t = Array.isArray(spec.type) ? spec.type.find((x) => x !== 'null') : spec.type;
  if (t === 'string') return spec.format === 'date-time' ? '2026-01-01T00:00:00.000Z' : 'string';
  if (t === 'integer' || t === 'number') return 0;
  if (t === 'boolean') return false;
  if (t === 'array') return [exampleValue(spec.items || { type: 'string' }, schema, depth + 1)];
  if (t === 'object') {
    const req = spec.required || [];
    const props = spec.properties || {};
    const out = {};
    for (const k of req) out[k] = exampleValue(props[k] || { type: 'string' }, schema, depth + 1);
    return out;
  }

  return 'string';
}

function buildManifestExample(page, schema) {
  if (page.customExample) return page.customExample;

  const out = {
    $schema: page.url,
    schemaVersion: page.url.includes('/v0.3/') ? '0.3.0' : '0.2.0'
  };

  if (page.exampleRootCollection && page.exampleDefinition) {
    const def = schema.definitions?.[page.exampleDefinition] || { type: 'object', properties: {}, required: [] };
    out[page.exampleRootCollection] = [exampleValue(def, schema)];
  }

  return out;
}

function tableRows(properties, required) {
  return Object.entries(properties)
    .map(([name, spec]) => {
      const type = typeOfSchema(spec);
      const desc = spec.description || '';
      return `<tr><td><code>${esc(name)}</code></td><td>${required.has(name) ? 'yes' : ''}</td><td>${esc(type)}</td><td>${esc(desc)}</td></tr>`;
    })
    .join('');
}

for (const page of pages) {
  const schema = JSON.parse(readFileSync(resolve(schemasRoot, page.schema), 'utf8'));
  const sectionsHtml = page.sections
    .map((section) => {
      const properties = get(schema, section.ptr) || {};
      const required = new Set(get(schema, section.requiredPtr) || []);
      return `<h2>${esc(section.label)}</h2><table><tr><th>Field</th><th>Required</th><th>Type</th><th>Description</th></tr>${tableRows(properties, required)}</table>`;
    })
    .join('');

  const example = buildManifestExample(page, schema);
  const exampleHtml = `<h2>Minimal example</h2><pre>${esc(JSON.stringify(example, null, 2))}</pre>`;

  const mark = `<svg viewBox='0 0 24 18' fill='currentColor' aria-hidden='true'><rect width='24' height='4' rx='1'/><rect y='7' width='16' height='4' rx='1'/><rect y='14' width='8' height='4' rx='1'/></svg>`;
  const html = `<!doctype html><html lang='en'><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${esc(page.title)} — Design Lasagna</title><link rel='icon' type='image/svg+xml' href='/assets/mark.svg'/><link rel='stylesheet' href='/assets/styles.css'/></head><body><header><nav><a href='/' class='brand'>${mark}Design Lasagna</a><a href='/schemas/' aria-current='page'>Schemas</a><a href='/language-server.html'>Language Server</a><a href='/examples.html'>Examples</a></nav></header><main><h1>${esc(page.title)}</h1><p><a href='${esc(page.rawPath || page.url)}'>Open raw schema JSON</a></p><p><code>${esc(page.url)}</code></p>${exampleHtml}${sectionsHtml}<p class='muted'>Auto-generated from <code>${esc(page.schema)}</code>.</p></main><footer><span>Design Lasagna</span><nav><a href='/schemas/'>Schemas</a><a href='/language-server.html'>Language Server</a><a href='https://github.com/designlasagna/schemas'>GitHub</a></nav></footer></body></html>`;

  const outPath = resolve(root, page.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
}

console.log('Schema pages generated.');
