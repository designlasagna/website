# Layout ideas for Design Lasagna

## Overall direction

The existing explorations cover many visual treatments. Rather than turning all eighteen into separate templates, the site would benefit from a small family of layouts tied to **content intent**.

My preferred direction is a **calm reading spine with occasional expressive interruptions**:

- Text stays in a comfortable, consistent column.
- Titles, figures, examples, and data may break out wider when useful.
- Purple, orange, gold, heavy rules, and oversized type provide personality.
- The “lasagna” idea appears through layers, stacked panels, and section bands—not through constant food metaphors.
- Layout differences should help readers understand whether they are reading an essay, following a task, evaluating a tool, or looking up a fact.

The strongest ideas in the current explorations are the essay structure in 06/16, task flow in 07, visual rhythm in 09/11/18, and data treatment in 17. These can become a coherent system instead of many unrelated page designs.

## Shared page anatomy

Most content pages should draw from the same basic anatomy:

1. **Breadcrumb or section label** — establishes whether this is Docs, Learn, Writing, or Tools.
2. **Page header** — title, short standfirst, and optional status/version.
3. **Metadata strip** — author, published/updated date, reading time, version, or difficulty as appropriate.
4. **Optional page navigation** — table of contents or progress/step list.
5. **Main content spine** — readable prose with predictable heading rhythm.
6. **Breakout blocks** — examples, media, diagrams, tables, quotes, or callouts.
7. **End matter** — sources, feedback/edit link, related pages, and previous/next navigation.

On mobile this should always resolve into one meaningful reading order. Sidebars become inline blocks, sticky navigation becomes a compact disclosure near the top, and wide material should only scroll when it is genuinely two-dimensional data.

## 1. Editorial spine

**Best for:** Writing posts, opinion pieces, announcements, and text-led essays.

**Page shape:**

- Compact category label above a large title.
- Standfirst in a wider or more prominent style than body copy.
- Restrained metadata row.
- Narrow reading column with generous spacing.
- A slim desktop rail for the table of contents, footnotes, or article facts.
- One or two wide interruptions rather than constant decoration.
- Strong ending with a conclusion and related reading.

**Blocks needed:**

- Article header
- Standfirst
- Author/date/read-time metadata
- Table of contents
- Prose section
- Pull quote
- Side note or footnote
- Wide figure with caption
- Inline figure
- Source/citation list
- Related articles
- Previous/next article navigation

**View:** This should be the default article template. Exploration 16 is the best general starting point, simplified with the calmness of 06. Magazine effects should be optional blocks rather than a separate template.

## 2. Guided recipe

**Best for:** Learn pages, tutorials, setup instructions, migration guides, and onboarding.

**Page shape:**

- Header states a concrete outcome: what the reader will be able to do.
- A preparation panel lists prerequisites, time, difficulty, and expected output.
- Numbered steps form the main visual rhythm.
- Each step can contain explanation, code, a result preview, and troubleshooting.
- Desktop step navigation may remain visible; mobile gets a compact “In this guide” disclosure.
- Completion state ends with verification and next actions.

**Blocks needed:**

- Outcome-focused page header
- Prerequisites/checklist panel
- Time and difficulty facts
- Numbered step section
- Code block with filename/language label
- Copyable command block when scripting is eventually acceptable
- Expected-result preview
- Tip, warning, and common-error callouts
- Before/after comparison
- Verification checklist
- Previous/next step or guide links

**View:** Exploration 07 already has the correct content model. The next mockup should test real technical content, long code lines, five-to-ten steps, and error messages rather than placeholder prose.

## 3. Layered explainer

**Best for:** Concept articles, architecture explanations, case studies, and stories where visuals clarify a process.

**Page shape:**

- Strong opening statement paired with one useful diagram or image.
- Alternating chapters: prose first, then a visual, then interpretation.
- Occasional two-up comparisons on large screens.
- Captions carry context rather than merely naming the image.
- A final “How the layers connect” summary brings the argument together.

**Blocks needed:**

- Split or stacked hero
- Process diagram
- Annotated screenshot
- Full-width figure
- Figure pair/diptych
- Before/after comparison
- Caption and image credit
- Key-point callout
- Sequence/timeline
- Summary layer stack

**View:** Combine the usefulness of 09 and 11 with the restraint of 18. Avoid maintaining separate templates for mosaics, diptychs, photo strips, and full-bleed stories. Those are figure variants inside one visual-article layout. Full bleed should be rare and earned by the content.

## 4. Evidence desk

**Best for:** Reports, surveys, compatibility pages, benchmarks, inventories, and data-heavy reference articles.

**Page shape:**

- Title and scope followed immediately by a plain-language finding.
- A summary band surfaces three-to-five key facts.
- Charts and tables are paired with interpretation.
- Methodology and caveats remain visible but secondary.
- Sections answer questions rather than presenting a sequence of generic headings.
- Download/source links sit close to the data they describe.

**Blocks needed:**

- Executive summary
- Key-stat cards
- Chart with accessible text summary
- Responsive data table
- Comparison matrix
- Methodology/caveat callout
- Definition list
- Source/download block
- Update history
- “What this means” interpretation panel

**View:** Exploration 17 is the clearest base. Data tables should not automatically become cards: record-style tables can stack, while true comparison matrices should use deliberate horizontal scrolling with a sticky first column and an obvious scroll cue.

## 5. Documentation workbench

**Best for:** API/schema references, configuration reference, command reference, and exhaustive technical documentation.

**Page shape:**

- Compact header with version and stability status.
- Short purpose statement and minimal valid example before exhaustive detail.
- Desktop navigation provides page outline and nearby documentation context.
- Reference entries are scan-friendly and linkable.
- Examples and constraints are visually distinct from descriptive prose.
- Related definitions are connected through short links rather than raw internal reference paths.

**Blocks needed:**

- Version/stability badge
- Install or canonical URL block
- Minimal example
- Reference field row/card
- Expandable field guidance
- Type/enum/default badges
- Definition anchor
- Deprecation notice
- Code example
- Schema/JSON download links
- Version switcher
- Edit/source link

**View:** Keep the current reference direction, but treat it as its own content type rather than forcing it into an editorial article. Mobile should optimize lookup: field name and type first, concise description second, additional guidance on demand.

## 6. Tool profile

**Best for:** Schemas, language server, and future “Tasty parts” pages.

**Page shape:**

- Product-like hero: what the tool is, who it helps, current maturity, and one primary action.
- A concrete usage preview appears early.
- Use cases explain value before architecture details.
- A simple flow diagram shows how the tool fits into a design-system workflow.
- Installation and quick start lead into documentation.
- Compatibility, repository, and release information are easy to locate.

**Blocks needed:**

- Tool hero with status/version
- Primary and secondary actions
- Terminal/code preview
- Benefit/use-case cards
- Workflow diagram
- Feature list
- Installation block
- Compatibility/support table
- Repository/package links
- Release note teaser
- Related docs and guides

**View:** This page should feel more product-oriented than Docs but less promotional than a commercial landing page. It can borrow the bold hierarchy of explorations 02/04 without carrying the menu metaphor through every section.

## 7. Library index

**Best for:** Docs, Learn, Writing, Tools, and topic landing pages.

**Page shape:**

- Section introduction and a featured item.
- Remaining entries grouped by reader need, topic, or recency—not only as one undifferentiated card grid.
- Cards clearly communicate content type and commitment before the click.
- On larger screens, a compact filter/topic rail may accompany the listing.
- On mobile, groups become a simple vertical list with excellent tap targets.

**Blocks needed:**

- Section header
- Featured-content card
- Standard content card
- Compact link row
- Topic/tag links
- Content-type label
- Date, read time, difficulty, or version metadata
- Empty-state message
- Pagination or archive-by-year links
- Newsletter/RSS link if those channels are introduced

**View:** A bento layout is useful only for a small curated home or Tools page. Growing libraries need repeatable cards and clear grouping, not unique tile geometry that changes with every new item.

## 8. Release note / changelog

**Best for:** Package releases, schema versions, migration notes, and project updates.

**Page shape:**

- Version, date, and stability dominate the header.
- A short “why this release matters” summary comes before the change list.
- Changes are grouped into Added, Changed, Fixed, Deprecated, and Removed.
- Breaking changes and migration steps receive dedicated emphasis.
- Machine/package links and previous/next versions are always present.

**Blocks needed:**

- Version header
- Stability badge
- Breaking-change alert
- Categorized change list
- Migration steps
- Before/after code comparison
- Package/schema links
- Contributor/source links
- Previous/next release navigation

**View:** This deserves a compact, highly repeatable template. It should not look like a generic article because readers arrive looking for version-specific facts.

## 9. Front door

**Best for:** Home page.

**Page shape:**

- One bold statement explains the project.
- One concrete demonstration makes the claim credible.
- Three primary paths answer different intent: explore tools, use the docs, or learn the ideas.
- A small “current activity” layer shows the latest release, guide, and article.
- About/project principles remain brief and link deeper.

**Blocks needed:**

- Statement hero
- Live-looking code/schema demonstration
- Three-path navigation cards
- Tool status strip
- Featured guide/article
- Latest release item
- Compact principles block
- GitHub/community action

**View:** Keep the confidence and economy of exploration 01, then add only the most useful parts of 02. The home page should route visitors, not reproduce every section of the site.

## Reusable block set

A future mockup agent should design blocks as a shared system rather than separately inside each page:

### Navigation and identity

- Global header and footer
- Breadcrumbs
- Section navigation
- Table of contents
- Previous/next navigation
- Version switcher

### Editorial

- Page header and standfirst
- Metadata strip
- Prose section
- Pull quote
- Footnote/source list
- Author block
- Related-content list

### Guidance

- Note, tip, warning, and danger callouts
- Prerequisite checklist
- Numbered step
- Verification checklist
- Common-error/troubleshooting block

### Technical

- Inline code
- Code block with label
- Command block
- Tabs only when alternatives truly occupy the same conceptual slot
- Field/reference card
- Type/status/version badges
- Expandable details

### Media and data

- Inline, wide, and full-bleed figures
- Caption and credit
- Figure pair/comparison
- Diagram
- Key-stat card
- Responsive table
- Comparison matrix

### Discovery

- Featured card
- Standard card
- Compact link row
- Tag/topic link
- Release item
- Empty state

## Mobile-first requirements for mockups

Each proposed layout should be mocked at approximately **390px, 768px, and 1280px** using the same content—not as separate compositions.

- Source order must make sense without CSS positioning.
- Body text should not shrink to fit ambitious desktop geometry.
- A title must tolerate long technical words without viewport overflow.
- Side notes and TOCs become inline disclosures or sections on small screens.
- Touch targets should be at least roughly 44px high where practical.
- Code blocks may scroll horizontally; ordinary prose should never do so.
- Record-like tables should transform into labelled rows/cards on mobile.
- Comparison matrices may scroll, but need an obvious affordance and preserved row context.
- Full-bleed media should not create horizontal page overflow.
- Captions, alt text intent, heading order, focus states, and reduced-motion behavior should be represented in the mockups.
- Test sparse and dense cases: no hero image, very long title, missing metadata, long code, many table columns, deprecated content, and nested definitions.

## Suggested mockup priority

To avoid another round of many one-off explorations, produce these four first:

1. **Editorial spine** — establishes the main typography and reading rhythm.
2. **Guided recipe** — proves task content, code, and mobile navigation.
3. **Documentation workbench** — proves dense reference content and responsive tables.
4. **Tool profile plus library index** — proves discovery and product-level hierarchy.

Once those work with real content at all three viewport sizes, the layered explainer and evidence desk can be assembled mostly from the same block system.
