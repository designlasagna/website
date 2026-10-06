# Language Server launch-day checklist

Scope: public website follow-up for **Design Lasagna: Design System Language Server**. This is a runbook and announcement outline, not approval to publish, deploy, or announce.

## Current verified status

- npm server: `@designlasagna/ds-language-server` v0.2.0 is the current released server artifact documented by the server repository.
- VS Code: extension v0.2.0 is the current Marketplace pre-release, published 2026-10-02. The Marketplace-delivered package passed isolated VS Code 1.90.2 and 1.138.0 tests, including completion, hover, diagnostics, settings reload, and applied Quick Fix. Minimum VS Code is 1.90; no separate npm install is needed.
- Zed: **Registry submission awaiting review.** PR [zed-industries/extensions#7741](https://github.com/zed-industries/extensions/pull/7741) remains open. Do not describe it as registry-available and do not add a registry install CTA.
- Versions are independent: server, VS Code, and Zed versions must be checked and reported separately. A newer npm server does not update an already-published editor bundle.

## Before a website launch

Release prerequisite completed on 2026-10-02: [VS Code publishing workflow](https://github.com/designlasagna/ds-language-server/actions/runs/36995589921) succeeded, and the Marketplace-delivered 0.2.0 preview was verified in isolated editor profiles. Website deployment remains separate.

- [x] Replace the extension’s local schema dependency with the released package, package the latest server, and validate the VSIX.
- [x] Obtain approval to publish the updated VS Code extension, then verify the actual Marketplace download before deploying the website launch updates.

- [ ] Recheck the npm package page, VS Code Marketplace listing, GitHub tags, and the npm/VS Code changelog files from a signed-out browser.
- [x] Confirm `/docs/language-server/`, `/docs/language-server/setup/`, `/tools/language-server/`, and `/tools/language-server/changelog/` agree on names, artifact versions, release status and links.
- [x] Run `npm run check` after a clean dependency install (2026-10-02: 58 tests and build pass).
- [ ] Review the generated pages at narrow and wide widths.
- [ ] Smoke-test each editor path being advertised; one client’s result is not evidence for another:
  - [x] Install the updated Marketplace VS Code extension without a custom server override and verify setup, completion, diagnostics, and configuration behavior against the documented workflow.
  - [ ] Start npm server v0.2.0 from every other compatible client being advertised and verify configuration, completion, diagnostics, and reload behavior there.
  - [ ] If the Zed development path is advertised, install it separately and verify npm installation/startup plus one known-manifest completion in Zed.
- [ ] Keep Zed wording at “Registry submission awaiting review” unless upstream has merged and published the registry entry.
- [ ] Obtain human approval before deploy or announcement.

## Website implementation evidence — 2026-10-02

Local Qwen authored content and test proposals; manager reviewed and applied them with copy/test corrections. A fresh local-model review found no blockers. Feature worktree: `feat/website-vscode-020-journey`. Existing drafts were preserved in the original checkout; current schema-hosting pipeline retained.

Build and 58 tests pass, including the three Language Server routes, internal links/anchors and six v0.4 schema outputs. Marketplace, source/tag/issue links and Zed PR returned HTTP 200. Several GitHub blob pages returned HTTP 503 during anonymous checks; authenticated read-only Contents API confirmed the exact files/refs exist. This is not a signed-out browser or visual verification claim. No deployment performed.

## When Zed becomes registry-available

Only after independently verifying the live registry listing:

- [ ] Add the verified registry URL and install CTA to the Zed card in `src/content/tools/language-server/index.html`.
- [ ] Replace the pending status in the tools index, setup docs, and changelog header; preserve optional development setup as a secondary link.
- [ ] Add the released Zed extension version to the changelog as a **Zed extension** artifact, without changing server or VS Code versions.
- [ ] Update this checklist’s status, then rerun link and build checks.

## Announcement draft outline (do not publish)

1. **Headline:** Design Lasagna: Design System Language Server is available for design-system editor workflows.
2. **Problem:** component, token, and utility knowledge is difficult to discover while coding.
3. **What ships:** manifest-backed completions, hovers, schema/lifecycle diagnostics, and migration actions.
4. **Get started:** link to the website setup documentation and the currently verified editor install path(s).
5. **Data model:** explain that it consumes existing CEM, token, and utility manifests rather than introducing one required source format.
6. **Status and versions:** list npm server, VS Code, and—only if published—Zed versions independently.
7. **Feedback:** link to source and issue tracking; invite concrete editor/configuration reports.
