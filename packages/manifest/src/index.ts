/**
 * @better-pwa/manifest — Web app manifest generation with icon pipeline.
 *
 * Generates a standards-compliant manifest.json from config.
 */
import { better } from "@better-logger/core";

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "monochrome";
}

export interface ManifestConfig {
  /** App name (required) */
  name: string;
  /** Short name for home screen */
  short_name?: string;
  /** App description */
  description?: string;
  /** Start URL (default: '/') */
  start_url?: string;
  /** Display mode (default: 'standalone') */
  display?: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  /** Theme color */
  theme_color?: string;
  /** Background color */
  background_color?: string;
  /** App scope */
  scope?: string;
  /** Icons (auto-generated if src provided) */
  icons?: ManifestIcon[];
  /** Icon source path for auto-generation */
  iconSrc?: string;
  /** Orientation */
  orientation?: "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
  /** Categories */
  categories?: string[];
  /** Language */
  lang?: string;
  /** Direction */
  dir?: "ltr" | "rtl" | "auto";
}

const DEFAULT_MANIFEST: Partial<ManifestConfig> = {
  start_url: "/",
  display: "standalone",
  theme_color: "#6366f1",
  background_color: "#ffffff",
  scope: "/",
  lang: "en",
  dir: "ltr",
  orientation: "any",
};

/** Generate manifest.json from config */
function generateManifest(config: ManifestConfig): string {
  const merged = { ...DEFAULT_MANIFEST, ...config };

  // Auto-generate icons if iconSrc provided
  const icons = merged.icons ?? generateDefaultIcons(merged.iconSrc);

  const manifest = {
    name: merged.name,
    short_name: merged.short_name ?? merged.name.split(" ")[0],
    description: merged.description,
    start_url: merged.start_url,
    display: merged.display,
    theme_color: merged.theme_color,
    background_color: merged.background_color,
    scope: merged.scope,
    orientation: merged.orientation,
    lang: merged.lang,
    dir: merged.dir,
    categories: merged.categories,
    icons,
  };

  // Remove undefined values
  const clean = Object.fromEntries(
    Object.entries(manifest).filter(([, v]) => v !== undefined)
  );

  better.log.info("manifest:generated", { name: merged.name });
  return JSON.stringify(clean, null, 2);
}

/** Write manifest to disk */
async function writeManifest(config: ManifestConfig, outputPath = "dist/manifest.json"): Promise<string> {
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");

  const content = generateManifest(config);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content);

  better.log.info("manifest:wrote", { path: outputPath });
  return outputPath;
}

/** Generate default icon set from a source icon */
function generateDefaultIcons(iconSrc?: string): ManifestIcon[] {
  if (!iconSrc) {
    return [];
  }

  const sizes = ["72x72", "96x96", "128x128", "144x144", "152x152", "192x192", "384x384", "512x512"];
  return sizes.map((size) => ({
    src: iconSrc.replace("{size}", size),
    sizes: size,
    type: "image/png",
    purpose: "any maskable" as const,
  }));
}

/** Generate default HTML link tags for manifest and icons */
function generateHtmlLinks(config: ManifestConfig, manifestPath = "/manifest.json"): string {
  const lines = [
    `<link rel="manifest" href="${manifestPath}">`,
    `<meta name="theme-color" content="${config.theme_color ?? DEFAULT_MANIFEST.theme_color}">`,
  ];

  const icons = config.icons ?? generateDefaultIcons(config.iconSrc);
  for (const icon of icons) {
    if (icon.sizes === "512x512") {
      lines.push(`<link rel="icon" type="${icon.type}" href="${icon.src}">`);
      lines.push(`<link rel="apple-touch-icon" href="${icon.src}">`);
    }
  }

  return lines.join("\n");
}

export { generateManifest, writeManifest, generateDefaultIcons, generateHtmlLinks, DEFAULT_MANIFEST };
export type { ManifestConfig, ManifestIcon };
