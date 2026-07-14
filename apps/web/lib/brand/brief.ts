// Brand brief parsing and serialization. The brief lives in the `brands.brief`
// JSONB column and drives naming and palette generation. Kept dependency-free
// (no zod in the web app) with defensive parsing for both form input and
// database values.

export interface BrandBriefData {
  description: string;
  industry: string;
  audience: string;
  keywords: string[];
  tone: string[];
}

export const EMPTY_BRIEF: BrandBriefData = {
  description: "",
  industry: "",
  audience: "",
  keywords: [],
  tone: [],
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "with", "in", "on", "at",
  "by", "is", "are", "be", "our", "your", "we", "that", "this", "from", "as",
]);

function text(value: unknown, maximum: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

function list(value: unknown, maxItems: number, maxLength: number): string[] {
  const raw = Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : ""))
    : typeof value === "string"
      ? value.split(/[,\n]/)
      : [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const clean = item.replace(/\s+/g, " ").trim().slice(0, maxLength);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
    if (result.length >= maxItems) break;
  }
  return result;
}

/** Parse the JSONB value stored in `brands.brief`. */
export function parseBriefRecord(value: unknown): BrandBriefData {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    description: text(record.description, 2000),
    industry: text(record.industry, 160),
    audience: text(record.audience, 500),
    keywords: list(record.keywords, 12, 80),
    tone: list(record.tone, 8, 80),
  };
}

/** Parse and validate a submitted brief form. */
export function parseBriefForm(formData: FormData): BrandBriefData {
  return {
    description: text(formData.get("description"), 2000),
    industry: text(formData.get("industry"), 160),
    audience: text(formData.get("audience"), 500),
    keywords: list(formData.get("keywords"), 12, 80),
    tone: list(formData.get("tone"), 8, 80),
  };
}

export function briefIsUsable(brief: BrandBriefData): boolean {
  return brief.keywords.length > 0 || brief.description.length >= 12;
}

/** Keywords for the name engine: explicit keywords, else salient description words. */
export function briefKeywords(brief: BrandBriefData): string[] {
  if (brief.keywords.length) return brief.keywords;
  return [...new Set(
    brief.description
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3 && !STOPWORDS.has(token)),
  )].slice(0, 8);
}

/** A stable seed string for deterministic palette generation. */
export function paletteSeed(brandName: string, brief: BrandBriefData): string {
  return [brandName, brief.industry, ...brief.keywords, ...brief.tone]
    .filter(Boolean)
    .join(" ")
    .toLowerCase() || brandName || "etymalia";
}
