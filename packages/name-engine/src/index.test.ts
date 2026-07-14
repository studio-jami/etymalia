import { describe, expect, it } from "vitest";
import { corpusMeta, generateNames } from "./index";

describe("name generation", () => {
  it("returns a deterministic, ranked set with provenance", () => {
    const brief = { keywords: ["light", "craft"], count: 8, maxSyllables: 4 };
    const names = generateNames(brief);

    expect(names).toEqual(generateNames(brief));
    expect(names).toHaveLength(8);
    expect(names.every((name) => name.syllables <= 4)).toBe(true);
    expect(names.every((name) => name.provenance.roots.length > 0)).toBe(true);
    expect(names.map((name) => name.scores.composite)).toEqual(
      [...names.map((name) => name.scores.composite)].sort((left, right) => right - left),
    );
  });

  it("falls back to a bounded result set when keywords have no corpus match", () => {
    const names = generateNames({ keywords: ["qzxwvu"], count: 100 });

    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThanOrEqual(40);
    expect(corpusMeta.entryCount).toBeGreaterThan(0);
  });
});
