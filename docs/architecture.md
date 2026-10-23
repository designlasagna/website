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
/docs/language-server/          Language Server overview
/docs/language-server/setup/    Language Server setup
/learn/                         Evergreen guides (index)
/learn/<slug>/                  A single guide
/writing/                       Dated editorial index
/writing/<slug>/               A single article
/writing/feed.xml              RSS 2.0 feed of the writing section
/schemas/v0.3/tokens.json       Raw, machine-readable JSON Schema
```

`/schemas/` is exclusively for versioned raw contracts. Human documentation is always under `/docs/`; tool explanation is under `/tools/`, presented to visitors as “Tasty parts”.

## Schema source of truth and release flow

The website consumes the published `@designlasagna/schemas` package. The two infrastructure scripts live in `scripts/` and are standalone (Node built-ins only):

1. `schema-reference.mjs` reads the immutable v0.3 snapshots used by existing reference pages and produces a plain, JSON-serializable reference structure for the reference templates. A definition's fields include those it inherits through `allOf` from local definitions, since draft-07 has no other way to reuse a record's fields.
2. Eleventy renders hand-written guides plus generated schema-reference sections into `dist/`.
3. Immutable v0.2/v0.3/DTCG snapshots in `src/schemas/` are copied to retain already-published bytes. `publish-schemas.mjs --prefix v0.4` then copies every released v0.4 JSON export into `dist/schemas/` and, before writing anything, verifies every v0.4 `$id` equals its deployed `<base-url>/schemas/<path>` URL.
4. CI runs the built-artifact checks: exact v0.4 package bytes, JSON parsing, canonical `$id`s, and AJV compilation including cross-file references.

**DTCG `$id` exception.** The exemption in step 3 is scoped to exactly one vendored file: `dtcg/2025.10/format.json`. That file is copied verbatim from the Design Tokens Community Group and intentionally keeps its upstream `$id` — `https://www.designtokens.org/schemas/2025.10/format.json` — so tooling that resolves identifiers against designtokens.org keeps working. No other path is exempt: any *other* schema under `dtcg/...` must still carry a designlasagna.recipes `$id`. Reusing the upstream identifier for a file we author would make the same `$id` URL serve two different documents, so the exemption is an exact-path allowlist, not a `dtcg/` prefix.

A schema release must be published before the website dependency is bumped. This keeps raw files, `$id` values, and generated reference documentation synchronized from one source.

The build is integrated for the released v0.4 package. Historical files are deliberately not sourced from that package because its changed v0.2/v0.3 `$id`s would rewrite published bytes; see `docs/schema-hosting.md`.

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

## Writing section

`/writing/` is the chronological, editorial half of the site. It holds dated essays, announcements, release commentary, and design-system explorations. It is deliberately separate from `/docs/` (authoritative reference) and from `/learn/` (evergreen, task-oriented guides): a post can explain *why* something was designed a certain way, while docs define the exact contract and guides show how to apply it. Writing may link to docs and tool pages, but it must not become their container.

**Publishing.** An article is a single Markdown file in `src/content/writing/` with front matter:

- `layout: writing.njk` — the shared article layout
- `permalink` — `/writing/<slug>/`, matching the file name (as with every other page in this repository, permalinks are explicit)
- `title`, `date` (UTC, `YYYY-MM-DD`), `description` (the index summary)
- `tags` — must include `writing` (collection membership); extra tags are displayed
- `related` (optional) — list of `{ label, href }` links to tools/docs pages, rendered in the article footer
- `hero` (optional) — `{ src, alt, caption? }` for a lead image. It sits below the title, breaking out of the reading column to the 68rem tool-page canvas, and also tops the post's index card, leads the feed item, and becomes the share preview (a 1200px JPEG for `og:image` and the large Twitter card). `alt` is required. Commit one large source (about 2400px wide); the build resizes it.
- `draft: true` (optional) — the post renders under `npm run dev` (which builds into `.dev/`, never `dist/`) with a Draft chip, and production builds leave it out entirely (no page, index entry, feed item or sitemap entry). Remove the flag and set `date` to publish.

The URL is the file slug (`/writing/<slug>/`). Adding a file publishes it: the index, the feed, and the sitemap pick it up at build time with no other change.

**Empty sections.** `src/_data/sections.js` records whether Writing and Learn have anything published in the current build. A section whose posts or guides are all drafts is left out of production builds entirely — no nav item, index page, feed or sitemap entry — so the site never links to an empty page. Under `npm run dev` drafts count, so both sections show while writing. Publishing the first post or guide brings its section back with no other change.

**Publication and archival.** Posts are published when finished and dated on publication. They are not rewritten afterward — corrections and updates go into a newer post, and the older post stays as it was. Posts are never deleted or renamed, so URLs remain stable; a post that becomes outdated gets an archival note at the top rather than being removed.

**Media and code.** Article Markdown is processed with Nunjucks, so it can use two shortcodes (keyword arguments; captions accept inline Markdown). Assets live in `src/assets/`.

- `{% figure src="/assets/x.webp", alt="…", caption="**Lead.** Text" %}` — `alt` is required (`alt=""` for a decorative image).
- `{% video src="/assets/x.mp4", poster="/assets/x.webp", label="…", caption="…" %}` — self-hosted MP4, WebM or MOV; no third-party embeds. `poster` and `label` are required; the poster sets the size. Optional `captions="/assets/x.vtt"` adds a WebVTT track, and `loop=true` makes a silent looping clip for short UI demos. Videos never autoplay and load nothing until played.

**Images are resized at build time.** Figures and heroes go through `@11ty/eleventy-img` (pinned): each source is written to `/assets/img/` at 480, 960, 1440, 1920 and 2400px wide (never upscaled; the original width is kept as the largest) as AVIF with a WebP fallback, and rendered as a `<picture>` with `srcset`, `sizes`, intrinsic `width`/`height`, and lazy loading (heroes load eagerly). The plain `src` is the largest WebP, for feed readers. Output file names are content hashes, so unchanged images are not re-encoded. Video posters are used as committed.

Fenced code is coloured for `json`, `jsonc`, `css`, `html` and `js` (`javascript`, `mjs`); other languages render as plain text. Code keeps its exact lines and scrolls sideways when it does not fit, with a soft edge marking the side that has more. Keep samples to about 60 characters per line so they fit the desktop column. Tables get ruled rows; the first column is styled as the row label, and on phones each row stacks into a block whose values carry their column heading. Because Markdown runs through Nunjucks, wrap code that contains `{{` or `{%` in `{% raw %}…{% endraw %}`.

**Metadata.** Article pages declare `og:type` `article`, `article:published_time`, `article:tag`, a schema.org `BlogPosting` in JSON-LD, and feed autodiscovery.

**Feed.** `src/content/writing/feed.njk` renders RSS 2.0 at `/writing/feed.xml` (newest first, full content in `content:encoded`, with links, image and video sources and posters made absolute), linked from the index with `rel="alternate"`.

## Learn section

`/learn/` holds maintained, task-oriented guides: how to get one job done with the schemas or tools. Unlike writing, a guide is updated when the tools change, so it has no publication date; it says which releases it was last checked against instead. The main navigation is Tasty parts (`/tools/`), Docs, Learn and Writing.

**Publishing.** A guide is a Markdown file in `src/content/learn/` with front matter:

- `layout: guide.njk`, `permalink: /learn/<slug>/` matching the file name, and `tags: [learn]`
- `title`, `description` (the index summary)
- `outcome` — what the reader will have at the end (inline Markdown)
- `prerequisites` — list of what they need first (inline Markdown)
- `updated` (`YYYY-MM-DD`) and `testedWith` — when the guide was last checked, and the releases and runtimes it was checked with
- `related` (optional) and `draft: true` (optional), as for writing

The layout opens with a facts panel (outcome, prerequisites, last checked) and reuses the article reading column, so code, lists, tables and the `{% figure %}` and `{% video %}` shortcodes work the same way. The index lists guides alphabetically. `scripts/learn.test.mjs` enforces the front matter.

**Keeping guides true.** Every command, script and output in a guide is run against the released packages before it is published or re-checked, on the oldest supported runtime as well as the current one, and `updated` and `testedWith` change with it. A guide that no longer works is fixed, not left with a note.

## Constraints

- Generated output must be plain, accessible HTML and work without JavaScript.
- v0.2, v0.3 and DTCG snapshots under `/schemas/` are immutable and keep their published bytes.
- `/schemas/v0.4/...` serves the latest `@designlasagna/schemas` 0.4.x release. A patch may only fix or relax validation, so every document valid under an earlier 0.4.x file stays valid. Anything that would reject a previously valid document needs a new version directory.
- Every schema page must be readable before it is exhaustive: purpose and valid examples precede full JSON Schema detail.
- v0.2 remains documented as legacy/compatibility material; current v0.3 material is the default path.
