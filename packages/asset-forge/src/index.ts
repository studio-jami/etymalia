// Deterministic SVG identity synthesis. From a brand name and its palette we
// generate a monogram icon, a wordmark, and a combined lockup, each in a full
// colour and a single-colour (currentColor) variant. Monochrome variants use
// `currentColor` so inverted/black/white lockups are free CSS recolours rather
// than re-renders. Vector output is resolution-independent; raster derivation
// is exposed by the dedicated in-memory raster and favicon utilities below.

export interface IdentityInput {
  name: string;
  primary: string;
  accent: string;
  ink: string;
  paper: string;
  onPrimary: string;
  displayFont?: string;
  recipe?: IdentityRecipe;
}

export interface IdentityRecipe {
  mark: "rounded" | "square" | "circle";
  lockup: "horizontal" | "stacked";
  type: "editorial" | "modern" | "grotesk";
  tracking: "tight" | "normal" | "wide";
}

const DEFAULT_RECIPE: IdentityRecipe = { mark: "rounded", lockup: "horizontal", type: "editorial", tracking: "tight" };

export type IdentityKind = "lockup" | "icon" | "wordmark";
export type IdentityVariant = "main" | "mono";

export interface IdentityAsset {
  id: string;
  label: string;
  kind: IdentityKind;
  variant: IdentityVariant;
  width: number;
  height: number;
  svg: string;
}

export interface Identity {
  monogram: string;
  assets: IdentityAsset[];
}

const DEFAULT_FONT =
  'Georgia, "Times New Roman", "Iowan Old Style", serif';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Up to two initials from the brand name. */
export function monogramFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "E";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function iconSvg(input: IdentityInput, monogram: string, variant: IdentityVariant, font: string, recipe: IdentityRecipe): string {
  const fill = variant === "main" ? input.primary : "none";
  const stroke = variant === "main" ? "none" : "currentColor";
  const textFill = variant === "main" ? input.onPrimary : "currentColor";
  const accent = variant === "main" ? input.accent : "currentColor";
  const fontFamily = escapeXml(font);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${escapeXml(input.name)} icon">`,
    `<title>${escapeXml(input.name)}</title>`,
    `<rect x="8" y="8" width="112" height="112" rx="${recipe.mark === "circle" ? 56 : recipe.mark === "square" ? 0 : 22}" fill="${fill}" stroke="${stroke}" stroke-width="${variant === "main" ? 0 : 4}"/>`,
    `<rect x="8" y="92" width="112" height="10" fill="${accent}" opacity="${variant === "main" ? 0.9 : 0.5}"/>`,
    `<text x="64" y="72" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}" font-size="58" font-weight="600" letter-spacing="-2" fill="${textFill}">${escapeXml(monogram)}</text>`,
    `</svg>`,
  ].join("");
}

function wordmarkSvg(input: IdentityInput, variant: IdentityVariant, font: string, recipe: IdentityRecipe): string {
  const width = Math.round(Math.max(220, input.name.length * 30 + 48));
  const height = 88;
  const textFill = variant === "main" ? input.ink : "currentColor";
  const accent = variant === "main" ? input.accent : "currentColor";
  const fontFamily = escapeXml(font);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(input.name)}">`,
    `<title>${escapeXml(input.name)}</title>`,
    `<text x="24" y="${height / 2}" dominant-baseline="middle" font-family="${fontFamily}" font-size="46" font-weight="${recipe.type === "grotesk" ? 700 : 500}" letter-spacing="${recipe.tracking === "wide" ? 1.5 : recipe.tracking === "normal" ? 0 : -1.5}" fill="${textFill}">${escapeXml(input.name)}</text>`,
    `<rect x="24" y="${height - 18}" width="${Math.min(width - 48, input.name.length * 26)}" height="4" fill="${accent}" opacity="${variant === "main" ? 0.85 : 0.5}"/>`,
    `</svg>`,
  ].join("");
}

function lockupSvg(input: IdentityInput, monogram: string, variant: IdentityVariant, font: string, recipe: IdentityRecipe): string {
  const stacked = recipe.lockup === "stacked";
  const height = stacked ? 190 : 120;
  const width = stacked ? 360 : Math.round(Math.max(360, input.name.length * 30 + 180));
  const iconFill = variant === "main" ? input.primary : "none";
  const iconStroke = variant === "main" ? "none" : "currentColor";
  const monoFill = variant === "main" ? input.onPrimary : "currentColor";
  const textFill = variant === "main" ? input.ink : "currentColor";
  const fontFamily = escapeXml(font);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(input.name)} logo">`,
    `<title>${escapeXml(input.name)}</title>`,
    `<rect x="${stacked ? 136 : 16}" y="16" width="88" height="88" rx="${recipe.mark === "circle" ? 44 : recipe.mark === "square" ? 0 : 18}" fill="${iconFill}" stroke="${iconStroke}" stroke-width="${variant === "main" ? 0 : 4}"/>`,
    `<text x="${stacked ? 180 : 60}" y="62" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}" font-size="44" font-weight="600" letter-spacing="-2" fill="${monoFill}">${escapeXml(monogram)}</text>`,
    `<text x="${stacked ? 180 : 132}" y="${stacked ? 142 : height / 2}" text-anchor="${stacked ? "middle" : "start"}" dominant-baseline="middle" font-family="${fontFamily}" font-size="44" font-weight="${recipe.type === "grotesk" ? 700 : 500}" letter-spacing="${recipe.tracking === "wide" ? 1.5 : recipe.tracking === "normal" ? 0 : -1.5}" fill="${textFill}">${escapeXml(input.name)}</text>`,
    `</svg>`,
  ].join("");
}

/** Generate the full identity variant matrix for a brand. */
export function synthesizeIdentity(input: IdentityInput): Identity {
  const font = input.displayFont ?? DEFAULT_FONT;
  const recipe = input.recipe ?? DEFAULT_RECIPE;
  const monogram = monogramFor(input.name);

  const assets: IdentityAsset[] = [
    asset("lockup-main", "Lockup", "lockup", "main", 360, recipe.lockup === "stacked" ? 190 : 120, lockupSvg(input, monogram, "main", font, recipe)),
    asset("lockup-mono", "Lockup (mono)", "lockup", "mono", 360, recipe.lockup === "stacked" ? 190 : 120, lockupSvg(input, monogram, "mono", font, recipe)),
    asset("icon-main", "Icon", "icon", "main", 128, 128, iconSvg(input, monogram, "main", font, recipe)),
    asset("icon-mono", "Icon (mono)", "icon", "mono", 128, 128, iconSvg(input, monogram, "mono", font, recipe)),
    asset("wordmark-main", "Wordmark", "wordmark", "main", 220, 88, wordmarkSvg(input, "main", font, recipe)),
    asset("wordmark-mono", "Wordmark (mono)", "wordmark", "mono", 220, 88, wordmarkSvg(input, "mono", font, recipe))
  ];

  return { monogram, assets };
}

function asset(
  id: string,
  label: string,
  kind: IdentityKind,
  variant: IdentityVariant,
  width: number,
  height: number,
  svg: string,
): IdentityAsset {
  return { id, label, kind, variant, width, height, svg };
}

/** A compact square SVG favicon derived from the icon mark. */
export function faviconSvg(input: IdentityInput): string {
  const monogram = monogramFor(input.name);
  const font = input.displayFont ?? DEFAULT_FONT;
  const fontFamily = escapeXml(font);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${escapeXml(input.name)}">`,
    `<title>${escapeXml(input.name)}</title>`,
    `<rect width="64" height="64" rx="12" fill="${input.primary}"/>`,
    `<text x="32" y="37" text-anchor="middle" dominant-baseline="middle" font-family="${fontFamily}" font-size="34" font-weight="600" letter-spacing="-1" fill="${input.onPrimary}">${escapeXml(monogram)}</text>`,
    `</svg>`,
  ].join("");
}
