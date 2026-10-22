---
layout: writing.njk
permalink: /writing/the-design-lasagna-approach/
title: The Design Lasagna approach
date: 2026-10-16
draft: true
description: Why Design Lasagna treats a design system as layers — and what the project builds and writes for the people who maintain them.
tags: [writing, approach, design-systems]
related:
  - label: About Design Lasagna
    href: /about/
  - label: Schemas — tasty part
    href: /tools/schemas/
  - label: Schema references
    href: /docs/schemas/
  - label: Language server — tasty part
    href: /tools/language-server/
---

Design Lasagna exists for the people who build and maintain design systems. It builds tools for them, and it writes about the work. This post explains the approach behind both — what the project believes a design system is, what it will and will not promise, and how this site is organized around that view.

## A design system is a lasagna

A design system is not a product with a fixed shape. It is a set of layers: people, processes, governance, documentation, design, tokens, components, and tooling. Which layers matter, how thick they are, and how they fit together depends on the organization — its size, its platforms, its workflows, and how much it is willing to standardize.

The name is deliberate. A lasagna has no single correct recipe. It is made of layers, it is assembled by hand, and it holds together only if the layers are built to fit one another. "Design Lasagna" is a reminder that there is no one-stack answer to a design system, and that the interesting work is in the interfaces between the layers.

## No one recipe is sold

Because systems differ, Design Lasagna does not prescribe a stack. It does not say which tools, platforms, or governance models you must adopt. What it offers is two things instead:

1. **Tasty parts** — self-contained tools that fit many recipes. Today that means [Schemas](/tools/schemas/), stable versioned JSON Schema contracts for design-system artifacts, and the [language server](/tools/language-server/), which brings those artifacts into the editor as completion, details, and diagnostics.
2. **Shared ideas** — the thinking, decisions, and explorations behind the tools, written down here under [Writing](/writing/) and kept separate from the reference [docs](/docs/).

A tool earns a place in the project by being useful across different systems, not by being the best version of one vendor's workflow.

## Owned by everyone, held by no one

A design system is shared across disciplines. It is not something the design team owns alone, and no single tool — Figma, a code repository, a documentation site — defines the whole system. Each tool holds a layer of the truth, and the work of the system is keeping those layers consistent and legible.

That view shapes what Design Lasagna builds. The schemas are written so that machines can check the layers against each other: a token, a component extension, a deprecation record, a platform mapping. The language server is written so that the people editing those layers get immediate, local feedback. Neither assumes the other, and neither assumes anything about your stack.

## Built for people and for agents

The readers of a design system are no longer only humans. Agents read manifests, follow references, and make changes on the scale that people cannot. So the project treats discoverability and legibility as first-class requirements: names that are searchable, contracts that are machine-checkable, documentation that is unambiguous enough to act on. A system that only works when a person holds all of its context in their head will not survive contact with either team growth or agent-driven workflows.

## How this site is organized

The site follows the shape of the work rather than the shape of a repository:

- **Docs** are the authoritative reference — fields, contracts, configuration, installation.
- **Writing** is chronological and dated. It records announcements, decisions, and explorations in the order they happened, and posts are not rewritten after publication.
- **Tools** are the high-level "tasty parts" pages — what each tool does and where to start.
- **Learn** will hold evergreen, task-oriented guides, kept separate from dated posts because they are maintained forward rather than frozen in time.

A piece of writing can explain *why* something was designed a certain way. The docs define the exact contract. The guides show how to apply it. Keeping those three jobs apart is what keeps each one trustworthy.

## Where the project stands

Design Lasagna is, for now, one person's project. There is no team, no roadmap of promised tools, and no product to buy. The schemas and the language server are real and versioned, the contracts are published at stable URLs, and this site is their home. What comes next will be shaped by what the tools prove to be useful for — written down here when it happens.

Different systems. Different recipes. Same layers to keep in order.
