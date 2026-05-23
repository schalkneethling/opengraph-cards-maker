# Astro

The most reliable Astro integration is a build-time Node script:

1. Read post data.
2. Generate PNG files into `public/og/...`.
3. Pass each generated image URL into your Astro layout metadata.

This keeps Open Graph images static and deploy-friendly.

## Install

```bash
pnpm add -D opengraph-cards-maker
pnpm exec playwright install chromium
```

Chromium must also be installed in CI or hosting builds before the generator
runs. Keep that as an explicit setup step in your workflow or build command.

## package.json

Run the generator before Astro builds:

```json
{
  "scripts": {
    "dev": "astro dev",
    "setup:playwright": "playwright install chromium",
    "setup:playwright:ci": "playwright install --with-deps chromium",
    "build": "pnpm run generate:og && astro build",
    "generate:og": "node scripts/generate-og-cards.mjs"
  }
}
```

Avoid hiding browser installation in `prebuild` or in the card generation
script. For hosting providers, install Chromium in CI first, then run this
`build` script.

For Netlify, set `PLAYWRIGHT_BROWSERS_PATH=0` and use a build command like:

```toml
[build]
  command = "pnpm run setup:playwright && pnpm run build"
  publish = "dist"

[build.environment]
  PLAYWRIGHT_BROWSERS_PATH = "0"
```

For GitHub Actions, cache `~/.cache/ms-playwright` and run the CI setup script
before the build. Use the tagged action for readability, or pin it to a commit
SHA in stricter projects:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

- name: Install Playwright Chromium
  run: pnpm run setup:playwright:ci

- name: Build Astro site
  run: pnpm run build
```

Pinned variant:

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@0400d5f644dc74513175e3cd8d07132dd4860809 # v4.2.4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
```

## Generated Output

Treat generated cards as build output. For example:

```gitignore
public/og/
```

Astro will copy `public/og/...` into `dist/og/...` during `astro build`.

## Plain Node Frontmatter Script

A plain Node script cannot always import `astro:content` cleanly because
`astro:content` is an Astro runtime module. The durable path is to read
frontmatter directly or adapt the data in an Astro-aware script.

This package includes a content helper for the common case:

```js
import path from "node:path";
import { createCardsFromContentFiles, generateOpenGraphCards } from "opengraph-cards-maker";

const outputDir = path.resolve("public/og/posts");

const cards = await createCardsFromContentFiles({
  contentDir: "src/content/posts",
  extensions: [".md", ".mdx"],
  eyebrow: "example.com",
  getMeta: ({ frontmatter }) => [{ label: "Published", value: String(frontmatter.pubDate) }],
});

await generateOpenGraphCards({
  outputDir,
  cleanOutputDir: true,
  cards,
});
```

The helper parses YAML frontmatter and records skipped files on `cards.skipped`.

## Layout Metadata

Pass the generated image path into your base layout:

```javascript
---
const { pageTitle, pageDescription, socialImage } = Astro.props;
const fallbackSocialImage = new URL("/social-graph.png", Astro.site);
const socialImageUrl = socialImage
  ? new URL(socialImage, Astro.site)
  : fallbackSocialImage;
---

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={socialImageUrl} />
<meta property="og:image" content={socialImageUrl} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

For posts:

```javascript
---
const { post } = Astro.props;
const socialImage = `/og/posts/${post.id}.png`;
---

<MarkdownPostLayout frontmatter={post.data} socialImage={socialImage}>
  <Content />
</MarkdownPostLayout>
```

## Local Development

Run the generator manually when content or card templates change:

```bash
pnpm run generate:og
pnpm dev
```
