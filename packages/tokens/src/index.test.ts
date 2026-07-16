import { describe, expect, it } from "vitest";
import {
  colorHex,
  colorOn,
  dtcgToCss,
  generatePalette,
  isDtcgDocument,
  paletteToDtcg,
  paletteFromHexes,
  readColors,
  readContrast,
} from "./index";

describe("brand tokens", () => {
  it("generates a stable, accessible palette and serializes it as DTCG", () => {
    const palette = generatePalette({ seed: "Etymalia studio" });
    const repeat = generatePalette({ seed: "Etymalia studio" });

    expect(palette).toEqual(repeat);
    expect(palette.colors).toHaveLength(6);
    expect(palette.contrast.every((check) => check.passes)).toBe(true);

    const document = paletteToDtcg(palette);
    expect(isDtcgDocument(document)).toBe(true);
    expect(readColors(document)).toHaveLength(6);
    expect(readContrast(document)).toEqual(palette.contrast);
    expect(colorHex(document, "primary", "#000000")).toBe(palette.colors[0].hex);
    expect(colorOn(document, "primary", "#000000")).toBe(palette.colors[0].onColor);
    expect(dtcgToCss(document)).toContain("--brand-primary:");
  });

  it("uses a fallback for an invalid explicit base color", () => {
    expect(generatePalette({ baseHex: "not-a-color" }).seedHue).toBe(250);
  });

  it("preserves direct semantic color choices and reports their contrast", () => {
    const palette = paletteFromHexes({ primary: "#124e78", accent: "#e8a317" }, "manual direction");

    expect(palette.colors.find((color) => color.role === "primary")?.hex).toBe("#124e78");
    expect(palette.colors.find((color) => color.role === "accent")?.hex).toBe("#e8a317");
    expect(palette.contrast).toHaveLength(6);
  });
});
