import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildBrandKit } from "./index";

describe("brand kit export", () => {
  it("creates a named ZIP with a sorted manifest and expected contents", () => {
    const output = buildBrandKit({
      brandName: "Etymalia",
      slug: "etymalia",
      generatedAt: "2026-07-14T00:00:00.000Z",
      logos: [{ filename: "main.svg", label: "Main", svg: "<svg />" }],
      faviconSvg: "<svg />",
      webManifest: { name: "Etymalia" },
      headSnippet: "<link rel=\"icon\">",
      tokensJson: { color: {} },
      tokensCss: ":root {}",
      names: [],
      palette: [{ role: "primary", hex: "#123456", oklch: "oklch(50% 0.1 200)" }],
    });

    expect(output.filename).toBe("etymalia-kit.zip");
    expect(output.manifest.files).toEqual([...output.manifest.files].sort());

    const files = unzipSync(output.bytes);
    expect(Object.keys(files).sort()).toEqual([...output.manifest.files, "manifest.json"].sort());
    expect(strFromU8(files["README.md"])).toContain("# Etymalia — Brand Kit");
    expect(JSON.parse(strFromU8(files["manifest.json"]))).toEqual(output.manifest);
  });
});
