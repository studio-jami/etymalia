import { describe, expect, it } from "vitest";
import {
  BrandBriefSchema,
  CredentialResolver,
  type CredentialStore,
  LiveProviderModelCatalog,
} from "./index.js";

describe("AI package boundaries", () => {
  it("resolves credentials only for the requested provider and valid context", async () => {
    const store: CredentialStore = {
      getSource: async () => ({ type: "apiKey", provider: "google", apiKey: "test-key" }),
    };
    const resolver = new CredentialResolver(store);

    await expect(resolver.resolve({ lane: "studio", provider: "google" })).resolves.toEqual({
      provider: "google",
      apiKey: "test-key",
    });
    await expect(resolver.resolve({ lane: "prod", provider: "google" })).rejects.toThrow("user ID");
  });

  it("validates briefs and selects the most suitable discovered model", async () => {
    const resolver = new CredentialResolver({
      getSource: async () => ({ type: "apiKey", provider: "google", apiKey: "test-key" }),
    });
    const catalog = new LiveProviderModelCatalog(resolver, {
      fetch: async () => new Response(JSON.stringify({
        models: [
          { name: "models/gemini-2.0", version: "2.0", outputTokenLimit: 8192, supportedGenerationMethods: ["generateContent"] },
          { name: "models/gemini-2.5", version: "2.5", outputTokenLimit: 4096, supportedGenerationMethods: ["generateContent"], thinking: true },
        ],
      })),
    });

    const model = await catalog.select(
      { lane: "studio", userId: "vitest-model-selection" },
      { provider: "google", requiredActions: ["generateContent"], preferThinking: true },
    );

    expect(model.id).toBe("gemini-2.5");
    expect(BrandBriefSchema.parse({ description: "A studio", industry: "Design", keywords: ["language"] }).tone).toEqual([]);
    expect(() => BrandBriefSchema.parse({ description: "", industry: "Design", keywords: [] })).toThrow();
  });
});
