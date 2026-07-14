// Domain availability via RDAP — IANA's standardized WHOIS successor. RDAP
// returns structured JSON and is mandated for gTLDs, so it needs no API key.
// We query rdap.org, which bootstraps to the authoritative registry server.
//
// Social-handle and SEO availability are deliberately out of scope here; they
// carry ToS constraints and are gated to a later phase (see master plan §6.3).

export type DomainStatus = "available" | "registered" | "unknown";

export interface DomainAvailability {
  domain: string;
  status: DomainStatus;
  source: "rdap";
  checkedAt: string;
  registeredOn?: string;
}

export interface AvailabilityOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const RDAP_BASE = "https://rdap.org/domain/";
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/** Build a punycode-safe domain from a name slug and a TLD. */
export function toDomain(slug: string, tld: string): string {
  const label = slug.toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]/g, "");
  const extension = tld.replace(/^\./, "").toLowerCase();
  return `${label}.${extension}`;
}

function isQueryable(domain: string): boolean {
  const parts = domain.split(".");
  return parts.length >= 2 && parts.every((part) => LABEL.test(part));
}

function registrationDate(body: unknown): string | undefined {
  const events = (body as { events?: Array<{ eventAction?: string; eventDate?: string }> }).events;
  return events?.find((event) => event.eventAction === "registration")?.eventDate;
}

/**
 * Check a single domain. Never throws for network/registry issues — an
 * unreachable or rate-limited registry yields `status: "unknown"`.
 */
export async function checkDomainAvailability(
  domain: string,
  options: AvailabilityOptions = {},
): Promise<DomainAvailability> {
  const checkedAt = new Date().toISOString();
  const base: DomainAvailability = { domain, status: "unknown", source: "rdap", checkedAt };

  if (!isQueryable(domain)) return base;

  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const response = await doFetch(`${RDAP_BASE}${encodeURIComponent(domain)}`, {
      headers: { accept: "application/rdap+json" },
      signal: controller.signal,
      redirect: "follow",
    });

    if (response.status === 404) {
      return { ...base, status: "available" };
    }
    if (response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ...base, status: "registered", registeredOn: registrationDate(body) };
    }
    return base;
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}

/** Check one slug across several TLDs, sequentially to respect rate limits. */
export async function checkDomains(
  slug: string,
  tlds: string[],
  options: AvailabilityOptions = {},
): Promise<DomainAvailability[]> {
  const results: DomainAvailability[] = [];
  for (const tld of tlds) {
    results.push(await checkDomainAvailability(toDomain(slug, tld), options));
  }
  return results;
}
