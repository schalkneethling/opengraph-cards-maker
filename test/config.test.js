import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeConfig } from "../src/config.js";

describe("normalizeConfig", () => {
  it("resolves output paths and local image paths relative to the config file", () => {
    const baseDir = path.resolve("/site/config");

    expect(
      normalizeConfig(
        {
          outputDir: "public/og",
          cards: [
            {
              title: "Card",
              outputPath: "custom/card.png",
              brand: { src: "assets/logo.svg" },
              background: { src: "data:image/png;base64,abc" },
              status: { icon: "icons/ok.svg" },
              support: [{ name: "Astro", icon: "https://example.com/astro.svg" }],
            },
          ],
        },
        baseDir,
      ),
    ).toMatchObject({
      outputDir: path.join(baseDir, "public/og"),
      cards: [
        {
          outputPath: path.join(baseDir, "custom/card.png"),
          brand: { src: path.join(baseDir, "assets/logo.svg") },
          background: { src: "data:image/png;base64,abc" },
          status: { icon: path.join(baseDir, "icons/ok.svg") },
          support: [{ icon: "https://example.com/astro.svg" }],
        },
      ],
    });
  });

  it("rejects insecure HTTP images during config normalization", () => {
    expect(() =>
      normalizeConfig(
        {
          cards: [{ background: { src: "http://example.com/card.png" } }],
        },
        "/site",
      ),
    ).toThrow("Refusing insecure image URL");
  });
});
