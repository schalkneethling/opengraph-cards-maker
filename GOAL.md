# Project Goal

## North Star

Help website builders generate polished, page-specific Open Graph images as
static build artifacts with a small, predictable Node package.

## Who This Is For

- Static site authors and maintainers who want unique social cards for pages,
  posts, docs, releases, or product updates.
- Framework users working with Astro, Eleventy, or another build pipeline that
  can run a Node script.
- Developers who prefer a JavaScript API, JSON config, or CLI over a hosted
  image service.

## Core Goals

1. Generate reliable `1200x630` PNG Open Graph cards at build time using
   Playwright and Chromium.
2. Keep the package framework-agnostic: accept plain card data, provide content
   helpers for frontmatter-driven sites, and document integration patterns for
   common static site generators.
3. Make cards useful out of the box with a generic default template, theme
   overrides, metadata chips, badges, status blocks, support rows, background
   images, font-size controls, and custom output paths.
4. Support both library and CLI workflows, including local previewing before PNG
   generation.
5. Favor clear setup and failure modes, especially around explicit Chromium
   installation in local, CI, and hosting environments.
6. Preserve safe defaults for generated HTML and image inputs, including escaped
   text content and refusal of insecure HTTP image URLs unless explicitly
   allowed.

## Success Looks Like

- A project can add the package, install Chromium explicitly, run one script, and
  receive deterministic PNG files in its public output directory.
- Astro, Eleventy, and custom static-site users can understand where the
  generator fits in their build without needing project-specific glue from this
  repository.
- The JavaScript API, CLI config shape, TypeScript declarations, docs, and tests
  describe the same data model.
- Missing browser setup, invalid card data, unsafe font-size overrides, and
  unsupported image sources fail with actionable errors.
- Example cards demonstrate the supported layout features without becoming the
  only way to use the package.

## Non-Goals

- This is not a hosted Open Graph image service.
- This is not a runtime image-generation API for edge functions, serverless
  routes, or client-side rendering.
- This is not a full design editor or brand management system.
- This is not tied to one framework, content collection API, or deployment
  provider.
- This should not hide Playwright browser installation in package lifecycle
  scripts or surprise users during dependency install.
- This should not optimize for arbitrary untrusted HTML, remote browser
  automation, or broad asset-fetching behavior beyond the explicit card image
  inputs.
- This should not duplicate full CI, hosting-provider, or framework
  documentation when official docs already cover the platform-specific details.

## Principles and Constraints

- Static output is the default product: generate images before or during a site
  build, then let the hosting platform serve plain PNG files.
- The data model should remain small, documented, and easy to produce from
  frontmatter, JSON, or custom code.
- Defaults should be useful but replaceable: users can start with the bundled
  template and later provide templates or card adapters for project-specific
  layouts.
- CI and hosting guidance should explain package-specific Chromium requirements
  and then point to official provider documentation for platform-specific
  details that are likely to change.
- Security and predictability matter more than magic convenience for paths,
  image sources, escaping, and CSS-sized inputs.
- Documentation should favor copyable integration examples over framework
  abstractions that would make the package harder to maintain.

## Current Focus

- Keep the beta surface coherent: API, CLI, preview, docs, examples, and tests
  should evolve together.
- Expand framework guidance only when it clarifies a durable build-time
  integration pattern.
- Improve template flexibility without turning the package into a layout system
  that must cover every possible social-card design.

## Open Questions

- Next.js is the likely next framework guide, focused on static or build-time
  card generation rather than runtime Open Graph image routes.
- How much custom-template support should live in this package versus in user
  projects and examples?
