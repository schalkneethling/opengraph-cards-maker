import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createCardsFromContentFiles,
  createMissingChromiumError,
  escapeHTML,
  fileToDataUrl,
  getContentFiles,
  isMissingChromiumError,
  playwrightChromiumCiInstallCommand,
  parseFrontmatter,
  playwrightChromiumInstallCommand,
  renderCardDocument,
  resolveCardImages,
  slugify,
} from "../src/index.js";

const tempDirs = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "og-cards-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("content helpers", () => {
  it("escapes HTML-sensitive characters used in rendered card text", () => {
    expect(escapeHTML(`<script data-name="x">&</script>`)).toBe(
      "&lt;script data-name=&quot;x&quot;&gt;&amp;&lt;/script&gt;",
    );
  });

  it("slugifies titles into stable filenames", () => {
    expect(slugify("  Ship: Open Graph Cards!  ")).toBe("ship-open-graph-cards");
  });

  it("parses YAML frontmatter and ignores files without it", () => {
    expect(parseFrontmatter("---\ntitle: Hello\ndescription: World\n---\nBody")).toEqual({
      title: "Hello",
      description: "World",
    });
    expect(parseFrontmatter("# No frontmatter")).toBeNull();
  });

  it("finds supported content files recursively in sorted order", async () => {
    const root = await makeTempDir();
    await mkdir(path.join(root, "nested"));
    await writeFile(path.join(root, "b.md"), "");
    await writeFile(path.join(root, "a.txt"), "");
    await writeFile(path.join(root, "nested", "a.mdx"), "");

    expect(await getContentFiles(root)).toEqual([
      path.join(root, "b.md"),
      path.join(root, "nested", "a.mdx"),
    ]);
  });
});

describe("card creation from content", () => {
  it("creates cards from frontmatter and records skipped files", async () => {
    const root = await makeTempDir();
    await writeFile(
      path.join(root, "ready.md"),
      "---\ntitle: Ready\ndescription: Good to ship\n---\n",
    );
    await writeFile(path.join(root, "draft.md"), "---\ntitle: Draft\n---\n");
    await writeFile(path.join(root, "plain.md"), "# Missing frontmatter");

    const cards = await createCardsFromContentFiles({
      contentDir: root,
      eyebrow: "Docs",
      getMeta: ({ frontmatter }) => [{ label: "Title", value: frontmatter.title }],
    });

    expect([...cards]).toEqual([
      {
        id: "ready",
        eyebrow: "Docs",
        title: "Ready",
        description: "Good to ship",
        background: undefined,
        meta: [{ label: "Title", value: "Ready" }],
      },
    ]);
    expect(cards.skipped).toEqual([
      {
        file: path.join(root, "draft.md"),
        reason: "missing title or description",
      },
      {
        file: path.join(root, "plain.md"),
        reason: "missing frontmatter",
      },
    ]);
  });
});

describe("image handling and rendering", () => {
  it("converts local image files to data URLs", async () => {
    const root = await makeTempDir();
    const imagePath = path.join(root, "icon.svg");
    await writeFile(imagePath, "<svg></svg>");

    expect(await fileToDataUrl(imagePath)).toBe("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");
  });

  it("refuses insecure image URLs unless explicitly allowed", async () => {
    await expect(
      resolveCardImages({ background: { src: "http://example.com/card.png" } }, {}),
    ).rejects.toThrow("Refusing insecure image URL");

    await expect(
      resolveCardImages(
        { background: { src: "http://example.com/card.png" } },
        { allowHttpImages: true },
      ),
    ).resolves.toMatchObject({
      background: "http://example.com/card.png",
    });
  });

  it("renders escaped card content and selected layout state", () => {
    const html = renderCardDocument(
      {
        title: `Hello <World>`,
        description: `Launch "soon" & safely`,
        eyebrow: "Release",
        badge: "Beta",
        meta: [{ label: "Status", value: "Ready" }],
        status: { label: "Green", detail: "All checks pass" },
        support: [{ name: "Astro", detail: "Supported" }],
      },
      { brand: "", background: "", status: "", support: [] },
    );

    expect(html).toContain("content-align-full-width");
    expect(html).toContain("Hello &lt;World&gt;");
    expect(html).toContain("Launch &quot;soon&quot; &amp; safely");
    expect(html).toContain('<span class="badge">Beta</span>');
    expect(html).toContain("<strong>Ready</strong>");
  });
});

describe("Playwright browser diagnostics", () => {
  it("recognizes the common missing-browser launch error", () => {
    expect(
      isMissingChromiumError(
        new Error(
          "browserType.launch: Executable doesn't exist at /Users/example/Library/Caches/ms-playwright/chromium/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        ),
      ),
    ).toBe(true);
  });

  it("creates a short actionable install error", () => {
    const error = createMissingChromiumError(new Error("Executable doesn't exist"));

    expect(error.name).toBe("MissingPlaywrightChromiumError");
    expect(error.message).toContain("Playwright Chromium is not available");
    expect(error.message).toContain(playwrightChromiumInstallCommand);
    expect(error.message).toContain(playwrightChromiumCiInstallCommand);
    expect(error.message).toContain("GitHub Actions");
  });
});
