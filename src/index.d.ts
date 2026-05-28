export interface CardSize {
  width: number;
  height: number;
}

export interface Theme {
  background?: string;
  foreground?: string;
  muted?: string;
  accent?: string;
  accentBackground?: string;
  border?: string;
}

export type FontSizeValue = number | string | null | undefined;

export interface FontSizes {
  eyebrow?: FontSizeValue;
  title?: FontSizeValue;
  description?: FontSizeValue;
  statusLabel?: FontSizeValue;
  statusDetail?: FontSizeValue;
  badge?: FontSizeValue;
  meta?: FontSizeValue;
  supportName?: FontSizeValue;
  supportDetail?: FontSizeValue;
}

export type ContentAlign = "full-width" | "align-start" | "align-end";

export interface ImageSource {
  src?: string;
  [key: string]: unknown;
}

export interface MetaItem {
  label?: string;
  value?: string;
}

export interface Status {
  label?: string;
  detail?: string;
  icon?: string;
}

export interface SupportItem {
  name?: string;
  detail?: string;
  supported?: boolean;
  icon?: string;
  [key: string]: unknown;
}

export interface CardInput {
  id?: string;
  filename?: string;
  outputPath?: string;
  template?: string;
  theme?: Theme;
  fontSizes?: FontSizes;
  contentAlign?: ContentAlign;
  "content-align"?: ContentAlign;
  brand?: ImageSource;
  background?: ImageSource;
  eyebrow?: string;
  siteName?: string;
  title?: string;
  description?: string;
  cardText?: string | null;
  badge?: string;
  meta?: MetaItem[];
  status?: Status;
  support?: SupportItem[];
  [key: string]: unknown;
}

export interface Card extends CardInput {
  eyebrow?: string;
  contentAlign?: ContentAlign;
}

export interface ResolvedCardImages {
  brand: string;
  background: string;
  status: string;
  support: SupportItem[];
}

export interface TemplateContext {
  card: Card;
  images: ResolvedCardImages;
  size: CardSize;
  escapeHTML: typeof escapeHTML;
}

export type TemplateRenderer = (context: TemplateContext) => string;

export interface GenerateOpenGraphCardsOptions {
  outputDir?: string;
  cleanOutputDir?: boolean;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  brandSrc?: string;
  template?: string;
  theme?: Theme;
  fontSizes?: FontSizes;
  templates?: Record<string, TemplateRenderer>;
  createCard?: (input: CardInput) => Card;
  allowHttpImages?: boolean;
  launchOptions?: import("playwright").LaunchOptions;
  cards?: CardInput[];
  items?: CardInput[];
}

export interface GenerateOpenGraphCardResult {
  id?: string;
  outputPath: string;
}

export interface FrontmatterContext {
  file: string;
  frontmatter: Record<string, unknown>;
  contentDir: string;
}

export interface SkippedContentFile {
  file: string;
  reason: "missing frontmatter" | "missing title or description";
}

export type CreatedContentCards = CardInput[] & {
  skipped: SkippedContentFile[];
};

export interface CreateCardsFromContentFilesOptions {
  contentDir: string;
  extensions?: string[];
  eyebrow?: string;
  backgroundSrc?: string;
  parseFrontmatter?: (
    source: string,
    context: Pick<FrontmatterContext, "file" | "contentDir">,
  ) => Record<string, unknown> | null;
  getId?: (context: FrontmatterContext) => string;
  getMeta?: (context: FrontmatterContext) => MetaItem[];
  createCard?: (context: FrontmatterContext) => CardInput;
  mapCard?: (card: CardInput, context: FrontmatterContext) => CardInput;
}

export interface ResolveCardImagesOptions {
  brand?: ImageSource;
  brandSrc?: string;
  allowHttpImages?: boolean;
}

export const defaultCardSize: CardSize;
export const defaultTheme: Required<Theme>;
export const fontSizeCssVariables: Record<keyof FontSizes, string>;
export const playwrightChromiumInstallCommand: string;
export const playwrightChromiumCiInstallCommand: string;

export function createMissingChromiumError(cause: unknown): Error;
export function isMissingChromiumError(error: unknown): boolean;
export function escapeHTML(value?: unknown): string;
export function slugify(value?: unknown): string;
export function parseFrontmatter(source: string): Record<string, unknown> | null;
export function getContentFiles(dir: string, extensions?: string[]): Promise<string[]>;
export function createCardsFromContentFiles(
  options: CreateCardsFromContentFilesOptions,
): Promise<CreatedContentCards>;
export const createCardsFromMarkdownFiles: typeof createCardsFromContentFiles;
export function fileToDataUrl(file: string): Promise<string>;
export function resolveCardImages(
  card: CardInput,
  options?: ResolveCardImagesOptions,
): Promise<ResolvedCardImages>;
export function renderCardDocument(
  card: Card,
  images: ResolvedCardImages,
  size?: CardSize,
  options?: Pick<GenerateOpenGraphCardsOptions, "templates" | "theme" | "fontSizes"> & {
    lang?: string;
  },
): string;
export function createArticleCard(input: CardInput): Card;
export function createCard(
  input: CardInput,
  options: Pick<GenerateOpenGraphCardsOptions, "createCard">,
): Card;
export function generateOpenGraphCards(
  options: GenerateOpenGraphCardsOptions,
): Promise<GenerateOpenGraphCardResult[]>;
