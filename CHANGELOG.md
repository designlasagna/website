# Changelog

## Unreleased

### Changed

- Split the language server docs into an overview at `/docs/language-server/` and a setup page at `/docs/language-server/setup/`; old section links such as `#install` are forwarded by a small script.
- Gave the schema listings one job per page: the docs home is now a router (Schemas and Language Server cards plus a link to the two-layers overview), and the schemas overview shows the v0.4 contracts as cards, reduces v0.3 to a one-line pointer to its references and the migration guide, and folds the Migrating section into it.
- Linked the docs-home card titles to the Schemas and Language Server overviews, and removed the tool-page link from the docs sidebar.
- Reworked the schemas docs overview into a short use-a-schema block (`$schema` URL, install, import) and per-version contract lists with reference and raw JSON links; the install version now comes from the installed package.
- Corrected v0.3 token-schema guidance and examples, including the distinction between authored mode values and resolved values.
- Clarified platform mappings and their `PlatformMapping` value shape.
- Improved schema-reference table row expansion and alignment.
- Added v0.3 Utilities and Components (CEM extensions) schema reference pages, guidance, and coverage tests.
- Moved GitHub Pages deployment from the legacy Jekyll branch build to the Eleventy GitHub Actions workflow, using current Node 24-compatible actions.
- Hid unfinished sections from the main navigation.
- Reworked the v0.3 to v0.4 migration guide around an at-a-glance summary, a native and CEM/DTCG checklist, and validated before/after examples; it now names the hosted v0.3 contracts as its baseline.
- Moved the per-contract v0.4 changes into the package changelog (rendered on the schemas changelog page) and the lifecycle selection rules into the v0.4 lifecycle reference.
- Replaced the simple tables on the schemas overview, migration guide (lifecycle selection, references) and v0.4 lifecycle reference with flat semantic lists (`.schema-list`) that read the same at every width; the schema field-reference tables are unchanged.
- The schemas changelog page now renders `CHANGELOG.md` from the installed `@designlasagna/schemas` package at build time (with `v0-4-0` style release anchors), falling back to the hand-written entries when the package has none.
