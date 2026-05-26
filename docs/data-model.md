# Data Model

`generateOpenGraphCards()` accepts global options and a `cards` array.

```js
await generateOpenGraphCards({
  outputDir: path.resolve("public/og"),
  cleanOutputDir: true,
  width: 1200,
  height: 630,
  cards: [
    {
      id: "my-post",
      title: "Building Open Graph cards at build time",
      description: "A practical note on generating social cards for static sites.",
    },
  ],
});
```

## Global Options

- `outputDir`: Directory where cards are written when a card does not define `outputPath`.
- `cleanOutputDir`: Remove `outputDir` before generating cards.
- `width`: Image width. Defaults to `1200`.
- `height`: Image height. Defaults to `630`.
- `brandSrc`: Optional default logo path, HTTPS URL, or data URL.
- `theme`: Optional colors for the default template.
- `templates`: Optional map of template render functions.
- `createCard`: Optional function for adapting input objects before rendering.
- `allowHttpImages`: Allow `http://` image URLs. Defaults to `false`.

## Card Fields

### Required

- `id`: Stable ID used as the filename, for example `my-post.png`.
- `title`: Main card title.
- `description`: Short supporting copy.

### Optional

- `badge`: Small callout shown on the right side of the summary row.
- `brand.src`: Optional logo path, HTTPS URL, or data URL.
- `background.src`: Optional background image path, HTTPS URL, or data URL.
- `cardText`: Optional card-specific copy that overrides the visible `title`
  and `description`.
- `contentAlign`: Optional content alignment for cards with a background image.
  Accepts `"full-width"`, `"align-start"`, or `"align-end"`. Defaults to
  `"full-width"`.
- `eyebrow`: Text shown above the title when no logo is used.
- `filename`: Optional filename override.
- `meta`: Optional list of small metadata chips.
- `outputPath`: Optional absolute or config-relative output path.
- `status`: Optional status box.
- `support`: Optional list of compact support cells.
- `template`: Optional key for `templates`.
- `theme`: Optional card-level color overrides.

## Card Text Override

Set `cardText` when JavaScript or JSON card data should use copy that differs
from the card's `title` and `description`:

```json
{
  "id": "my-post",
  "title": "My page title",
  "description": "My page meta description",
  "cardText": "Custom card copy for sharing this page."
}
```

When `cardText` is present, the default template renders it as the visible card
text and does not render the normal description.

## Theme

```json
{
  "background": "#ffffff",
  "foreground": "#111827",
  "muted": "#4b5563",
  "accent": "#2563eb",
  "accentBackground": "#eff6ff",
  "border": "#d1d5db"
}
```

Themes are intentionally visual, not semantic. Projects can map their own
statuses or categories to these colors before passing cards to the generator.

## Background Content Alignment

When `background.src` is set, use `contentAlign` to keep text away from busy
parts of the image. Choose the side that has intentional negative space:

```json
{
  "background": {
    "src": "./background.png"
  },
  "contentAlign": "align-end"
}
```

- `"full-width"` keeps the default full-width layout.
- `"align-start"` constrains content to the left 60% of the card.
- `"align-end"` constrains content to the right 60% of the card.

Use `"align-start"` only when the left 60% of the image is clear enough for
text. Use `"align-end"` when the right 60% is clear. In both cases, keep
important image detail out of the selected 60% plus the card safe area.
Constrained background cards work best as a single content block. Add `badge`,
`status`, or `support` only when the title and description are short enough to
leave clear vertical space.

## Status

```json
{
  "label": "Published",
  "detail": "May 2026",
  "icon": "./icon.svg"
}
```

## Support

```json
{
  "name": "API",
  "detail": "Stable",
  "supported": true,
  "icon": "./api.svg"
}
```

Support items are generic. They can represent platforms, plans, product
features, package formats, or any compact comparison data.

## Content Helpers

For static sites that store metadata in frontmatter, use
`createCardsFromContentFiles()` to turn files into card objects:

```js
import path from "node:path";
import { createCardsFromContentFiles, generateOpenGraphCards } from "opengraph-cards-maker";

const cards = await createCardsFromContentFiles({
  contentDir: "src/content/posts",
  extensions: [".md", ".mdx"],
  eyebrow: "example.com",
  getMeta: ({ frontmatter }) => [
    { label: "Published", value: String(frontmatter.pubDate) },
    { label: "Topic", value: frontmatter.tags?.[0] },
  ],
});

await generateOpenGraphCards({
  outputDir: path.resolve("public/og/posts"),
  cleanOutputDir: true,
  cards,
});
```

The helper:

- Recursively reads files matching `extensions`.
- Uses the file path relative to `contentDir` as the card ID.
- Parses YAML frontmatter.
- Requires each generated card to have `title` and `description`, unless
  `ogCardText` provides a single card copy override.
- Adds skipped file details to `cards.skipped`.

Set `ogCardText` in frontmatter when the generated card should use copy that is
different from the page `title` and `description`:

```md
---
title: My page title
description: My page meta description
ogCardText: Custom card copy for sharing this page.
---
```

When `ogCardText` is a non-empty string, the helper uses it as the card's
visible text and ignores the frontmatter `title` and `description` for card
copy. Empty or non-string values fall back to the default `title` and
`description` behavior.

Customize the adapter for any frontmatter-bearing format:

```js
const cards = await createCardsFromContentFiles({
  contentDir: "src/content",
  extensions: [".md", ".mdx", ".svx"],
  createCard: ({ file, frontmatter }) => ({
    id: frontmatter.slug ?? path.basename(file, path.extname(file)),
    title: frontmatter.title,
    description: frontmatter.summary,
    badge: frontmatter.section,
  }),
});
```

`createCardsFromMarkdownFiles()` remains available as an alias for projects that
prefer the older helper name.
