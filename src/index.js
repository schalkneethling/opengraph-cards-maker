import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import YAML from "yaml";

const defaultTemplate = readFileSync(new URL("./templates/default.html", import.meta.url), "utf8");

export const defaultCardSize = {
  width: 1200,
  height: 630,
};

export const defaultTheme = {
  background: "#fff",
  foreground: "#111827",
  muted: "#4b5563",
  accent: "#2563eb",
  accentBackground: "#eff6ff",
  border: "#d1d5db",
};

export const fontSizeCssVariables = {
  eyebrow: "--font-size-eyebrow",
  title: "--font-size-title",
  description: "--font-size-description",
  statusLabel: "--font-size-status-label",
  statusDetail: "--font-size-status-detail",
  badge: "--font-size-badge",
  meta: "--font-size-meta",
  supportName: "--font-size-support-name",
  supportDetail: "--font-size-support-detail",
};

const fontSizeValuePattern = /^(?:\d*\.?\d+)(?:px|rem|em|%)$/;

export const playwrightChromiumInstallCommand = "pnpm exec playwright install chromium";
export const playwrightChromiumCiInstallCommand =
  "pnpm exec playwright install --with-deps chromium";

const chromiumMissingHints = [
  "Install the Playwright Chromium browser before generating cards:",
  `  ${playwrightChromiumInstallCommand}`,
  "For Ubuntu CI runners that also need system dependencies:",
  `  ${playwrightChromiumCiInstallCommand}`,
  "",
  "CI hints:",
  "- GitHub Actions: cache ~/.cache/ms-playwright and install chromium in an explicit setup step.",
  "- Netlify/Vercel: run the install command before your build and set PLAYWRIGHT_BROWSERS_PATH=0 when you want the browser stored with project dependencies.",
];

export function createMissingChromiumError(cause) {
  const error = new Error(
    [
      "Playwright Chromium is not available, so Open Graph cards cannot be rendered.",
      "",
      ...chromiumMissingHints,
    ].join("\n"),
    { cause },
  );
  error.name = "MissingPlaywrightChromiumError";
  return error;
}

export function isMissingChromiumError(error) {
  const message = String(error?.message ?? "");

  return (
    message.includes("Executable doesn't exist") ||
    message.includes("Looks like Playwright") ||
    (message.includes("playwright install") && message.includes("chromium"))
  );
}

async function assertChromiumAvailable(launchOptions) {
  if (launchOptions?.channel) {
    return;
  }

  const executablePath = launchOptions?.executablePath ?? chromium.executablePath();

  try {
    await fs.access(executablePath);
  } catch (error) {
    throw createMissingChromiumError(error);
  }
}

async function launchChromium(launchOptions) {
  await assertChromiumAvailable(launchOptions);

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (isMissingChromiumError(error)) {
      throw createMissingChromiumError(error);
    }

    throw error;
  }
}

export function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return null;
  }

  const data = YAML.parse(match[1]);
  return data && typeof data === "object" ? data : null;
}

export async function getContentFiles(dir, extensions = [".md", ".mdx"]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const normalizedExtensions = extensions.map((extension) =>
    extension.startsWith(".") ? extension : `.${extension}`,
  );
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return getContentFiles(entryPath, normalizedExtensions);
      }

      if (!normalizedExtensions.includes(path.extname(entry.name))) {
        return [];
      }

      return [entryPath];
    }),
  );

  return files.flat().sort();
}

function getContentId(file, contentDir) {
  const relativePath = path.relative(contentDir, file);
  return relativePath.replace(/\.[^.]+$/, "");
}

function getFrontmatterCardText(frontmatter) {
  return typeof frontmatter.ogCardText === "string" && frontmatter.ogCardText.trim()
    ? frontmatter.ogCardText
    : null;
}

function defaultCardFromFrontmatter({ file, frontmatter, contentDir, options }) {
  const cardText = getFrontmatterCardText(frontmatter);

  return {
    id: options.getId
      ? options.getId({ file, frontmatter, contentDir })
      : getContentId(file, contentDir),
    eyebrow: options.eyebrow,
    title: frontmatter.title,
    description: frontmatter.description,
    cardText,
    background: options.backgroundSrc
      ? {
          src: options.backgroundSrc,
        }
      : undefined,
    meta: options.getMeta ? options.getMeta({ file, frontmatter, contentDir }) : [],
  };
}

export async function createCardsFromContentFiles(options) {
  const contentDir = path.resolve(options.contentDir);
  const files = await getContentFiles(contentDir, options.extensions);
  const cards = [];
  const skipped = [];

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const frontmatter = options.parseFrontmatter
      ? options.parseFrontmatter(source, { file, contentDir })
      : parseFrontmatter(source);

    if (!frontmatter) {
      skipped.push({
        file,
        reason: "missing frontmatter",
      });
      continue;
    }

    const cardText = getFrontmatterCardText(frontmatter);
    const baseCard = options.createCard
      ? options.createCard({ file, frontmatter, contentDir })
      : defaultCardFromFrontmatter({ file, frontmatter, contentDir, options });
    const hasRequiredCopy = baseCard?.cardText || (baseCard?.title && baseCard.description);

    if (!hasRequiredCopy) {
      skipped.push({
        file,
        reason: "missing title or description",
      });
      continue;
    }

    cards.push(
      options.mapCard ? options.mapCard(baseCard, { file, frontmatter, contentDir }) : baseCard,
    );
  }

  cards.skipped = skipped;
  return cards;
}

export const createCardsFromMarkdownFiles = createCardsFromContentFiles;

export async function fileToDataUrl(file) {
  const content = await fs.readFile(file);
  const extension = path.extname(file).toLowerCase();
  const mimeType =
    extension === ".svg"
      ? "image/svg+xml"
      : extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

  return `data:${mimeType};base64,${content.toString("base64")}`;
}

function isHttpsUrl(value) {
  return value.startsWith("https://");
}

function isHttpUrl(value) {
  return value.startsWith("http://");
}

async function imageSourceToDataUrl(source, options = {}) {
  if (!source) {
    return "";
  }

  if (source.startsWith("data:") || isHttpsUrl(source)) {
    return source;
  }

  if (isHttpUrl(source)) {
    if (options.allowHttpImages) {
      return source;
    }

    throw new Error(`Refusing insecure image URL: ${source}`);
  }

  return fileToDataUrl(source);
}

export async function resolveCardImages(card, options) {
  const brand = card.brand ?? options.brand ?? {};
  const status = card.status ?? {};
  const support = card.support ?? [];

  return {
    brand: await imageSourceToDataUrl(brand.src ?? options.brandSrc ?? "", options),
    background: await imageSourceToDataUrl(card.background?.src ?? "", options),
    status: await imageSourceToDataUrl(status.icon ?? "", options),
    support: await Promise.all(
      support.map(async (item) => ({
        ...item,
        icon: await imageSourceToDataUrl(item.icon ?? "", options),
      })),
    ),
  };
}

function renderImage(image, className) {
  return image ? `<img class="${className}" src="${image}" alt="">` : "";
}

function renderStatus(status = {}, statusIcon = "") {
  if (!status.label && !status.detail) {
    return "";
  }

  return `
    <div class="status">
      <span class="status-heading">
        ${renderImage(statusIcon, "status-icon")}
        ${status.label ? `<span class="status-label">${escapeHTML(status.label)}</span>` : ""}
      </span>
      ${status.detail ? `<span class="status-detail">${escapeHTML(status.detail)}</span>` : ""}
    </div>
  `;
}

function renderMeta(meta = []) {
  return meta
    .filter((item) => item?.label || item?.value)
    .map((item) => {
      const label = item.label ? `<span>${escapeHTML(item.label)}</span>` : "";
      const value = item.value ? `<strong>${escapeHTML(item.value)}</strong>` : "";

      return `<span class="meta-item">${label}${value}</span>`;
    })
    .join("");
}

function renderSupport(support = []) {
  if (!support.length) {
    return "";
  }

  return `
    <ul class="support">
      ${support
        .map((item) => {
          const stateClass = item.supported === false ? "is-muted" : "";
          const icon = item.icon ? `<img src="${item.icon}" alt="">` : "";

          return `
            <li class="support-item ${stateClass}">
              ${icon}
              <span class="support-name">${escapeHTML(item.name)}</span>
              <span class="support-detail">${escapeHTML(item.detail)}</span>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function normalizeFontSize(value, name) {
  if (value == null || value === "") {
    return null;
  }

  if (Number.isFinite(value) && value > 0) {
    return `${value}px`;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid font size for ${name}: expected a number or CSS length string.`);
  }

  const trimmed = value.trim();

  // Accept only positive numeric CSS lengths for the supported units, such as 16px, .75em, 1.5rem, or 100%.
  if (fontSizeValuePattern.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Invalid font size for ${name}: ${value}`);
}

function isKnownFontSizeName(name) {
  return Object.prototype.hasOwnProperty.call(fontSizeCssVariables, name);
}

function renderFontSizeCssVariable(name, value) {
  if (!isKnownFontSizeName(name)) {
    return null;
  }

  const normalizedValue = normalizeFontSize(value, name);

  return normalizedValue ? `${fontSizeCssVariables[name]}: ${normalizedValue}` : null;
}

function renderFontSizeCssVariables(fontSizes = {}) {
  const cssVariables = [];

  for (const [name, value] of Object.entries(fontSizes)) {
    const cssVariable = renderFontSizeCssVariable(name, value);

    if (cssVariable) {
      cssVariables.push(cssVariable);
    }
  }

  return cssVariables;
}

function renderCssVariables(theme, size, fontSizes) {
  const resolvedTheme = {
    ...defaultTheme,
    ...theme,
  };

  return [
    `--card-width: ${size.width}px`,
    `--card-height: ${size.height}px`,
    `--card-background: ${resolvedTheme.background}`,
    `--card-foreground: ${resolvedTheme.foreground}`,
    `--card-muted: ${resolvedTheme.muted}`,
    `--card-accent: ${resolvedTheme.accent}`,
    `--card-accent-background: ${resolvedTheme.accentBackground}`,
    `--card-border: ${resolvedTheme.border}`,
    ...renderFontSizeCssVariables(fontSizes),
  ].join("; ");
}

function renderTemplate(template, replacements) {
  return template.replaceAll(/\{\{([a-zA-Z0-9]+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : match,
  );
}

function getContentAlignClass(card, hasBackground) {
  if (!hasBackground) {
    return "content-align-full-width";
  }

  if (card.contentAlign === "align-start" || card["content-align"] === "align-start") {
    return "content-align-start";
  }

  if (card.contentAlign === "align-end" || card["content-align"] === "align-end") {
    return "content-align-end";
  }

  return "content-align-full-width";
}

export function renderCardDocument(card, images, size = defaultCardSize, options = {}) {
  if (options.templates?.[card.template]) {
    return options.templates[card.template]({ card, images, size, escapeHTML });
  }

  const hasBackground = Boolean(images.background);
  const cssVariables = renderCssVariables(card.theme ?? options.theme, size, {
    ...options.fontSizes,
    ...card.fontSizes,
  });
  const brand = images.brand
    ? renderImage(images.brand, "brand")
    : card.eyebrow
      ? `<p class="eyebrow">${escapeHTML(card.eyebrow)}</p>`
      : "";
  const badge = card.badge ? `<span class="badge">${escapeHTML(card.badge)}</span>` : "";
  const meta = renderMeta(card.meta);
  const support = renderSupport(images.support);
  const status = renderStatus(card.status, images.status);
  const summary = status || badge ? `<section class="summary">${status}${badge}</section>` : "";
  const background = images.background
    ? `<img class="background" src="${images.background}" alt="">`
    : "";
  const title = card.cardText ?? card.title;
  const description = card.cardText ? "" : card.description;

  return renderTemplate(defaultTemplate, {
    lang: escapeHTML(options.lang ?? "en"),
    cssVariables,
    contentAlignClass: getContentAlignClass(card, hasBackground),
    supportColumns: String(Math.max(1, Math.min(4, images.support.length || 4))),
    background,
    brand,
    title: escapeHTML(title),
    description: description ? `<p class="description">${escapeHTML(description)}</p>` : "",
    meta: meta ? `<div class="meta">${meta}</div>` : "",
    summary,
    support,
  });
}

export function createArticleCard(input) {
  return {
    template: input.template,
    theme: input.theme,
    fontSizes: input.fontSizes,
    contentAlign: input.contentAlign ?? input["content-align"],
    brand: input.brand,
    background: input.background,
    eyebrow: input.eyebrow ?? input.siteName,
    title: input.title,
    description: input.description,
    cardText: input.cardText,
    badge: input.badge,
    meta: input.meta,
    status: input.status,
    support: input.support,
  };
}

export function createCard(input, options) {
  if (options.createCard) {
    return options.createCard(input);
  }

  return createArticleCard(input);
}

async function screenshot(page, html, outputPath, size) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({
    path: outputPath,
    clip: { x: 0, y: 0, width: size.width, height: size.height },
  });
}

export async function generateOpenGraphCards(options) {
  const size = {
    width: options.width ?? defaultCardSize.width,
    height: options.height ?? defaultCardSize.height,
  };
  const outputDir = path.resolve(options.outputDir ?? "public/og");
  const cards = options.cards ?? options.items ?? [];

  if (!Array.isArray(cards) || !cards.length) {
    throw new Error("generateOpenGraphCards requires a non-empty cards array.");
  }

  if (options.cleanOutputDir) {
    await fs.rm(outputDir, { recursive: true, force: true });
  }

  const browser = await launchChromium(options.launchOptions);
  const page = await browser.newPage({
    viewport: size,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  });
  const results = [];

  try {
    for (const input of cards) {
      const card = createCard(
        {
          ...input,
          template: input.template ?? options.template,
        },
        options,
      );
      const images = await resolveCardImages(card, options);
      const html = renderCardDocument(card, images, size, options);
      const filename = input.filename ?? `${input.id ?? slugify(input.title)}.png`;
      const outputPath = path.resolve(input.outputPath ?? path.join(outputDir, filename));

      await screenshot(page, html, outputPath, size);
      results.push({ id: input.id, outputPath });
    }
  } finally {
    await browser.close();
  }

  return results;
}
