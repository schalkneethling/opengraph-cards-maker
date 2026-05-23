#!/usr/bin/env node
import { readConfig } from "./config.js";
import {
  generateOpenGraphCards,
  playwrightChromiumCiInstallCommand,
  playwrightChromiumInstallCommand,
} from "./index.js";
import { startPreviewServer } from "./preview.js";

async function main() {
  const [commandOrConfigPath, maybeConfigPath, ...flags] = process.argv.slice(2);
  const isPreviewCommand = commandOrConfigPath === "preview";
  const isInstallBrowsersCommand = commandOrConfigPath === "install-browsers";
  const configPath = isPreviewCommand ? maybeConfigPath : commandOrConfigPath;

  if (isInstallBrowsersCommand) {
    if (maybeConfigPath === "--ci" || flags.includes("--ci")) {
      console.log("Install Playwright Chromium and system dependencies for Ubuntu CI:");
      console.log(`  ${playwrightChromiumCiInstallCommand}`);
    } else {
      console.log("Install the Playwright Chromium browser before generating cards:");
      console.log(`  ${playwrightChromiumInstallCommand}`);
    }
    return;
  }

  if (!configPath) {
    console.error("Usage: og-cards <config.json>");
    console.error("       og-cards preview <config.json>");
    console.error("       og-cards install-browsers [--ci]");
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
