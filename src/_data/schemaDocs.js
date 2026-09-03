// Editorial guidance layered over the canonical JSON Schema. Keep schema facts in
// @designlasagna/schemas; put reader-facing intent and workflow guidance here.
const field = (summary, useWhen, provenance, related = []) => ({
  summary,
  useWhen,
  provenance,
  related,
});

const docs = {
  v03Tokens: {
    manifest: {
      $schema: field('Identifies the JSON Schema used to validate this file.', 'Include when consumers need to discover the contract from the manifest itself.', 'Authored metadata.', ['schemaVersion']),
      schemaVersion: field('States the Design Lasagna manifest format version.', 'Always set this so readers and tools select the correct compatibility rules.', 'Authored metadata.', ['$schema']),
      generatedAt: field('Records when this resolved manifest was produced.', 'Use for traceability and freshness checks in generated output.', 'Generated metadata.', ['source']),
      extends: field('Lists manifests that should be loaded with this manifest.', 'Use when a system is composed from shared or inherited manifests.', 'Authored or generated metadata.', ['tokens']),
      designSystem: field('Describes the design system that owns this manifest.', 'Use to attach a name, version, and documentation locations to a published manifest.', 'Authored metadata.', ['source']),
      source: field('Identifies the source inputs or build context used to create the manifest.', 'Use when consumers need to trace resolved data back to its authoring source.', 'Generated metadata.', ['generatedAt']),
      counts: field('Provides aggregate counts for the manifest.', 'Use for reporting or quick integrity checks without traversing every token.', 'Generated metadata.', ['tokens']),
      conditions: field('Declares named conditions that can affect resolved values.', 'Use when token values vary by environment, theme, or other named condition.', 'Authored metadata.', ['tokens']),
      collections: field('Groups tokens into named collections.', 'Use when consumers need stable, higher-level sets of tokens.', 'Authored metadata.', ['tokens']),
      tokenRelations: field('Declares relationships between tokens.', 'Use to express semantic or operational links that are not evident from a token value alone.', 'Authored metadata.', ['tokens']),
      tokens: field('Contains the resolved tokens in this manifest.', 'Always include the token records a consumer should read.', 'Generated output.', ['schemaVersion']),
    },
    Token: {
      id: field('The stable, unique identifier for this token.', 'Always provide it; consumers should use it as the durable token identity.', 'Generated from the source token identity.', ['path', 'resolved']),
      path: field('The hierarchical token path as an array of name segments.', 'Use when tools need to group, navigate, or reconstruct a dot-separated token name.', 'Generated from authored naming.', ['id', 'originalPath']),
      originalPath: field('Preserves the token path before any normalization or transformation.', 'Use when a build changes naming but consumers need the source path.', 'Generated metadata.', ['path']),
      label: field('A human-friendly display name for the token.', 'Use in interfaces, documentation, and pickers where the identifier is too technical.', 'Authored metadata.', ['id', 'description']),
      category: field('The primary semantic category for the token.', 'Use to group tokens for navigation and filtering.', 'Authored metadata.', ['subCategory', 'type']),
      subCategory: field('A more specific category within the primary category.', 'Use when category alone does not give enough grouping detail.', 'Authored metadata.', ['category']),
      collection: field('Names the collection this token belongs to.', 'Use when tokens are published as named sets or packages.', 'Authored metadata.', ['collections']),
      tier: field('Expresses the token’s abstraction level or intended layer.', 'Use to distinguish foundational values from semantic or component-level tokens.', 'Authored metadata.', ['type', 'usage']),
      type: field('Identifies the token value type.', 'Use to select appropriate editors, renderers, and validation behaviour.', 'Authored DTCG-compatible metadata.', ['resolved', 'format']),
      description: field('Explains the token’s meaning and intended role.', 'Use to give people the context that a name and value cannot convey.', 'Authored metadata.', ['usage']),
      cssVariable: field('Deprecated in v0.3. A legacy CSS custom-property name for this token.', 'Do not add this to new manifests; use `platforms.web.reference` for CSS mappings instead.', 'Legacy generated or authored mapping.', ['platforms']),
      platforms: field('Maps the token to platform-specific references and guidance.', 'Use when a token has implementation names or usage that vary by platform.', 'Generated or authored mapping.', ['cssVariable']),
      resolved: field('Contains the final value for each applicable mode.', 'Always provide it in a resolved manifest; consumers read this instead of evaluating source aliases.', 'Generated output.', ['modes', 'format']),
      modes: field('Lists the modes for which this token has values.', 'Use when consumers need to know which themes, densities, or other variants are available.', 'Generated output.', ['resolved']),
      format: field('Adds information needed to interpret a typed value.', 'Use for values whose colour space or unit must be explicit.', 'Authored or generated metadata.', ['type', 'resolved']),
      usage: field('Documents allowed contexts and discouraged uses.', 'Use to guide designers and implementers toward appropriate application.', 'Authored metadata.', ['description']),
      a11y: field('Provides accessibility requirements or checks associated with the token.', 'Use when contrast, target size, or motion guidance affects implementation.', 'Authored metadata.', ['usage']),
      priority: field('Indicates the relative importance of the token.', 'Use to order migrations, review, or UI presentation.', 'Authored metadata.', ['deprecated']),
      since: field('Records the version in which the token became available.', 'Use to make compatibility and migration decisions.', 'Authored metadata.', ['deprecated']),
      keywords: field('Supplies search terms for the token.', 'Use to improve discovery in documentation and token pickers.', 'Authored metadata.', ['label', 'description']),
      docs: field('Links the token to its supporting documentation.', 'Use when readers need to continue to design-system guidance outside the manifest.', 'Authored metadata.', ['description']),
      deprecated: field('Marks a token as deprecated and explains its replacement plan.', 'Use when retaining a token temporarily while guiding consumers to a successor.', 'Authored metadata.', ['since']),
      tags: field('Adds free-form labels for filtering and organisation.', 'Use for lightweight grouping that does not merit a first-class category.', 'Authored metadata.', ['keywords']),
      sourceFiles: field('Lists source files that contributed to this token.', 'Use for debugging and tracing generated output back to source control.', 'Generated metadata.', ['source']),
      metadata: field('Stores additional implementation-specific metadata.', 'Use only for information not represented by a defined field.', 'Authored or generated extension metadata.', ['description']),
    },
    DesignSystemMeta: {
      name: field('The design system’s display name.', 'Use to identify the owner of a manifest to people and tooling.', 'Authored metadata.', ['version']),
      version: field('The design system release version.', 'Use to correlate the manifest with a design-system release.', 'Authored metadata.', ['name']),
      documentation: field('Links to the design system’s general documentation.', 'Use to give consumers an entry point beyond individual token guidance.', 'Authored metadata.', ['docsTemplates']),
      package: field('Identifies the package that distributes the design system.', 'Use when consumers install or resolve the system through a package registry.', 'Authored metadata.', ['version']),
      docsTemplates: field('Provides documentation templates or locations.', 'Use when generated token documentation should link into a standard structure.', 'Authored metadata.', ['documentation']),
    },
    Counts: {
      total: field('The total number of tokens in the manifest.', 'Use for quick reporting and regression checks.', 'Generated metadata.', ['by']),
      by: field('Breaks token counts down by a named grouping.', 'Use to understand the composition of a token set without reading every record.', 'Generated metadata.', ['total']),
    },
    TokenRelation: {
      type: field('Classifies the relationship between tokens.', 'Use to let consumers interpret the relation consistently.', 'Authored metadata.', ['tokens']),
      tokens: field('Lists the token identifiers participating in the relationship.', 'Use to connect the relationship to actual token records.', 'Authored metadata.', ['type']),
      description: field('Explains why the tokens are related.', 'Use when the relation type alone is not sufficiently specific.', 'Authored metadata.', ['type']),
    },
    PlatformMapping: {
      reference: field('Gives the platform-specific token reference or name.', 'Use when an implementation platform uses a different identifier.', 'Generated or authored mapping.', ['usage']),
      usage: field('Explains how the platform mapping should be applied.', 'Use when a reference needs platform-specific implementation guidance.', 'Authored metadata.', ['reference']),
    },
    Format: {
      colorSpace: field('Names the colour space used by a colour value.', 'Use whenever a colour value could be interpreted in more than one colour space.', 'Authored or generated metadata.', ['unit']),
      unit: field('Names the unit used by a dimensional value.', 'Use whenever a numeric value needs a unit to be interpreted correctly.', 'Authored or generated metadata.', ['colorSpace']),
    },
    Usage: {
      allowedProperties: field('Lists properties for which this token is appropriate.', 'Use to constrain implementation to intended CSS or platform properties.', 'Authored metadata.', ['context']),
      context: field('Describes the contexts in which the token is intended to appear.', 'Use to clarify semantic application beyond its raw value.', 'Authored metadata.', ['doNot']),
      doNot: field('Lists discouraged or invalid uses of the token.', 'Use to prevent common semantic or accessibility mistakes.', 'Authored metadata.', ['context']),
    },
    A11y: {
      wcagContrast: field('States contrast information or requirements.', 'Use when a colour token must meet a contrast target against another token.', 'Authored metadata.', ['minTargetSize']),
      minTargetSize: field('States the minimum target size for interactive use.', 'Use for tokens that influence controls or touch targets.', 'Authored metadata.', ['motionSafe']),
      motionSafe: field('Indicates whether the token is safe for motion-sensitive contexts.', 'Use when animation or motion preferences affect application.', 'Authored metadata.', ['wcagContrast']),
    },
    ContrastInfo: {
      ratio: field('The contrast ratio achieved or required.', 'Use to communicate a measurable WCAG contrast result.', 'Authored metadata.', ['against', 'level']),
      against: field('Identifies the colour or token used as the contrast background.', 'Use so the stated ratio has a clear comparison target.', 'Authored metadata.', ['ratio']),
      level: field('Identifies the WCAG conformance level associated with the contrast guidance.', 'Use when a particular accessibility threshold is required.', 'Authored metadata.', ['ratio']),
    },
    Docs: {
      url: field('Links to general web documentation for the token.', 'Use when the canonical guidance lives on a documentation site.', 'Authored metadata.', ['figma', 'storybook']),
      figma: field('Links to the corresponding Figma resource.', 'Use when designers need to locate the token in Figma.', 'Authored metadata.', ['url']),
      storybook: field('Links to the corresponding Storybook resource.', 'Use when implementers need to inspect the token in component examples.', 'Authored metadata.', ['url']),
    },
    Deprecated: {
      message: field('Explains why the token is deprecated and what consumers should do.', 'Use whenever a token remains available only for compatibility.', 'Authored metadata.', ['replacement', 'removal']),
      removal: field('States the planned version or date for removal.', 'Use to let consumers schedule migration work.', 'Authored metadata.', ['replacement']),
      replacement: field('Identifies the preferred successor token.', 'Use to provide a direct migration path.', 'Authored metadata.', ['message']),
    },
    ConditionsEntry: {
      description: field('Explains the condition dimension in reader-facing terms.', 'Use to clarify what changes when this condition is selected.', 'Authored metadata.', ['type', 'values']),
      type: field('Classifies the condition dimension, such as colour scheme or density.', 'Use to help tools interpret the condition consistently.', 'Authored metadata.', ['values']),
      values: field('Lists the allowed values for the named condition.', 'Always include the selectable values for a declared condition.', 'Authored metadata.', ['default']),
      default: field('Names the value used when no condition is selected.', 'Use when one value is the safe or expected fallback.', 'Authored metadata.', ['values']),
    },
    CollectionsEntry: {
      name: field('Provides a human-friendly name for the collection.', 'Use when the collection key is not suitable for display.', 'Authored metadata.', ['description']),
      description: field('Explains the purpose and contents of the collection.', 'Use to help consumers choose the correct collection.', 'Authored metadata.', ['name']),
      conditions: field('Limits the collection to named condition dimensions.', 'Use when the collection only applies in particular variants.', 'Authored metadata.', ['defaults']),
      defaults: field('Supplies default metadata inherited by collection members.', 'Use to avoid repeating shared tier, priority, usage, format, or accessibility metadata.', 'Authored metadata.', ['conditions']),
    },
    _definitions: {
      A11y: { summary: 'Accessibility guidance associated with a token. Use it to record contrast requirements, minimum target sizes, and motion safety so consumers can implement the token responsibly.' },
      Collections: { summary: 'A map of named collections. Each collection can describe its purpose, applicable conditions, and defaults inherited by its tokens.', example: { core: { name: 'Core tokens', conditions: ['colorScheme'], defaults: { tier: 'primitive', priority: 80 } } } },
      CompositeValue: { summary: 'An intentionally open object for structured token values such as typography, borders, or shadows. Its keys depend on the token type; consumers must interpret it together with `type`.', example: { fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 } },
      Conditions: { summary: 'A map of named condition dimensions. Each key, such as `colorScheme`, describes the values a resolved token may vary by.', example: { colorScheme: { type: 'colorScheme', values: ['light', 'dark'], default: 'light' } } },
      ContrastInfo: { summary: 'A contrast requirement or result. It records the ratio, its comparison colour or token, and the relevant WCAG conformance level.' },
      Counts: { summary: 'A generated summary of the manifest’s token inventory. It lets reporting and validation tools inspect totals without iterating through every token.' },
      Deprecated: { summary: 'Migration information for a token that should no longer be used in new work. It explains the reason, removal plan, and preferred replacement.' },
      DesignSystemMeta: { summary: 'Identity and discovery metadata for the design system that published the manifest, including its release and documentation locations.' },
      Docs: { summary: 'Links from a token to the places where people can understand and use it: web documentation, Figma, and Storybook.' },
      Format: { summary: 'Type-specific information needed to interpret a resolved value correctly, such as a colour space or dimensional unit.' },
      PlatformMapping: { summary: 'A platform-specific implementation reference for a token, plus optional guidance for applying it on that platform.' },
      TokenRelation: { summary: 'An explicit relationship between two or more tokens. It records the relation type as well as the participating token identifiers.' },
      Usage: { summary: 'Human guidance that defines where a token belongs, which properties it may serve, and where it should not be used.' },
    },
    // Compact, valid-shaped examples shown in expandable field rows.
    _examples: {
      manifest: { schemaVersion: '0.3.0', tokens: [{ id: 'color.blue.500', resolved: { light: '#0b5fff' } }] },
      Token: { id: 'color.blue.500', path: ['color', 'blue', '500'], resolved: { light: '#0b5fff' } },
      DesignSystemMeta: { name: 'Acme Design System', version: '2.4.0', documentation: 'https://example.com/design-system' },
      Counts: { total: 248, by: { color: 96, dimension: 42 } },
      TokenRelation: { type: 'paired', tokens: ['color.text.default', 'color.background.default'] },
      PlatformMapping: { reference: 'Color.Blue500', usage: 'Use for primary actions.' },
      Format: { colorSpace: 'srgb', unit: 'px' },
      Usage: { allowedProperties: ['color'], context: 'Body copy', doNot: ['Use for disabled text'] },
      A11y: { wcagContrast: { ratio: 4.5, against: 'color.background.default', level: 'AA' }, minTargetSize: '44px' },
      ContrastInfo: { ratio: 4.5, against: 'color.background.default', level: 'AA' },
      Docs: { url: 'https://example.com/tokens/blue-500', figma: 'https://figma.com/file/…' },
      Deprecated: { message: 'Use color.text.default instead.', removal: '4.0.0', replacement: 'color.text.default' },
    },
  },
};

const sampleValues = {
  '$schema': 'https://designlasagna.recipes/schemas/v0.3/tokens.json', schemaVersion: '0.3.0', generatedAt: '2026-09-04T00:00:00Z', extends: ['core.tokens.json'],
  designSystem: { name: 'Acme Design System', version: '2.4.0' }, source: { repository: 'https://github.com/acme/tokens' }, counts: { total: 248, by: { color: 96 } },
  conditions: { dark: { theme: 'dark' } }, collections: { core: { label: 'Core tokens' } }, tokenRelations: [{ type: 'paired', tokens: ['color.text.default', 'color.background.default'] }], tokens: [{ id: 'color.blue.500', resolved: { light: '#0b5fff' } }],
  id: 'color.blue.500', path: ['color', 'blue', '500'], originalPath: ['color', 'blue', '500'], label: 'Blue 500', category: 'color', subCategory: 'blue', collection: 'core', tier: 'primitive', type: 'color', description: 'The primary blue used for interactive elements.', cssVariable: '--color-blue-500',
  platforms: { ios: { reference: 'Color.Blue500' } }, resolved: { light: '#0b5fff', dark: '#5b93ff' }, modes: ['light', 'dark'], format: { colorSpace: 'srgb' }, usage: { allowedProperties: ['color'], doNot: ['Use for disabled text'] }, a11y: { wcagContrast: { ratio: 4.5, against: 'color.background.default', level: 'AA' } }, priority: 'high', since: '2.4.0', keywords: ['blue', 'brand', 'action'], docs: { url: 'https://example.com/tokens/blue-500' }, deprecated: { message: 'Use color.action.primary instead.', replacement: 'color.action.primary' }, tags: ['brand', 'interactive'], sourceFiles: ['tokens/color/blue.json'], metadata: { figmaStyleId: 'S:1234' },
  name: 'Acme Design System', version: '2.4.0', documentation: 'https://example.com/design-system', package: '@acme/design-tokens', docsTemplates: { token: '/tokens/{id}' }, total: 248, by: { color: 96, dimension: 42 },
  reference: 'Color.Blue500', colorSpace: 'srgb', unit: 'px', allowedProperties: ['color'], context: 'Body copy', doNot: ['Use for disabled text'], wcagContrast: { ratio: 4.5, against: 'color.background.default', level: 'AA' }, minTargetSize: '44px', motionSafe: true, ratio: 4.5, against: 'color.background.default', level: 'AA', url: 'https://example.com/tokens/blue-500', figma: 'https://figma.com/file/example', storybook: 'https://example.com/storybook', message: 'Use color.text.default instead.', removal: '4.0.0', replacement: 'color.text.default',
};

// A field help example should demonstrate the field itself—not repeat the
// enclosing definition’s complete example for every row.
for (const [scope, fields] of Object.entries(docs.v03Tokens)) {
  if (scope.startsWith('_')) continue;
  docs.v03Tokens._examples[scope] = Object.fromEntries(
    Object.keys(fields).map((name) => [name, { [name]: sampleValues[name] ?? `example-${name}` }]),
  );
}

// Names such as `type` and `conditions` have different valid shapes in
// different definitions, so override their generic samples with local ones.
Object.assign(docs.v03Tokens._examples.ConditionsEntry, {
  type: { type: 'colorScheme' },
  values: { values: ['light', 'dark'] },
  default: { default: 'light' },
});
Object.assign(docs.v03Tokens._examples.CollectionsEntry, {
  conditions: { conditions: ['colorScheme'] },
  defaults: { defaults: { tier: 'primitive', priority: 80, usage: { allowedProperties: ['color'] } } },
});

module.exports = docs;
