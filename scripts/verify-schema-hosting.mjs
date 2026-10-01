/**
 * Verify that a running site serves the installed v0.4 schema release exactly.
 * This is read-only: it only makes GET requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';

import { PACKAGE_NAME, listSchemaFiles, resolveInstalledSource } from './publish-schemas.mjs';

export const CANONICAL_ORIGIN = 'https://designlasagna.recipes';
const VERSION_PREFIX = 'v0.4';
const USAGE = `Usage: node scripts/verify-schema-hosting.mjs --origin <origin>

Read-only verification of every installed ${PACKAGE_NAME} v0.4 export.
--origin is required. Remote origins must use HTTPS; HTTP is allowed only for
loopback local testing (localhost, 127.0.0.1, or ::1).`;

export function normalizeVerificationOrigin(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('--origin is required');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`invalid --origin: ${value}`);
  }
  if (url.origin !== value.replace(/\/$/, '') || url.username || url.password) {
    throw new Error(`--origin must be an origin without a path, query, fragment, or credentials: ${value}`);
  }
  if (url.protocol === 'https:') return url.origin;
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (url.protocol === 'http:' && loopbackHosts.has(url.hostname)) return url.origin;
  throw new Error('--origin must use HTTPS (HTTP is permitted only for loopback local testing)');
}

export function parseArgs(argv) {
  const options = { origin: undefined, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--origin':
        i += 1;
        if (i >= argv.length) throw new Error('--origin requires a value');
        options.origin = argv[i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  return options;
}

function installedRelease(packageRoot = resolveInstalledSource()) {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (pkg.name !== PACKAGE_NAME) throw new Error(`expected ${PACKAGE_NAME}, found ${JSON.stringify(pkg.name)}`);
  const files = listSchemaFiles(packageRoot, pkg);
  const schemas = [...files.entries()]
    .filter(([relPath]) => relPath.startsWith(`${VERSION_PREFIX}/`))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([relPath, sourceFile]) => ({ relPath, sourceFile, bytes: fs.readFileSync(sourceFile) }));
  if (schemas.length === 0) throw new Error(`installed ${PACKAGE_NAME}@${pkg.version} exports no ${VERSION_PREFIX} schemas`);
  return { packageRoot, version: pkg.version, schemas };
}

function failure(route, kind, message) {
  return { route, kind, message };
}

/**
 * Fetch and verify every v0.4 schema from origin. It returns a complete
 * result rather than throwing for remote failures so callers get a useful
 * summary of every bad route. Setup errors (bad origin/package) still throw.
 */
export async function verifySchemaHosting({ origin, packageRoot, fetchImpl = fetch } = {}) {
  const normalizedOrigin = normalizeVerificationOrigin(origin);
  const release = installedRelease(packageRoot);
  const result = {
    ok: true,
    origin: normalizedOrigin,
    packageVersion: release.version,
    checked: release.schemas.length,
    verified: 0,
    failures: [],
  };
  const downloaded = [];

  for (const schema of release.schemas) {
    const route = `/schemas/${schema.relPath}`;
    const url = new URL(route, `${normalizedOrigin}/`).toString();
    let response;
    try {
      response = await fetchImpl(url);
    } catch (err) {
      result.failures.push(failure(route, 'request', `request failed: ${err.message}`));
      continue;
    }
    if (response.status !== 200) {
      result.failures.push(failure(route, response.status === 404 ? 'missing' : 'response', `expected HTTP 200, got ${response.status}`));
      continue;
    }
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
      result.failures.push(failure(route, 'response', `expected JSON content-type, got ${JSON.stringify(contentType)}`));
      continue;
    }
    let bytes;
    try {
      bytes = Buffer.from(await response.arrayBuffer());
    } catch (err) {
      result.failures.push(failure(route, 'response', `could not read response body: ${err.message}`));
      continue;
    }
    let json;
    try {
      json = JSON.parse(bytes.toString('utf8'));
    } catch (err) {
      result.failures.push(failure(route, 'json', `invalid JSON: ${err.message}`));
      continue;
    }
    if (!bytes.equals(schema.bytes)) {
      result.failures.push(failure(route, 'content', 'response bytes differ from the locked installed package artifact'));
      continue;
    }
    const expectedId = `${CANONICAL_ORIGIN}${route}`;
    if (json.$id !== expectedId) {
      result.failures.push(failure(route, 'id', `expected $id ${expectedId}, got ${JSON.stringify(json.$id)}`));
      continue;
    }
    downloaded.push({ route, json });
    result.verified += 1;
  }

  // Compile the exact downloaded set together so canonical cross-file refs
  // are resolved from the files that were actually fetched, not local copies.
  if (downloaded.length === release.schemas.length) {
    const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true, logger: false });
    try {
      for (const { json } of downloaded) {
        if (!ajv.validateSchema(json)) throw new Error(`${json.$id}: invalid JSON Schema`);
        ajv.addSchema(json);
      }
      for (const { route, json } of downloaded) {
        try {
          ajv.getSchema(json.$id);
        } catch (err) {
          result.failures.push(failure(route, 'reference', `schema compilation/reference resolution failed: ${err.message}`));
        }
      }
    } catch (err) {
      result.failures.push(failure('schema-set', 'reference', `schema-set compilation failed: ${err.message}`));
    }
  } else {
    result.failures.push(failure('schema-set', 'reference', 'not compiled because one or more schema downloads failed verification'));
  }
  result.ok = result.failures.length === 0;
  return result;
}

export function formatResult(result) {
  const heading = result.ok ? 'Schema hosting verification passed' : 'Schema hosting verification failed';
  const lines = [`${heading}: ${result.verified}/${result.checked} routes verified from ${result.origin}`, `Installed ${PACKAGE_NAME}@${result.packageVersion}`];
  for (const item of result.failures) lines.push(`- [${item.kind}] ${item.route}: ${item.message}`);
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return { help: true };
  }
  const result = await verifySchemaHosting({ origin: options.origin });
  process.stdout.write(`${formatResult(result)}\n`);
  if (!result.ok) process.exitCode = 1;
  return result;
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (invokedAsScript) {
  main().catch((err) => {
    process.stderr.write(`verify-schema-hosting: ${err.message}\n`);
    process.exitCode = 1;
  });
}
