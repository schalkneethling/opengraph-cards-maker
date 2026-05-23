import { readFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { readConfig } from "./config.js";
import {
  createCard,
  defaultCardSize,
  renderCardDocument,
  resolveCardImages,
  slugify,
} from "./index.js";

const previewTemplate = readFileSync(new URL("./templates/preview.html", import.meta.url), "utf8");

function send(res, statusCode, contentType, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

function getOutputFilename(input) {
  return input.filename ?? `${input.id ?? slugify(input.title)}.png`;
}

async function getPreviewCards(configPath) {
  const { config, absolutePath } = await readConfig(configPath);
  const size = {
    width: config.width ?? defaultCardSize.width,
    height: config.height ?? defaultCardSize.height,
  };
  const outputDir = path.resolve(config.outputDir ?? "public/og");
  const cards = config.cards ?? config.items ?? [];

  if (!Array.isArray(cards) || !cards.length) {
    throw new Error("Preview requires a non-empty cards array.");
  }

  const renderedCards = await Promise.all(
    cards.map(async (input, index) => {
      const card = createCard(
        {
          ...input,
          template: input.template ?? config.template,
        },
        config,
      );
      const images = await resolveCardImages(card, config);
      const html = renderCardDocument(card, images, size, config);
      const filename = getOutputFilename(input);
      const outputPath = path.resolve(input.outputPath ?? path.join(outputDir, filename));

      return {
        index,
        id: input.id ?? slugify(input.title),
        title: card.title,
        filename,
        outputPath,
        html,
      };
    }),
  );

  return {
    configPath: absolutePath,
    size,
    cards: renderedCards,
  };
}

function createPreviewPlugin(configPath) {
  let viteServer;

  return {
    name: "og-cards-preview",
    configureServer(server) {
      viteServer = server;

      server.watcher.add(path.resolve(configPath));
      server.watcher.on("change", (changedPath) => {
        if (changedPath === path.resolve(configPath)) {
          server.ws.send({ type: "full-reload" });
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/__og-cards/preview-data") {
          try {
            const data = await getPreviewCards(configPath);
            send(res, 200, "application/json; charset=utf-8", JSON.stringify(data));
          } catch (error) {
            send(
              res,
              500,
              "application/json; charset=utf-8",
              JSON.stringify({ error: error.message }),
            );
          }
          return;
        }

        if (req.url === "/" || req.url === "/index.html") {
          const html = await viteServer.transformIndexHtml(req.url, previewTemplate);
          send(res, 200, "text/html; charset=utf-8", html);
          return;
        }

        next();
      });
    },
  };
}

export async function startPreviewServer(configPath, options = {}) {
  const { absolutePath } = await readConfig(configPath);
  const server = await createServer({
    appType: "custom",
    configFile: false,
    root: process.cwd(),
    plugins: [createPreviewPlugin(absolutePath)],
    server: {
      host: options.host ?? "127.0.0.1",
      port: options.port ?? 5173,
      strictPort: false,
    },
  });

  try {
    await server.listen();
  } catch (error) {
    await server.close();
    throw error;
  }
  server.printUrls();
  console.log(`Previewing Open Graph cards from ${absolutePath}`);

  return server;
}
