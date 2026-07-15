// DTCG (Design Tokens Community Group) serialization. The brand_tokens row
// stores this document as the single regenerable source of truth for a brand's
// color system; downstream tooling can transform it into delivery-specific formats.

import type { BrandPalette, ContrastCheck, PaletteColor } from "./palette";

const NAMESPACE = "studio.jami.etymalia";

export interface DtcgToken {
  $type: "color";
  $value: string;
  $description?: string;
  $extensions: Record<string, { oklch: string; role: string; on: string }>;
}

interface DocumentExtension {
  version: number;
  seedHue: number;
  generatedAt: string;
  contrast: ContrastCheck[];
}

export interface DtcgDocument {
  $description: string;
  $extensions: Record<string, DocumentExtension>;
  color: Record<string, DtcgToken>;
}

export function paletteToDtcg(palette: BrandPalette): DtcgDocument {
  const color: Record<string, DtcgToken> = {};
  for (const entry of palette.colors) {
    color[entry.role] = tokenFor(entry);
  }
  return {
    $description: "Etymalia brand color tokens",
    $extensions: {
      [NAMESPACE]: {
        version: 1,
        seedHue: palette.seedHue,
        generatedAt: new Date().toISOString().slice(0, 10),
        contrast: palette.contrast,
      },
    },
    color,
  };
}

function tokenFor(entry: PaletteColor): DtcgToken {
  return {
    $type: "color",
    $value: entry.hex,
    $description: entry.name,
    $extensions: {
      [NAMESPACE]: { oklch: entry.oklch, role: entry.role, on: entry.onColor },
    },
  };
}

/** Render the DTCG color tokens as CSS custom properties. */
export function dtcgToCss(document: DtcgDocument): string {
  const lines = Object.entries(document.color).flatMap(([name, token]) => {
    const on = token.$extensions[NAMESPACE]?.on;
    const rules = [`  --brand-${name}: ${token.$value};`];
    if (on) rules.push(`  --brand-${name}-on: ${on};`);
    return rules;
  });
  return `:root {\n${lines.join("\n")}\n}\n`;
}

/** Narrow unknown JSON (e.g. from the database) to a DtcgDocument, if valid. */
export function isDtcgDocument(value: unknown): value is DtcgDocument {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { color?: unknown };
  return Boolean(candidate.color && typeof candidate.color === "object");
}

export interface ColorReadout {
  role: string;
  hex: string;
  oklch: string;
  on: string;
}

/** Read the color roles out of a DTCG document for rendering/derivation. */
export function readColors(document: DtcgDocument): ColorReadout[] {
  return Object.entries(document.color).map(([role, token]) => ({
    role,
    hex: token.$value,
    oklch: token.$extensions[NAMESPACE]?.oklch ?? "",
    on: token.$extensions[NAMESPACE]?.on ?? "#000000",
  }));
}

/** Look up a single role's hex, with a fallback. */
export function colorHex(document: DtcgDocument, role: string, fallback: string): string {
  return document.color[role]?.$value ?? fallback;
}

/** Look up the readable on-color for a role, with a fallback. */
export function colorOn(document: DtcgDocument, role: string, fallback: string): string {
  return document.color[role]?.$extensions[NAMESPACE]?.on ?? fallback;
}

/** The contrast report captured when the palette was generated. */
export function readContrast(document: DtcgDocument): ContrastCheck[] {
  return document.$extensions[NAMESPACE]?.contrast ?? [];
}
