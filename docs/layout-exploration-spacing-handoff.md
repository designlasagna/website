# Layout exploration spacing adjustments

## Goal

Make the newer layout explorations—especially layouts 19–27—feel less compact and more comfortable to read on desktop, without making prose lines excessively wide.

## Scope

Start with the shared stylesheet:

- `layout-explorations/layout-system.css`

Review layouts 19–27 after changing it. Avoid changing the production site in `src/` as part of this task.

## Proposed changes

### 1. Increase supporting text size

The display headings are intentionally large, but the supporting copy currently feels too small beside them.

- Increase ordinary body/content copy from the browser default of `1rem` to approximately `1.0625rem`–`1.125rem`.
- Preserve a comfortable line height of approximately `1.65`–`1.75`.
- Review smaller text in cards, facts, field descriptions, callouts, and captions. Keep metadata and labels compact, but ensure explanatory text does not feel miniature.

### 2. Add more vertical rhythm

Increase the spacing between meaningful sections by roughly 25–40%.

Areas to review include:

- page header/deck/metadata to main content
- consecutive article sections and headings
- figures and their surrounding prose
- step blocks in guided layouts
- content groups and rows in indexes
- summary statistics, tables, and methodology blocks
- end matter and article navigation

Do not add equal spacing everywhere. Section boundaries should receive more space than elements that belong together, such as a heading and its first paragraph.

### 3. Increase panel and card padding

Many shared surfaces currently use around `1rem` of padding. Increase substantial cards and panels to approximately `1.4rem`–`1.75rem`, depending on their role and available width.

Review these shared components in particular:

- `.panel`
- `.card`
- `.step`
- `.field`
- `.callout`
- `.toc`
- `.facts`
- `.stat`
- `.path`
- `.home-demo`

Small utility elements such as badges, topic chips, and buttons should remain compact.

### 4. Open up multi-column layouts

Slightly increase gaps where the main reading column sits beside navigation, facts, figures, or supporting material.

Review:

- `.editorial`
- `.guide`
- `.workbench`
- `.tool-hero`
- `.chapter`
- `.home-hero`
- `.activity`

Do not solve the compactness by making the prose column much wider. Preserve a readable measure of roughly `60–65ch` for normal prose.

### 5. Test with realistic content density

The current examples are short, which makes pages look top-heavy and can hide rhythm problems. Test at least:

- one long article with several headings, figures, a table, and a pull quote
- one guide with 5–10 steps, long code lines, and an error message
- one reference page with enough fields to require meaningful scrolling
- one library/index page with multiple content groups

Adding realistic fixture content is acceptable within the exploration files, but avoid padding pages with meaningless decorative sections.

## Responsive requirements

- Preserve the existing single-column mobile reading order.
- Ensure increased padding does not make mobile cards cramped internally or leave too little room for content.
- Use smaller responsive padding below the existing `760px` breakpoint where needed.
- Check that code and genuine comparison tables still scroll rather than forcing the viewport wider.
- Confirm headings, metadata, and navigation do not collide at intermediate widths.

## Acceptance criteria

- Layouts 19–27 feel noticeably less dense on desktop.
- Supporting copy is comfortably legible relative to the oversized headings.
- Major sections have clearer separation while related elements still feel grouped.
- Cards and panels have more breathing room.
- Normal prose remains near `60–65ch`; it is not widened merely to fill the canvas.
- Mobile layouts remain coherent and do not feel over-padded.
- No files under `src/` are changed.
