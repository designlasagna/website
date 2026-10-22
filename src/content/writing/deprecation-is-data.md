---
layout: writing.njk
permalink: /writing/deprecation-is-data/
title: Deprecation is data
date: 2026-10-23
draft: true
description: Why schema format v0.4 turns "this is deprecated" from a sentence into a record — and what an editor can do once it is one.
tags: [writing, schemas, lifecycle, language-server]
# Placeholder hero: the logotype's three layers. Replace before publishing.
hero:
  src: /assets/writing/deprecation-is-data.webp
  alt: ""
related:
  - label: Lifecycle reference
    href: /docs/schemas/v0.4/lifecycle/
  - label: Migrating from v0.3 to v0.4
    href: /docs/schemas/migrate-v0.3-to-v0.4/
  - label: Language server — tasty part
    href: /tools/language-server/
  - label: Schemas changelog
    href: /tools/schemas/changelog/
---

Every design system retires things. A colour gets renamed, a button variant turns out to be one too many, an icon is redrawn under a new name. The retirement itself is rarely the hard part. The hard part is the long tail afterward: everyone who still uses the old name, in code nobody on the system team will ever read.

Schema format v0.4 is a lifecycle release, and this post is about the one idea underneath it: a deprecation should be data that tools can act on, not a sentence that only people can read.

## A sentence is not enough

Most systems start by writing deprecations as prose — a line in the changelog, a note in the docs, a `@deprecated` comment. In v0.3, a token could already carry a deprecation, and the shape was close to that:

```json
{
  "id": "color.old",
  "resolved": { "default": "#0b5fff" },
  "deprecated": {
    "message": "Use color.new."
  }
}
```

A person reading this knows what to do. A tool does not. "Use color.new." names a replacement, but only in English. It says nothing about when the old token goes away, so there is no way to tell a note from last week apart from a deadline next month.

> A deprecation that only a person can read only reaches the people who happen to read it.

## The record

In v0.4 the same deprecation is a record with three fields, defined once in a shared [lifecycle fragment](/docs/schemas/v0.4/lifecycle/) and reused by tokens, utilities, icons, and the component and DTCG extensions:

```json
{
  "id": "color.old",
  "resolved": { "default": "#0b5fff" },
  "status": "deprecated",
  "deprecated": {
    "message": "Use color.new.",
    "replacement": "color.new",
    "removal": "2027-01-01"
  }
}
```

Each field has one job:

1. **`message`** is still for people: the reason, and how to migrate. It is the only required field, and it must not be empty.
2. **`replacement`** is for machines: an identifier of the same kind as the thing being deprecated, so a tool can point at it or swap it in.
3. **`removal`** is the plan: an ISO date, a semver version, or a quarter. Only an ISO date carries a time a tool can count down to.

Next to the record, `status` gives every entity a plain lifecycle word. Only `deprecated` and `removed` have defined meanings; the vocabulary stays open for whatever stages your own process uses.

### Why the message stays required

It would be easy to make `replacement` the important field and treat `message` as decoration. It is the other way around. Not every deprecation has a drop-in replacement — sometimes the answer is "compose two utilities" or "talk to us first" — and the message is the one part that always applies.

## What an editor can do with it

Once the deprecation is data, the [language server](/tools/language-server/) can carry it to the place where the old name is actually typed:

- **Hovers** show the message and the replacement next to the token, class, attribute or value.
- **Diagnostics** flag every use of a deprecated name, and their severity escalates as an ISO removal date gets closer.
- **Quick fixes** replace the deprecated name in one step when the manifest supplies a valid replacement.

{% figure src="/assets/language-server-token-deprecation-hover.webp", alt="A VS Code hover explaining that a deprecated CSS token should be replaced with a new token.", caption="**The record, in the editor.** The message, the replacement and the removal date, shown where the old token is used." %}

None of this needs the editor to know your design system. It only needs the manifest to follow the contract.

## Opting in

Nothing moves to v0.4 by itself. v0.3 documents stay valid against the hosted v0.3 contracts, and migrating is a document-by-document decision: point `$schema` at the v0.4 URL, set `schemaVersion` to `"0.4.0"`, and rewrite each deprecation as a record. The [migration guide](/docs/schemas/migrate-v0.3-to-v0.4/) walks through the native, component and DTCG cases with examples the site's tests validate.

---

Retiring something is a promise to the people who depend on it: here is why, here is what to use instead, and here is when. Writing that promise down as data is what lets a tool keep it for you.
