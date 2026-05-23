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
