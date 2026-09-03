# Design Lasagna website

The official Design Lasagna landing page, built as an Eleventy static site and deployed through GitHub Pages at https://designlasagna.recipes. See `docs/architecture.md` for the site design.

## Local preview

```bash
npm install
npm run build          # outputs to dist/
npm run dev            # Eleventy dev server with reload
```

## Deployment

GitHub Pages deploys the `redesign` branch root. The `CNAME` file configures the custom domain. DNS is managed in Namecheap; do not modify Fastmail MX/TXT records when updating the website records.
