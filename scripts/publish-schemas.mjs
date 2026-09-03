/**
 * publish-schemas.mjs — raw-schema publication infrastructure.
 *
 * Copies every JSON Schema exported by the `@designlasagna/schemas` package
 * (v0.2, v0.3, and the vendored DTCG 2025.10 format schema) into a
 * `<output>/` directory, preserving each file's package-relative path, so
 * that schemas are deployable at `https://designlasagna.recipes/schemas/...`.
 *
 * Before anything is written, the script verifies that every Design Lasagna
 * schema's `$id` matches its intended deployed URL:
 *
 *   <base-url>/schemas/<package-relative-path>
 *
 * Exactly ONE vendored file is EXCLUDED from the `$id` rule:
 * `dtcg/2025.10/format.json`. It intentionally keeps the upstream
 * designtokens.org `$id`
 * (https://www.designtokens.org/schemas/2025.10/format.json). Any OTHER
 * path under `dtcg/...` (or outside it) still fails the `$id` check.
 *
 * Usage:
 *
 *   node scripts/publish-schemas.mjs
 *   node scripts/publish-schemas.mjs --source /path/to/schemas --output /path/to/dist/schemas
 *   node scripts/publish-schemas.mjs --base-url https://preview.example.test
 *
 * Defaults:
 *   --source  the installed `@designlasagna/schemas` package root
 *   --output  <project root>/dist/schemas
 *   --base-url https://designlasagna.recipes
 *
 * Local verification note: as of writing the npm-published package still
 * carries pre-migration `$id`s, so the default (installed-package) flow is
 * expected to FAIL the `$id` check until a migrated package is published.
 * Use `--source` pointing at a canonical, migrated checkout and a matching
 * `--base-url` for local verification.
 *
 * This script is standalone (Node built-ins only), not yet wired into the
 * npm build.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');

export const DEFAULT_BASE_URL = 'https://designlasagna.recipes';
export const PACKAGE_NAME = '@designlasagna/schemas';
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, 'dist', 'schemas');

/** Matches package-relative schema paths: v0.2/..., v0.3/..., dtcg/... */
const SCHEMA_PATH_RE = /^(v\d+(?:\.\d+)*|dtcg)\/.+\.(json|schema\.json)$/;

/**
 * The single vendored upstream schema that keeps its original (non-site)
 * $id. The exemption is this exact path, not the whole `dtcg/` directory.
 */
export const DTCG_VENDORED_SCHEMA = 'dtcg/2025.10/format.json';

const USAGE = `Usage: node scripts/publish-schemas.mjs [options]

Copies every JSON Schema exported by ${PACKAGE_NAME} into the output
directory, preserving package-relative paths, and verifies that each
Design Lasagna schema $id matches its deployed /schemas/ URL.
Vendored upstream file dtcg/2025.10/format.json is copied and exempt from
the $id check (it keeps its designtokens.org $id); any other dtcg/... schema
is still checked.

Options:
  --source <dir>     Package source root (default: installed
                     @designlasagna/schemas package)
  --output <dir>     Output directory, e.g. dist/schemas (default:
                     <project root>/dist/schemas)
  --base-url <url>   Base URL used for the expected $id
                     (default: ${DEFAULT_BASE_URL})
  -h, --help         Show this help

Exit status is 0 on success, 1 on any validation or copy error.
Nothing is written if validation fails.`;

/**
 * Resolve the source root of the installed `@designlasagna/schemas` package.
 * Throw if the package is not installed or the "./package.json" subpath is
 * not resolvable.
 */
export function resolveInstalledSource(name = PACKAGE_NAME) {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve(`${name}/package.json`);
  return path.dirname(pkgJsonPath);
}

/** True when `child` is strictly inside `root` (resolved absolute paths). */
function isInside(root, child) {
  const rel = path.relative(root, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Normalize a base URL (http/https only, no trailing slash). */
export function normalizeBaseUrl(baseUrl) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`invalid --base-url (must be a valid URL): ${baseUrl}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`invalid --base-url (must be http/https): ${baseUrl}`);
  }
  return url.toString().replace(/\/+$/, '');
}

/** The intended deployed URL for one schema file. */
export function expectedSchemaUrl(baseUrl, packageRelativePath) {
  const segments = packageRelativePath.split(/[\\/]+/).filter(Boolean).join('/');
  return `${normalizeBaseUrl(baseUrl)}/schemas/${segments}`;
}

/**
 * Parse CLI arguments. Throws on unknown flags or missing values.
 */
export function parseArgs(argv) {
  const opts = { source: undefined, output: undefined, baseUrl: undefined, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = (flag) => {
      i += 1;
      if (i >= argv.length) throw new Error(`${flag} requires a value`);
      return argv[i];
    };
    switch (arg) {
      case '--source':
        opts.source = next(arg);
        break;
      case '--output':
        opts.output = next(arg);
        break;
      case '--base-url':
        opts.baseUrl = next(arg);
        break;
      case '-h':
      case '--help':
        opts.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${arg}\n\n${USAGE}`);
    }
  }
  return opts;
}

/**
 * Resolve a package `exports` value (string or conditional-exports object)
 * to a single string file target by following the `default` chain. Throws a
 * clear error when no string target can be selected.
 */
function resolveExportTarget(key, target) {
  let current = target;
  let hops = 0;
  while (current !== null && typeof current === 'object' && !Array.isArray(current)) {
    current = current.default;
    if (++hops > 64) {
      throw new Error(
        `unresolvable export ${JSON.stringify(key)}: "default" chain is " +
          "circular or absurdly deep; expected a string file target`,
      );
    }
  }
  if (typeof current !== 'string' || current.length === 0) {
    throw new Error(
      `unresolvable export ${JSON.stringify(key)}: expected a string file ` +
        `target (possibly under "default"), but found: ${JSON.stringify(target)}`,
    );
  }
  return current;
}

/**
 * Collect the package-relative paths of every exported schema JSON file.
 * Each `exports` entry whose *advertised key* is a v0.x or dtcg JSON path
 * (e.g. "./v0.3/tokens.json") is published under that key's relative path.
 * A target may be a plain string or a conditional-exports object; the
 * latter is resolved via its `default` chain, and a schema export with no
 * resolvable string target is a hard error (not a silent skip).
 * Non-schema exports (e.g. "./examples/*") are ignored, and a target that
 * resolves outside the source root is an unsafe source.
 */
export function listSchemaFiles(sourceRoot, pkg) {
  if (typeof pkg?.exports !== 'object' || pkg.exports === null) {
    throw new Error(
      `source package ${sourceRoot} has no usable "exports" map; ` +
        `refusing to guess which files to publish`,
    );
  }

  const files = new Map(); // package-relative path -> absolute source path
  for (const [key, target] of Object.entries(pkg.exports)) {
    if (!key.startsWith('./')) continue; // non-absolute subpaths: not handled

    const relFromSource = key.slice(2);
    if (!SCHEMA_PATH_RE.test(relFromSource)) continue; // e.g. ./examples/*

    const fileTarget = resolveExportTarget(key, target);
    const resolved = path.resolve(sourceRoot, fileTarget);
    if (!isInside(sourceRoot, resolved)) {
      throw new Error(
        `unsafe source: export ${JSON.stringify(key)} resolves outside the ` +
          `source root: ${resolved}`,
      );
    }
    files.set(relFromSource, resolved);
  }

  return files;
}

/**
 * Verify $id values (Design Lasagna schemas only; the exact vendored file
 * dtcg/2025.10/format.json is exempt) and read the exact bytes to copy. Throws listing ALL mismatches before any
 * file is written.
 */
function verifyAndStage(sourceRoot, files, baseUrl) {
  const staged = [];
  const problems = [];

  for (const [relPath, sourceFile] of [...files.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`unsafe/missing source: exported schema not found: ${sourceFile}`);
    }
    const realFile = fs.realpathSync(sourceFile);
    if (!isInside(fs.realpathSync(sourceRoot), realFile)) {
      throw new Error(
        `unsafe source: schema file escapes the source root via symlink: ${sourceFile}`,
      );
    }
    if (!fs.statSync(sourceFile).isFile()) {
      throw new Error(`unsafe source: not a regular file: ${sourceFile}`);
    }

    let schema;
    try {
      schema = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    } catch (err) {
      throw new Error(`invalid JSON in schema ${relPath}: ${err.message}`, { cause: err });
    }

    // The exemption is the EXACT vendored upstream file, not any dtcg/ path.
    const isVendoredDtcg = relPath === DTCG_VENDORED_SCHEMA;
    if (!isVendoredDtcg) {
      const expected = expectedSchemaUrl(baseUrl, relPath);
      if (typeof schema.$id !== 'string' || schema.$id !== expected) {
        problems.push(
          `${relPath}\n  actual   $id: ${JSON.stringify(schema.$id ?? null)}\n  expected $id: ${expected}`,
        );
      }
    }

    staged.push({ relPath, bytes: fs.readFileSync(sourceFile) });
  }

  if (problems.length > 0) {
    throw new Error(
      `$id verification failed for ${problems.length} schema(s):\n${problems.join('\n')}` +
        `\n\nNo files were written. Fix the $ids in the schemas package or ` +
        `pass a matching --base-url for local verification.`,
    );
  }

  return staged;
}

/**
 * Copy staged schema bytes into the output root, preserving package-relative
 * paths. Refuses unsafe destinations and output roots nested in the source.
 * The source-nesting check is lexical and therefore applies even when the
 * output root does not exist yet.
 */
function writeStaged(outputRoot, lexicalSourceRoot, realSourceRoot, staged) {
  if (
    outputRoot === lexicalSourceRoot || isInside(lexicalSourceRoot, outputRoot) ||
    outputRoot === realSourceRoot || isInside(realSourceRoot, outputRoot)
  ) {
    throw new Error(
      `unsafe output: output root is inside (or identical to) the source root: ${outputRoot}`,
    );
  }

  if (fs.existsSync(outputRoot)) {
    const realOutput = fs.realpathSync(outputRoot);
    if (realOutput === realSourceRoot || isInside(realSourceRoot, realOutput)) {
      throw new Error(
        `unsafe output: output root is inside (or identical to) the source root: ${outputRoot}`,
      );
    }
    if (!fs.statSync(outputRoot).isDirectory()) {
      throw new Error(`unsafe output: not a directory: ${outputRoot}`);
    }
  }

  const copied = [];
  for (const { relPath, bytes } of staged) {
    const dest = path.join(outputRoot, ...relPath.split(/[\\/]+/));
    if (!isInside(outputRoot, dest)) {
      throw new Error(`unsafe output path (escapes output root): ${dest}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, bytes);
    copied.push(relPath);
  }
  return copied;
}

/**
 * Validate + copy all exported schemas. Options:
 *   source  (required) absolute package source root
 *   output  (required) absolute output directory
 *   baseUrl (optional) base URL for expected $ids (default DEFAULT_BASE_URL)
 *
 * Returns { output, baseUrl, copied: [...] }.
 * Throws before writing any file if any validation fails.
 */
export function publishSchemas({ source, output, baseUrl = DEFAULT_BASE_URL }) {
  if (typeof source !== 'string' || source.length === 0) {
    throw new Error('publishSchemas: missing "source"');
  }
  if (typeof output !== 'string' || output.length === 0) {
    throw new Error('publishSchemas: missing "output"');
  }

  const base = normalizeBaseUrl(baseUrl);
  const sourceRoot = path.resolve(source);
  const outputRoot = path.resolve(output);

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`unsafe/missing source: no such directory: ${sourceRoot}`);
  }
  if (!fs.statSync(sourceRoot).isDirectory()) {
    throw new Error(`unsafe source: not a directory: ${sourceRoot}`);
  }
  const realSourceRoot = fs.realpathSync(sourceRoot);

  const pkgPath = path.join(sourceRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`unsafe source: missing package.json in ${sourceRoot}`);
  }
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    throw new Error(`unsafe source: invalid package.json in ${sourceRoot}: ${err.message}`, { cause: err });
  }
  if (pkg.name !== PACKAGE_NAME) {
    throw new Error(
      `unsafe source: not the ${PACKAGE_NAME} package (found ${JSON.stringify(pkg.name)}): ${sourceRoot}`,
    );
  }

  const files = listSchemaFiles(sourceRoot, pkg);
  if (files.size === 0) {
    throw new Error(`unsafe source: no exported schema files found in ${sourceRoot}`);
  }

  const staged = verifyAndStage(sourceRoot, files, base);
  const copied = writeStaged(outputRoot, sourceRoot, realSourceRoot, staged);

  return { output: outputRoot, baseUrl: base, copied };
}

/**
 * CLI entry point. Returns a result object (or {help:true}) instead of
 * throwing-friendly values; callers may pass a custom argv for testing.
 */
export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    return { help: true };
  }

  let source = opts.source;
  if (source === undefined) {
    try {
      source = resolveInstalledSource();
    } catch (err) {
      throw new Error(
        `could not resolve the installed ${PACKAGE_NAME} package (${err.message}). ` +
          `It is not installed in this project (it is expected as a dependency of the ` +
          `schemas-consuming site once migration lands); for local verification pass ` +
          `--source /path/to/canonical/schemas`,
      );
    }
  }

  const output = opts.output ?? DEFAULT_OUTPUT;
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;

  const result = publishSchemas({ source, output, baseUrl });

  const lines = [
    `Published ${result.copied.length} schema file(s) to ${result.output}`,
    ...result.copied.map((p) => `  ${path.join('schemas', p)}`),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
  return result;
}

// Run as a CLI only when executed directly (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`publish-schemas: ${err.message}\n`);
    process.exitCode = 1;
  }
}
