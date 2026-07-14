// OKLCH-based brand palette generation with guaranteed WCAG contrast.
//
// culori is authored by CSS WG editors and gives us perceptually-uniform OKLCH
// manipulation plus WCAG 2.2 contrast checking. Palettes are generated in OKLCH
// (uniform lightness/chroma), gamut-clamped to sRGB, then verified and nudged
// until foreground/background pairings meet accessibility thresholds.

import { clampChroma, formatHex, oklch, wcagContrast } from "culori";

export type ColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "paper"
  | "muted";

export interface PaletteColor {
  role: ColorRole;
  name: string;
  hex: string;
  oklch: string;
  onColor: string;
}

export interface ContrastCheck {
  pair: string;
  ratio: number;
  threshold: number;
  passes: boolean;
  level: "AA" | "AA-large";
}

export interface BrandPalette {
  seedHue: number;
  colors: PaletteColor[];
  contrast: ContrastCheck[];
}

export interface PaletteInput {
  /** A stable string (e.g. brand name + keywords) used to derive the hue. */
  seed?: string;
  /** Explicit base color; overrides the seed-derived hue when provided. */
  baseHex?: string;
}

interface Oklch {
  mode: "oklch";
  l: number;
  c: number;
  h: number;
}

const AA_BODY = 4.5;
const AA_LARGE = 3;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

/** Deterministic string hash -> hue in [0, 360). */
function hueFromSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 360);
}

function toHex(color: Oklch): string {
  return formatHex(clampChroma(color, "oklch")) ?? "#000000";
}

function oklchString(color: Oklch): string {
  const l = Math.round(color.l * 1000) / 10;
  const c = Math.round(color.c * 1000) / 1000;
  const h = Math.round(color.h * 10) / 10;
  return `oklch(${l}% ${c} ${h})`;
}

function contrast(a: string, b: string): number {
  return Math.round(wcagContrast(a, b) * 100) / 100;
}

/** Nudge lightness until the color meets a contrast target against a background. */
function ensureContrast(color: Oklch, backgroundHex: string, target: number, direction: -1 | 1): Oklch {
  let adjusted = { ...color };
  for (let i = 0; i < 50; i += 1) {
    if (contrast(toHex(adjusted), backgroundHex) >= target) break;
    adjusted = { ...adjusted, l: clamp(adjusted.l + direction * 0.02) };
  }
  return adjusted;
}

/**
 * Deepen a surface color until a readable label (ink or paper, whichever is
 * stronger) clears the contrast target on it. Used for button-like surfaces so
 * their label text is guaranteed accessible.
 */
function ensureReadableLabel(color: Oklch, inkHex: string, paperHex: string, target: number): Oklch {
  let adjusted = { ...color };
  for (let i = 0; i < 50; i += 1) {
    const surface = toHex(adjusted);
    if (Math.max(contrast(inkHex, surface), contrast(paperHex, surface)) >= target) break;
    adjusted = { ...adjusted, l: clamp(adjusted.l - 0.02) };
  }
  return adjusted;
}

/** Choose ink or paper as the readable foreground for a given surface. */
function bestOn(surfaceHex: string, inkHex: string, paperHex: string): string {
  return contrast(inkHex, surfaceHex) >= contrast(paperHex, surfaceHex) ? inkHex : paperHex;
}

export function generatePalette(input: PaletteInput = {}): BrandPalette {
  const seedHue = input.baseHex
    ? extractHue(input.baseHex)
    : hueFromSeed(input.seed?.trim() || "etymalia");

  const primaryBase: Oklch = { mode: "oklch", l: 0.55, c: 0.14, h: seedHue };
  const secondaryBase: Oklch = { mode: "oklch", l: 0.62, c: 0.1, h: (seedHue + 32) % 360 };
  const accentBase: Oklch = { mode: "oklch", l: 0.72, c: 0.15, h: (seedHue + 190) % 360 };

  let ink: Oklch = { mode: "oklch", l: 0.22, c: 0.02, h: seedHue };
  const paper: Oklch = { mode: "oklch", l: 0.97, c: 0.008, h: seedHue };
  const muted: Oklch = { mode: "oklch", l: 0.52, c: 0.015, h: seedHue };

  const paperHex = toHex(paper);
  // Body text must clear AA against paper; deepen ink until it does.
  ink = ensureContrast(ink, paperHex, AA_BODY, -1);
  const inkHex = toHex(ink);

  // Colored surfaces (primary, accent) act as buttons: guarantee a readable
  // label on them at AA body. Large-text/support roles clear AA-large on paper.
  const primary = ensureReadableLabel(
    ensureContrast(primaryBase, paperHex, AA_LARGE, -1),
    inkHex,
    paperHex,
    AA_BODY,
  );
  const accent = ensureReadableLabel(accentBase, inkHex, paperHex, AA_BODY);
  const secondary = ensureContrast(secondaryBase, paperHex, AA_LARGE, -1);
  const mutedFixed = ensureContrast(muted, paperHex, AA_LARGE, -1);

  const primaryHex = toHex(primary);
  const secondaryHex = toHex(secondary);
  const accentHex = toHex(accent);
  const mutedHex = toHex(mutedFixed);

  const colors: PaletteColor[] = [
    color("primary", "Primary", primary, bestOn(primaryHex, inkHex, paperHex)),
    color("secondary", "Secondary", secondary, bestOn(secondaryHex, inkHex, paperHex)),
    color("accent", "Accent", accent, bestOn(accentHex, inkHex, paperHex)),
    color("ink", "Ink", ink, paperHex),
    color("paper", "Paper", paper, inkHex),
    color("muted", "Muted", mutedFixed, paperHex),
  ];

  const checks: ContrastCheck[] = [
    check("Ink on Paper", inkHex, paperHex, AA_BODY, "AA"),
    check("Primary on Paper", primaryHex, paperHex, AA_LARGE, "AA-large"),
    check("Secondary on Paper", secondaryHex, paperHex, AA_LARGE, "AA-large"),
    check("Muted on Paper", mutedHex, paperHex, AA_LARGE, "AA-large"),
    check("On-Primary on Primary", bestOn(primaryHex, inkHex, paperHex), primaryHex, AA_BODY, "AA"),
    check("On-Accent on Accent", bestOn(accentHex, inkHex, paperHex), accentHex, AA_BODY, "AA"),
  ];

  return { seedHue, colors, contrast: checks };
}

function color(role: ColorRole, name: string, value: Oklch, onColor: string): PaletteColor {
  return { role, name, hex: toHex(value), oklch: oklchString(value), onColor };
}

function check(pair: string, fg: string, bg: string, threshold: number, level: ContrastCheck["level"]): ContrastCheck {
  const ratio = contrast(fg, bg);
  return { pair, ratio, threshold, passes: ratio >= threshold, level };
}

function extractHue(baseHex: string): number {
  const parsed = oklch(baseHex);
  return parsed?.h ?? 250;
}
