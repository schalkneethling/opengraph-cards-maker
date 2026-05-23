import fs from "node:fs/promises";
import path from "node:path";

function resolvePathIfRelative(value, baseDir) {
  if (!value || value.startsWith("data:") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("http://")) {
    throw new Error(`Refusing insecure image URL: ${value}`);
  }

  return path.resolve(baseDir, value);
}

export function normalizeConfig(config, baseDir) {
  const outputDir = config.outputDir ? path.resolve(baseDir, config.outputDir) : undefined;
  const cards = (config.cards ?? []).map((card) => ({
    ...card,
    outputPath: card.outputPath ? path.resolve(baseDir, card.outputPath) : undefined,
    brand: card.brand
      ? {
          ...card.brand,
          src: resolvePathIfRelative(card.brand.src, baseDir),
        }
      : undefined,
    background: card.background
      ? {
          ...card.background,
          src: resolvePathIfRelative(card.background.src, baseDir),
        }
      : undefined,
    status: card.status
      ? {
          ...card.status,
          icon: resolvePathIfRelative(card.status.icon, baseDir),
        }
      : undefined,
    support: card.support?.map((item) => ({
      ...item,
      icon: resolvePathIfRelative(item.icon, baseDir),
    })),
  }));

  return {
    ...config,
    outputDir,
    cleanOutputDir: config.cleanOutputDir,
    cards,
  };
}

export async function readConfig(configPath) {
  const absolutePath = path.resolve(configPath);
  const config = JSON.parse(await fs.readFile(absolutePath, "utf8"));
  const baseDir = path.dirname(absolutePath);

  return {
    config: normalizeConfig(config, baseDir),
    absolutePath,
    baseDir,
  };
}
