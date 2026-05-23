#!/usr/bin/env node
import { readConfig } from "./config.js";
import { generateOpenGraphCards } from "./index.js";
import { startPreviewServer } from "./preview.js";

async function main() {
  const [commandOrConfigPath, maybeConfigPath] = process.argv.slice(2);
  const isPreviewCommand = commandOrConfigPath === "preview";
  const configPath = isPreviewCommand ? maybeConfigPath : commandOrConfigPath;

  if (!configPath) {
    console.error("Usage: og-cards <config.json>");
    console.error("       og-cards preview <config.json>");
    process.exitCode = 1;
    return;
  }

  if (isPreviewCommand) {
    await startPreviewServer(configPath);
    return;
  }

  const { config, absolutePath } = await readConfig(configPath);
  const results = await generateOpenGraphCards(config);
  console.log(`Generated ${results.length} Open Graph card(s) from ${absolutePath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
