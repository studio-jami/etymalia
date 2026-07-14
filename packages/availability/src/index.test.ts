import { describe, expect, it, vi } from "vitest";
import { checkDomainAvailability, checkDomains, toDomain } from "./index";

describe("domain availability", () => {
  it("normalizes domain components", () => {
    expect(toDomain("Café Studio!", ".COM")).toBe("cafestudio.com");
  });

  it("maps RDAP responses while leaving malformed domains unqueried", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ events: [{ eventAction: "registration", eventDate: "2020-01-01" }] })));

    await expect(checkDomainAvailability("open.example", { fetch })).resolves.toMatchObject({ status: "available" });
    await expect(checkDomainAvailability("taken.example", { fetch })).resolves.toMatchObject({
      status: "registered",
      registeredOn: "2020-01-01",
    });
    await expect(checkDomainAvailability("not a domain", { fetch })).resolves.toMatchObject({ status: "unknown" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("checks TLDs in order", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(null, { status: 404 }));

    const results = await checkDomains("etymalia", ["com", "studio"], { fetch });

    expect(results.map((result) => result.domain)).toEqual(["etymalia.com", "etymalia.studio"]);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://rdap.org/domain/etymalia.com",
      "https://rdap.org/domain/etymalia.studio",
    ]);
  });
});
