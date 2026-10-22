---
layout: writing.njk
permalink: /writing/one-value-at-a-time/
title: One value at a time
date: 2026-10-23
draft: true
description: How a component manifest retires a single attribute value — not the whole attribute — and how the record reaches the editor, the quick fix and CI.
tags: [writing, schemas, components, lifecycle, language-server]
related:
  - label: Component manifest extensions (v0.4)
    href: /docs/schemas/v0.4/components/
  - label: Lifecycle reference
    href: /docs/schemas/v0.4/lifecycle/
  - label: Language server setup
    href: /docs/language-server/setup/
  - label: Deprecation is data
    href: /writing/deprecation-is-data/
---

Most deprecations in a component library are small. Nobody is removing the button. What goes is one of its values: a `tertiary` variant that turned out to be a `secondary` with a different border, a `medium` size that sits too close to `large`. The attribute stays; one value on it is retired.

That case is easy to get wrong. Mark the whole `variant` attribute as deprecated and every button in the product lights up, including the thousands that are fine. Say nothing and the old value lingers until someone deletes it and breaks a page. This post walks through how the v0.4 component (CEM) extensions model the in-between case, and what each part of the record is for.

## Two axes, not one

A Custom Elements Manifest attribute already has a standard `deprecated` field. The v0.4 extensions keep it and add two independent ways to retire things on the same attribute:

| | The attribute | One of its values |
| --- | --- | --- |
| Fields | `deprecated`, `status`, `removal`, `replacement` | `deprecatedValues[]` |
| What retires | Every use of the attribute | Uses of that value only |
| Human message | The standard `deprecated` string | `message`, required per value |
| `replacement` points at | Another attribute on the same element | Another value in the same `enum` |

The two are independent. An attribute can be perfectly healthy while one of its values is on the way out, and an attribute that is itself deprecated can still list which of its values go first.

## Writing the record

Here is `variant` on an `<acme-button>`, with `tertiary` retired in favour of `secondary`:

```json
{
  "name": "variant",
  "type": { "text": "'primary' | 'secondary' | 'tertiary'" },
  "default": "'primary'",
  "enum": ["primary", "secondary", "tertiary"],
  "deprecatedValues": [
    {
      "value": "tertiary",
      "message": "The `tertiary` variant is removed. Use `secondary` instead.",
      "replacement": "secondary",
      "removal": "2026-07-30"
    }
  ]
}
```

The standard CEM fields (`name`, `type`, `default`) are untouched. Everything Design Lasagna adds sits beside them, and the extension contract stays permissive, so other tools' fields survive too.

### Keep the value in the enum

`tertiary` is still listed in `enum`. That is deliberate: until it is removed, it is still a value the component accepts, and tooling that completes or checks values should keep recognising it. The deprecation record says *how* to treat it, not *whether* it exists.

### Point at a sibling

For an attribute value, `replacement` is another value of the same attribute — here `secondary`, which is also in the `enum`. Keeping the replacement inside the same attribute is what makes a mechanical fix safe: the editor swaps one string for another and nothing else about the element changes.

### Say when, precisely

`removal` takes an ISO date (`2026-07-30`), a semver version (`3.0.0`) or a quarter (`2027-Q1`). All three are useful to a reader, but only an exact ISO date is something a tool can count down to:

- **An ISO date** drives severity. The warning grows as the date approaches, and once it has passed, the hover says so.
- **A version or a quarter** is shown exactly as written. It tells people when, but it never changes how loudly the editor complains.

One caveat at the time of writing: the 0.4.6 contract describes these three formats but accepts any string, so `"removal": "soon"` validates. Pick the format on purpose — if you want the countdown, it has to be a date.

## Both axes on one attribute

Sometimes the whole attribute is going, and one of its values is going sooner. This is the `size` example from the [migration guide](/docs/schemas/migrate-v0.3-to-v0.4/#examples), where `size` gives way to `variant` and `medium` gives way to `large` in the meantime:

```json
{
  "name": "size",
  "deprecated": "Use variant.",
  "status": "deprecated",
  "replacement": "variant",
  "removal": "2027-Q1",
  "deprecatedValues": [
    { "value": "medium", "message": "Use large.", "replacement": "large" }
  ]
}
```

A few rules keep a record like this unambiguous:

1. **`deprecated` stays standard.** On a CEM entry it is a boolean or a string — never an object. The structured parts live in the sibling fields.
2. **Each value record carries its own reason.** `value` and a non-empty `message` are required; `replacement` and `removal` are optional.
3. **Conflicting signals resolve towards caution.** Positive evidence of a deprecation beats a `false`:
   - a `status` of `deprecated` or `removed`, or a deprecation record, wins over `deprecated: false`;
   - the contradiction itself is reported as a `lifecycle-conflict`, so it gets fixed rather than silently ignored.

## In the editor

The [language server](/tools/language-server/) reads component manifests from installed packages (the `customElements` field in `package.json`) or from a local `ds.config.json`:

```json
{
  "sources": {
    "components": ["packages/components/dist/custom-elements.json"]
  }
}
```

With the record above in place, writing the old value looks like this:

{% figure src="/assets/language-server-attribute-deprecation-hover.webp", alt="A VS Code hover on variant=\"tertiary\" for acme-button: the value was scheduled for removal on 2026-07-30, use secondary instead; the values list shows tertiary struck through as deprecated, with a quick fix offered.", caption="**One value, not the attribute.** `tertiary` is struck through in the values list, the message and removal date come straight from the record, and the quick fix offers `secondary`." %}

The diagnostic sits on the value, not the attribute name, and the fix only touches the value:

```html
<!-- Flagged: the value is deprecated -->
<acme-button variant="tertiary">Save</acme-button>

<!-- After the quick fix -->
<acme-button variant="secondary">Save</acme-button>
```

## Opting in

Unlike native manifests, a Custom Elements Manifest has no Design Lasagna `schemaVersion` to bump — it keeps the CEM format's own. So the v0.4 lifecycle fields on CEM entries apply only when the project or resolver config selects lifecycle profile `0.4`; without it, the legacy profile applies and these fields are not read. How to select the profile is covered in the [VS Code lifecycle reference](https://github.com/designlasagna/ds-language-server/blob/vscode-v0.2.0/editors/vscode/README.md#lifecycle-profile).

## Checking it in CI

The editor is one consumer. A build step is another, and it catches the record that is malformed rather than the usage that is outdated. The v0.4 contracts refer to each other by `$id`, so register all six before asking for a definition (`variant` is the record above):

```js
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const contract = (name) =>
  require(`@designlasagna/schemas/v0.4/${name}.json`);

// The contracts refer to each other by $id: register all six.
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const names = [
  "lifecycle", "tokens", "utilities",
  "icons", "cem-extensions", "dtcg-extensions",
];
for (const name of names) ajv.addSchema(contract(name));

const { $id } = contract("cem-extensions");
const validateAttribute =
  ajv.getSchema(`${$id}#/definitions/AttributeExtensions`);

if (!validateAttribute(variant)) {
  console.error(validateAttribute.errors);
  process.exitCode = 1;
}
```

Run against the `variant` record above, this passes. Drop the `message`, leave it empty, or turn `deprecated` into an object, and it fails — which is the point: the record is only useful to the editor if it is well-formed before it ships. To run checks like this on every pull request, follow [Validate manifests in CI](/learn/validate-manifests-in-ci/).

---

Retiring a value is the most common deprecation a component library makes, and the easiest one to make noisy. Recording it on the value, with a reason, a sibling to move to and a date, keeps the warning exactly as wide as the change.
