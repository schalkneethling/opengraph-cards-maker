# Troubleshooting

## Playwright Cannot Launch Chromium

In restrictive local sandboxes, Chromium may fail with permission errors
around Mach ports or process cleanup. Run the generator from a normal shell, CI
job, or an approved command context.

## Playwright Browser Is Missing

Install Chromium for the project:

```bash
pnpm exec playwright install chromium
```

The generator fails fast with a short install hint when Chromium is not present.
Install the browser explicitly in CI or hosting builds before running
`generateOpenGraphCards()`.

For a reminder from the package CLI:

```bash
og-cards install-browsers
og-cards install-browsers --ci
```

### GitHub Actions

Add explicit setup scripts to your project:

```json
{
  "scripts": {
    "setup:playwright": "playwright install chromium",
    "setup:playwright:ci": "playwright install --with-deps chromium"
  }
}
```

Cache Playwright browsers, install dependencies with scripts disabled, and
install Chromium as a named setup step:

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

Set `PLAYWRIGHT_BROWSERS_PATH=0` in the Netlify environment and install
Chromium before the site build:

```toml
[build]
  command = "pnpm run setup:playwright && pnpm run build"
  publish = "dist"

[build.environment]
  PLAYWRIGHT_BROWSERS_PATH = "0"
```

### Vercel and Other CI

Use the same explicit setup. For Ubuntu CI runners, include system
dependencies:

```bash
pnpm run setup:playwright:ci
```

Set `PLAYWRIGHT_BROWSERS_PATH=0` when the host should store Playwright browsers
inside project dependencies instead of the default external cache directory.

## Launch Options in CI

Pass Playwright launch options through the generator when your build environment
needs them:

```js
await generateOpenGraphCards({
  outputDir,
  launchOptions: {
    args: ["--no-sandbox"],
  },
  cards,
});
```

## pnpm Wants to Remove node_modules

If a project was installed with a different pnpm major, pnpm may report an
unexpected store location. The clean fix is to reinstall dependencies with the
pnpm version declared in `packageManager`.

```bash
rm -rf node_modules
pnpm install
```

Only do this for dependency output. Do not remove source files.

## Stale Card Files Remain

Clear the output directory before regenerating:

```js
await generateOpenGraphCards({
  outputDir,
  cleanOutputDir: true,
  cards,
});
```

This prevents old filenames from lingering after post slugs change.
