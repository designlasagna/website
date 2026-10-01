# Raw schema hosting

`npm run check` builds the site, preserves historical raw contracts, copies the released v0.4 exports, and runs unit plus locally served-output checks.

## Hosted artifacts

The build copies every `@designlasagna/schemas@0.4.0` export below `v0.4/` byte-for-byte to its canonical path:

- `/schemas/v0.4/lifecycle.json`
- `/schemas/v0.4/tokens.json`
- `/schemas/v0.4/utilities.json`
- `/schemas/v0.4/icons.json`
- `/schemas/v0.4/cem-extensions.json`
- `/schemas/v0.4/dtcg-extensions.json`

Each has an exact `https://designlasagna.recipes/schemas/v0.4/...` `$id`. The check parses every served JSON file, checks its bytes against the installed release, validates it with AJV, and compiles all files together so `lifecycle.json` cross-file references resolve.

The dependency declaration intentionally permits `^0.4.0`; `package-lock.json` locks the reviewed installed artifact to `@designlasagna/schemas@0.4.0`. The verifier derives both the release version and the exact `v0.4/` exports from that installed, locked package. Any schema-version dependency update requires intentional review of the changed exports, bytes, identifiers, and this document before the lockfile is updated.

## Historical routes

`src/schemas/` contains byte snapshots from `@designlasagna/schemas@0.3.4` for existing v0.2, v0.3, and DTCG routes. Their SHA-256 digests are asserted in the served-output test, and they are copied unchanged before v0.4 is added. Do not replace these snapshots as a side effect of upgrading the dependency.

Upstream comparison: the v0.4.0 package changes all 3 v0.2 files and all 5 v0.3 files from the 0.3.4 tarball. The observed content change is each file's `$id`, from `https://designlasagna.recipes/v0.x/...` to `https://designlasagna.recipes/schemas/v0.x/...`; resulting SHA-256 bytes differ. This work intentionally retains the 0.3.4 bytes and identifiers for already-published routes. That historical identifier drift remains an upstream compatibility decision, not a website rewrite.

## Live verification and release gate

Run the reusable read-only verifier against a running local server:

```bash
npm run verify-schema-hosting -- --origin http://127.0.0.1:8080
```

For a deployed site, HTTPS is mandatory:

```bash
npm run verify-schema-hosting -- --origin https://designlasagna.recipes
```

The origin is always explicit. The command fetches each exact installed `v0.4/` route, requires HTTP 200 and JSON, compares the response bytes to the locked installed package, checks the canonical public `$id`, then compiles the downloaded set with AJV to resolve cross-file references. It prints a route/failure summary and exits nonzero on any failure. HTTP is accepted only for `localhost`, `127.0.0.1`, or `::1` local testing.

No deployment is performed by this worktree. Deployment itself remains approval-gated. **After explicit deployment approval and deployment completion**, run the HTTPS command above and record its result before calling the release complete. This GET-only verification is not a publish operation and does not itself require deployment authority.

## Known tooling risk

`npm audit` currently reports one pre-existing high-severity `brace-expansion` advisory (quadratic expansion and recursive parsing denial-of-service; transitive to Eleventy). This change does not broadly upgrade site tooling to address it; assess and remediate that dependency separately so a schema-hosting release does not silently expand scope.
