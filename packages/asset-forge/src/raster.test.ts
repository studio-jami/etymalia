import { describe, expect, it } from "vitest";
import { pngFilename, rasterizeSvg, renderIdentityPngDerivatives, renderPngDerivatives, safeFilenameStem } from "./raster";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><rect width="40" height="20" fill="#123456"/></svg>';
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

describe("raster utilities", () => {
  it("renders deterministic in-memory PNG derivatives with safe filenames", () => {
    const derivatives = renderPngDerivatives(svg, 'North & "Co"', [80, 40, 80]);

    expect(derivatives.map((asset) => asset.filename)).toEqual([
      "north-co-40x20.png",
      "north-co-80x40.png",
    ]);
    expect([...derivatives[0].png.slice(0, 8)]).toEqual(pngSignature);
    expect(derivatives[1]).toMatchObject({ width: 80, height: 40, contentType: "image/png", source: "resvg" });
  });

  it("preserves stored identity asset IDs in derivative metadata", () => {
    const derivatives = renderIdentityPngDerivatives([{ id: "icon-main", svg }], [32]);

    expect(derivatives).toHaveLength(1);
    expect(derivatives[0]).toMatchObject({
      filename: "icon-main-32x16.png",
      sourceAssetId: "icon-main",
      width: 32,
      height: 16,
    });
  });

  it("validates dimensions and prevents aspect-ratio distortion", () => {
    expect(() => rasterizeSvg(svg, { width: 80, height: 80 })).toThrow(/aspect ratio/);
    expect(() => rasterizeSvg("not svg", { width: 32 })).toThrow(/SVG document/);
    expect(pngFilename("../../unsafe", 16, 16)).toBe("unsafe-16x16.png");
    expect(safeFilenameStem("  Déjà vu!  ")).toBe("deja-vu");
  });
});
