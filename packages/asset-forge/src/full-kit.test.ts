import { describe, expect, it } from "vitest";
import { renderFullKit, selectFullKitArtifacts } from "./full-kit";

const input = {
  name: "Northwind Studio",
  tagline: "A considered practice",
  primary: "#315d7c",
  accent: "#8fb8d3",
  ink: "#182028",
  paper: "#f3f1eb",
  onPrimary: "#ffffff",
};

describe("full-kit rendering", () => {
  it("returns the complete deterministic artifact matrix in memory", async () => {
    const artifacts = await renderFullKit(input);

    expect(artifacts).toHaveLength(45);
    expect(artifacts.filter((artifact) => artifact.category === "social")).toHaveLength(12);
    expect(artifacts.filter((artifact) => artifact.category === "logo" && artifact.format === "svg")).toHaveLength(6);
    expect(artifacts.filter((artifact) => artifact.category === "logo" && artifact.format === "png")).toHaveLength(18);
    expect(artifacts.filter((artifact) => artifact.category === "favicon")).toHaveLength(9);
    expect(artifacts.every((artifact) => artifact.filename && artifact.data.length > 0)).toBe(true);
    expect(artifacts.find((artifact) => artifact.filename === "lockup-main.svg")?.meta).toMatchObject({
      source: "deterministic-svg",
      sourceAssetId: "lockup-main",
    });
    expect(artifacts.find((artifact) => artifact.filename === "favicon.ico")?.contentType).toBe("image/x-icon");
  }, 15_000);

  it("selects only a requested collection", async () => {
    const selected = selectFullKitArtifacts(await renderFullKit(input), [{ kind: "favicon" }]);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((artifact) => artifact.category === "favicon")).toBe(true);
  }, 15_000);
});
