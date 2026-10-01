# Design Lasagna website

The official Design Lasagna landing page, built as an Eleventy static site and deployed through GitHub Pages at https://designlasagna.recipes. See `docs/architecture.md` for the site design.

## Local preview

```bash
npm ci
npm run check          # builds dist/, verifies raw schemas, and runs tests
npm run dev            # Eleventy dev server with reload
npm run verify-schema-hosting -- --origin http://127.0.0.1:8080 # read-only local schema check
```

## Deployment

GitHub Pages deploys the `redesign` branch root. The `CNAME` file configures the custom domain. DNS is managed in Namecheap; do not modify Fastmail MX/TXT records when updating the website records. Deployment requires explicit approval; after it completes, run `npm run verify-schema-hosting -- --origin https://designlasagna.recipes`. This is a read-only GET verification, not a publish operation.
