import { describe, expect, it } from "vitest";
import { createFaviconSet } from "./favicon";

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#123456"/></svg>';
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

describe("favicon artifacts", () => {
  it("builds a standards-ready in-memory artifact set", () => {
    const set = createFaviconSet(svg, {
      name: "North & Co",
      shortName: "North",
      themeColor: "#123456",
      backgroundColor: "#FFFFFF",
    });

    expect(set.artifacts.map((artifact) => artifact.filename)).toEqual([
      "favicon.svg",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "favicon-48x48.png",
      "apple-touch-icon.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
      "favicon.ico",
      "site.webmanifest",
    ]);
    expect([...set.artifacts[1].data.slice(0, 8)]).toEqual(pngSignature);
    expect([...set.artifacts[7].data.slice(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    expect(set.metadata).toMatchObject({
      name: "North & Co",
      short_name: "North",
      theme_color: "#123456",
      background_color: "#ffffff",
      display: "standalone",
    });
    expect(JSON.parse(set.manifest)).toEqual(set.metadata);
  });

  it("rejects unsafe metadata", () => {
    expect(() => createFaviconSet(svg, { name: "unsafe\nname" })).toThrow(/control characters/);
    expect(() => createFaviconSet(svg, { themeColor: "red" })).toThrow(/hex color/);
  });
});
