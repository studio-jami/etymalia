import { describe, expect, it } from "vitest";
import { faviconSvg, monogramFor, synthesizeIdentity } from "./index";

const input = {
  name: 'North & "Co"',
  primary: "#123456",
  accent: "#abcdef",
  ink: "#111111",
  paper: "#ffffff",
  onPrimary: "#ffffff",
};

describe("identity synthesis", () => {
  it("derives concise monograms from normalized names", () => {
    expect(monogramFor("North Star")).toBe("NS");
    expect(monogramFor("etymalia")).toBe("ET");
    expect(monogramFor("   ")).toBe("E");
  });

  it("produces the complete, escaped SVG asset matrix", () => {
    const identity = synthesizeIdentity(input);

    expect(identity.monogram).toBe("N&");
    expect(identity.assets.map((asset) => asset.id)).toEqual([
      "lockup-main", "lockup-mono", "icon-main", "icon-mono", "wordmark-main", "wordmark-mono",
    ]);
    expect(identity.assets.every((asset) => asset.svg.startsWith("<svg"))).toBe(true);
    expect(identity.assets.find((asset) => asset.id === "icon-mono")?.svg).toContain("currentColor");
    expect(identity.assets.find((asset) => asset.id === "wordmark-main")?.svg).toContain("North &amp; &quot;Co&quot;");
    expect(faviconSvg(input)).toContain("North &amp; &quot;Co&quot;");
  });
});
