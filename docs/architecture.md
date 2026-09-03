# Website documentation architecture

## Decision

Build the public site as an **Eleventy static site** and deploy its generated `dist/` directory through GitHub Pages Actions.

Eleventy adds a small, server-only build dependency while preserving the current site's important properties: static HTML output, no required client-side JavaScript, simple local preview, and inexpensive hosting. It provides Markdown authoring and shared templates without asking us to build a documentation framework ourselves.

## Why this approach

| Option | Decision |
| --- | --- |
| Continue with hand-authored HTML only | Rejected. It would duplicate navigation, layouts, and schema reference detail across many pages. |
| Custom Node site generator | Rejected. It would make the project maintain a Markdown/content/build framework before it can document schemas. |
| Eleventy | Chosen. It is purpose-built for static content, supports shared templates and data, and emits plain static files. |
| Client-rendered documentation app | Rejected. Documentation and raw schemas must work without JavaScript and remain directly indexable. |

## Source and output layout

```text
assets/                         Shared source assets
src/
  _data/                        Site-wide metadata and navigation
  _includes/                    Shared Eleventy layouts and partials
  assets/                       Styles, fonts, and images copied to output
  content/
    about/                      Mission, principles, and project context
    tools/                      “Tasty parts” overview pages for each tool
    docs/                       Hand-written tool/reference explanations
    learn/                      Evergreen task-oriented guides
    writing/                    Dated editorial content
scripts/
  publish-schemas.mjs             Copy package-exported schemas into dist/schemas + verify $ids
  schema-reference.mjs            Summarize JSON Schemas into plain reference data
  *.test.mjs                      node:test regression coverage for both scripts
dist/                           Generated deployment output; never hand-edit
```

## Routes

```text
/about/                         Mission, principles, and project context
/tools/                         “Tasty parts” overview index
/tools/schemas/                 Schemas tool overview
/tools/language-server/         Language Server tool overview
/docs/                          Documentation index
/docs/schemas/                  Schema documentation index
/docs/schemas/v0.3/tokens/      Human-readable schema documentation
/docs/language-server/          Language Server reference and setup
/learn/                         Evergreen guides
/writing/                       Dated editorial writing
/schemas/v0.3/tokens.json       Raw, machine-readable JSON Schema
```

`/schemas/` is exclusively for versioned raw contracts. Human documentation is always under `/docs/`; tool explanation is under `/tools/`, presented to visitors as “Tasty parts”.

## Schema source of truth and release flow

The website consumes the published `@designlasagna/schemas` package. The two infrastructure scripts live in `scripts/` and are standalone (Node built-ins only):

1. `schema-reference.mjs` reads schema files from the installed package and produces a plain, JSON-serializable reference structure for the reference templates.
2. Eleventy renders hand-written guides plus generated schema-reference sections into `dist/`.
3. `publish-schemas.mjs` copies the package's exported JSON files into `dist/schemas/` and, before writing anything, verifies that every Design Lasagna schema `$id` equals its deployed `<base-url>/schemas/<path>` URL.
4. CI verifies each schema `$id` equals its deployed `/schemas/...` path, every published schema has a documentation page, and all examples validate.

**DTCG `$id` exception.** The exemption in step 3 is scoped to exactly one vendored file: `dtcg/2025.10/format.json`. That file is copied verbatim from the Design Tokens Community Group and intentionally keeps its upstream `$id` — `https://www.designtokens.org/schemas/2025.10/format.json` — so tooling that resolves identifiers against designtokens.org keeps working. No other path is exempt: any *other* schema under `dtcg/...` must still carry a designlasagna.recipes `$id`. Reusing the upstream identifier for a file we author would make the same `$id` URL serve two different documents, so the exemption is an exact-path allowlist, not a `dtcg/` prefix.

A schema release must be published before the website dependency is bumped. This keeps raw files, `$id` values, and generated reference documentation synchronized from one source.

**Build integration is pending.** As of writing, the npm-published `@designlasagna/schemas` package still carries pre-migration `$id`s, so `publish-schemas.mjs` correctly FAILS its `$id` check against the installed package. Both scripts are therefore not yet wired into `npm run build`; they run standalone (or against a canonical migrated package via `--source`) and will be integrated into the build once the migrated package release lands.

## Tooling and commands

The planned package scripts are:

```text
npm run dev                   # Local Eleventy development server
npm run build                 # Generate references, build the static site, copy schemas
npm run check                 # Links, examples, schema-page coverage, and site checks
npm run deploy-preview        # Optional local preview of dist/
```

GitHub Actions will install dependencies, run `npm run check` and `npm run build`, then deploy `dist/` to GitHub Pages. The current branch-root deployment should be replaced only when that workflow is ready.

## Content ownership

- **Schemas repository:** schema definitions, `$id` values, validation fixtures, and package release.
- **Website repository:** page introductions, curated examples, guides, writing, tool copy, layouts, and site styles.
- **Generated reference data:** derived during the website build and never edited by hand.

## Constraints

- Generated output must be plain, accessible HTML and work without JavaScript.
- Released `/schemas/<version>/...` files are immutable. Breaking contracts require a new version directory.
- Every schema page must be readable before it is exhaustive: purpose and valid examples precede full JSON Schema detail.
- v0.2 remains documented as legacy/compatibility material; current v0.3 material is the default path.
