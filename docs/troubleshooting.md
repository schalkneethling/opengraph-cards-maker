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
