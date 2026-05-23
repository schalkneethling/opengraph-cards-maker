# Open Graph Cards Maker

Generate unique custom Open Graph cards for each page of your website.

This package generates static `1200x630` PNG cards at build time with
[Playwright](https://playwright.dev/). It is framework-agnostic: pass card data
from 11ty, Astro, or any other static site generator, and write the images to
your public output directory.

Start with the framework guide for your site, then use the data model reference
when you need to customize card fields, output paths, or themes.

> No guide for your framework? Either open an issue or contribute a guide.

## Install

```bash
pnpm add opengraph-cards-maker
```

Playwright also needs a browser available in your environment:

```bash
pnpm exec playwright install chromium
```

The package renders HTML/CSS to PNG with Playwright, so Chromium must be
installed explicitly anywhere cards are generated, including CI and hosting
builds. Keep that setup as an explicit CI step instead of relying on hidden
install hooks during `generateOpenGraphCards()`.

For a quick reminder in any project:

```bash
og-cards install-browsers
og-cards install-browsers --ci
```

## JavaScript API

```js
import { generateOpenGraphCards } from "opengraph-cards-maker";

await generateOpenGraphCards({
  outputDir: "public/og",
  cards: [
    {
      id: "hello-world",
      eyebrow: "example.com",
      title: "Hello world",
      description: "A short summary that appears on the generated card.",
      badge: "Blog",
      status: {
        label: "Published",
        detail: "May 2026",
      },
    },
  ],
});
```

This writes `public/og/hello-world.png`.

In constrained CI environments, pass Playwright launch options through
`launchOptions`:

```js
await generateOpenGraphCards({
  outputDir: "public/og",
  launchOptions: {
    args: ["--no-sandbox"],
  },
  cards,
});
```

You can also build cards directly from files with YAML frontmatter:

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

For cards based on a prepared background image, pass `background.src`:

```js
await generateOpenGraphCards({
  outputDir: "public/og/posts",
  cards: [
    {
      id: "my-post",
      eyebrow: "example.com",
      title: "Building Open Graph cards at build time",
      description: "A practical note on generating social cards for static sites.",
      background: {
        src: "src/assets/open-graph/post-card-template.png",
      },
      meta: [
        { label: "Published", value: "2026-05-18" },
        { label: "Topic", value: "tooling" },
      ],
    },
  ],
});
```

## CLI

```bash
og-cards ./cards.config.json
```

The config file uses the same option shape as the JavaScript API:

```json
{
  "outputDir": "./public/og",
  "cleanOutputDir": true,
  "cards": [
    {
      "id": "hello-world",
      "eyebrow": "example.com",
      "title": "Hello world",
      "description": "A short summary that appears on the generated card."
    }
  ]
}
```

See `examples/cli/cards.config.json` for a broader sample gallery that covers
themes, metadata, status blocks, support rows, custom output filenames and
paths, plus bundled background and icon assets. Background examples also show
`contentAlign`, which constrains content to the left or right 60% of the card so
images can reserve a clean safe area for text on the least busy side.

Preview a config in the browser without writing PNG files:

```bash
og-cards preview ./cards.config.json
```

The preview command starts a local Vite server, renders cards with the same
template path used for generation, and shows a selector for multi-card configs.
Edit the config in your editor and refresh the browser to inspect changes.

## Custom Templates

The default template is intentionally generic for the beta. For project-specific
layouts, pass a `templates` map or a `createCard` adapter in JavaScript.

## Framework Guides

- [Astro](docs/astro.md)
- [11ty](docs/11ty.md)

## CI and Hosting

Install Chromium as part of your build setup before running the generator.
Do not rely on package lifecycle scripts to download browsers during install.
A small project script keeps local, CI, and hosting setup consistent:

```json
{
  "scripts": {
    "setup:playwright": "playwright install chromium",
    "setup:playwright:ci": "playwright install --with-deps chromium",
    "build": "pnpm run generate:og && astro build",
    "generate:og": "node scripts/generate-og-cards.mjs"
  }
}
```

### GitHub Actions

Cache Playwright's browser directory, install dependencies with scripts
disabled, then install Chromium explicitly. Pin actions to a commit SHA if your
project requires stronger supply-chain controls.

```yaml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile --ignore-scripts

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - name: Install Playwright Chromium
        run: pnpm run setup:playwright:ci

      - name: Build
        run: pnpm run build
```

### Netlify

Set `PLAYWRIGHT_BROWSERS_PATH=0` so Netlify stores the browser with the project
dependencies it caches, then run the explicit setup script before the build:

```toml
[build]
  command = "pnpm run setup:playwright && pnpm run build"
  publish = "dist"

[build.environment]
  PLAYWRIGHT_BROWSERS_PATH = "0"
```

### Vercel and Other CI

Use the same pattern: run the setup script before your framework build command.
Set `PLAYWRIGHT_BROWSERS_PATH=0` when browser downloads should live with
project dependencies:

```bash
pnpm run setup:playwright && pnpm run build
```

## General Documentation

- [Data model](docs/data-model.md)
- [Troubleshooting](docs/troubleshooting.md)

## Publishing

Releases are published from GitHub Actions with npm trusted publishing. Before
the first release, add this repository as a trusted publisher on npm using the
`publish.yml` workflow, enable 2FA on npm and GitHub, and remove any legacy npm
tokens from GitHub Actions secrets.

Validate the package locally before drafting a release:

```bash
pnpm run package:check
```

Create a GitHub release from a version tag to trigger the publish workflow.
