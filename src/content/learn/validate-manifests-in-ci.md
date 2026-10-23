---
layout: guide.njk
permalink: /learn/validate-manifests-in-ci/
title: Validate manifests in CI
description: Check your token, utility and icon manifests against their v0.4 contracts on every pull request, so a broken manifest never reaches the editor or a release.
tags: [learn]
outcome: A script that validates every native manifest against the contract named in its `$schema`, and a GitHub Actions workflow that fails the pull request when one doesn't match.
prerequisites:
  - A repository whose build writes one or more native manifests (tokens, utilities or icons) that declare a v0.4 `$schema`.
  - Node.js 22 or later, and npm.
updated: 2026-10-23
draft: true
testedWith:
  - "@designlasagna/schemas 0.4.6"
  - ajv 8.20
  - ajv-formats 3.0.1
  - Node.js 22.23 and 25.1
related:
  - label: Token manifest reference (v0.4)
    href: /docs/schemas/v0.4/tokens/
  - label: Lifecycle reference
    href: /docs/schemas/v0.4/lifecycle/
  - label: Migrating from v0.3 to v0.4
    href: /docs/schemas/migrate-v0.3-to-v0.4/
  - label: Schemas — tasty part
    href: /tools/schemas/
---

Validation is a check you choose to run: the schemas describe what a v0.4 manifest contains, and this guide runs that check where it is cheapest to fix — before merge. It covers the three native manifests (tokens, utilities and icons), which name their contract in `$schema`.

## 1. Install the validator

Add the contracts and a JSON Schema validator as development dependencies:

```sh
npm install --save-dev ajv ajv-formats @designlasagna/schemas@^0.4
```

`ajv-formats` lets Ajv check the `uri` and `date-time` formats the contracts use; without it, Ajv prints a warning for each one and skips the check. Pinning `^0.4` keeps you on the v0.4 contracts: a 0.4.x release may only fix or relax validation, so a manifest that passes today keeps passing.

## 2. Add the script

Save this as `scripts/validate-manifests.mjs`:

```js
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const require = createRequire(import.meta.url);
const contract = (name) =>
  require(`@designlasagna/schemas/v0.4/${name}.json`);

// The v0.4 contracts refer to each other by $id: register all six.
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const names = [
  "lifecycle", "tokens", "utilities",
  "icons", "cem-extensions", "dtcg-extensions",
];
for (const name of names) ajv.addSchema(contract(name));

let failed = false;
for (const file of process.argv.slice(2)) {
  const manifest = JSON.parse(await readFile(file, "utf8"));
  // A native manifest names its contract in $schema.
  const validate = ajv.getSchema(manifest.$schema);
  if (!validate) {
    console.error(`${file}: unknown $schema ${manifest.$schema}`);
    failed = true;
  } else if (validate(manifest)) {
    console.log(`${file}: valid`);
  } else {
    failed = true;
    console.error(`${file}: invalid`);
    for (const { instancePath, message } of validate.errors) {
      console.error(`  ${instancePath || "/"} ${message}`);
    }
  }
}
process.exitCode = failed ? 1 : 0;
```

What it does:

- **Registers all six v0.4 contracts.** They reference each other by `$id` — a token's deprecation record is defined in the lifecycle contract — so validating against one file alone would fail to resolve.
- **Picks the contract from the manifest itself.** The `$schema` URL of a v0.4 manifest is the contract's `$id`, so the same script handles tokens, utilities and icons.
- **Sets the exit code instead of exiting.** Every file is checked and reported before the run fails.

## 3. Run it locally

Pass the manifests your build writes:

```sh
node scripts/validate-manifests.mjs dist/tokens.json dist/utilities.json
```

A passing run prints one line per file and exits with `0`:

```text
dist/tokens.json: valid
dist/utilities.json: valid
```

### Reading a failure

Here a token's deprecation record has an empty `message`, and `dist/icons.json` still declares the v0.3 contract:

```text
dist/tokens.json: invalid
  /tokens/0/deprecated must be boolean
  /tokens/0/deprecated must be equal to constant
  /tokens/0/deprecated must be null
  /tokens/0/deprecated/message must NOT have fewer than 1 characters
  /tokens/0/deprecated must match exactly one schema in oneOf
dist/utilities.json: valid
dist/icons.json: unknown $schema https://designlasagna.recipes/schemas/v0.3/icons.json
```

Two things to know when reading this:

1. **Look for the longest path.** `deprecated` may be a boolean, `false`, `null` or a record, and Ajv reports every shape it tried. The line that reaches furthest into the manifest — `/tokens/0/deprecated/message` — names the actual problem.
2. **An unknown `$schema` is a failure, not a pass.** This script checks v0.4 manifests only, so a file still on v0.3 is reported rather than quietly skipped. Migrate it (see [Migrating from v0.3 to v0.4](/docs/schemas/migrate-v0.3-to-v0.4/)) or leave it out of the list.

## 4. Run it on every pull request

Add `.github/workflows/validate-manifests.yml`, adjusting the build step and file list to your repository:

```yaml
name: Validate manifests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - run: >-
          node scripts/validate-manifests.mjs
          dist/tokens.json dist/utilities.json
```

The job fails whenever the script sets a non-zero exit code, and the log shows the same lines as a local run.

## What this does not cover

- **Component and DTCG files.** A Custom Elements Manifest and a DTCG token file follow their own formats; Design Lasagna only defines extension fields inside them, so there is no `$schema` to dispatch on. Their extension contracts are in the [component](/docs/schemas/v0.4/components/) and [DTCG extension](/docs/schemas/v0.4/dtcg-extensions/) references.
- **Whether your design system is built the right way.** Passing means a manifest matches its contract. It says nothing about naming, coverage or whether a token should exist.
