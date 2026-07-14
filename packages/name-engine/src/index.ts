// Etymaria name engine — the product's signature capability.
//
// A deterministic blend-and-score pipeline over the curated cross-linguistic
// corpus. Given a brief's keywords it (1) finds semantically related roots,
// (2) recombines them across language families into novel candidates with real
// provenance, and (3) scores each on meaning fit, pronounceability, brevity,
// and distinctiveness. No randomness: the same brief always yields the same
// ranked set, which keeps results reproducible and testable.

import {
  corpusMeta,
  entries,
  languageLabel,
  toStem,
  type CorpusEntry,
} from "./corpus";
import { estimateSyllables, normalizeLetters, pronounceability } from "./phonetics";

export { corpusMeta } from "./corpus";

export type NameStrategy =
  | "curated"
  | "affixation"
  | "portmanteau"
  | "compound"
  | "truncation";

export interface NameBrief {
  keywords: string[];
  tone?: string[];
  maxSyllables?: number;
  count?: number;
}

export interface NameProvenanceRoot {
  language: string;
  form: string;
  gloss: string;
}

export interface NameProvenance {
  strategy: NameStrategy;
  roots: NameProvenanceRoot[];
  note: string;
  sources: string[];
}

export interface NameScores {
  meaningFit: number;
  pronounceability: number;
  brevity: number;
  distinctiveness: number;
  composite: number;
}

export interface GeneratedName {
  term: string;
  slug: string;
  syllables: number;
  provenance: NameProvenance;
  scores: NameScores;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "with", "in", "on", "at",
  "by", "is", "are", "be", "our", "your", "we", "that", "this", "from", "as",
]);

// Branding-preferred layer order: classical layers read as premium marks.
const LAYER_PRIORITY = [
  "ancientGreek", "classicalLatin", "sanskrit", "oldFrench", "pie",
  "vulgarLatin", "persian", "arabic", "oldNorse", "oldEnglish",
  "middleEnglish", "protoGermanic", "celtic", "hebrew",
];

const SUFFIXES = ["a", "ia", "is", "ion", "or", "ex", "aria", "ova", "eon", "ora", "yx", "ika"];

const CORPUS_WORD_SLUGS = new Set(entries.map((entry) => normalizeLetters(entry.word)));

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function titleCase(slug: string): string {
  return slug ? slug[0].toUpperCase() + slug.slice(1) : slug;
}

function relevance(entry: CorpusEntry, keywordTokens: string[]): number {
  if (!keywordTokens.length) return 0;
  const wordTokens = new Set(tokenize(entry.word));
  const fieldTokens = new Set(tokenize(entry.semanticField));
  const driftTokens = new Set(tokenize(entry.driftNotes));

  let score = 0;
  for (const keyword of keywordTokens) {
    if (wordTokens.has(keyword)) {
      score += 1;
    } else if (fieldTokens.has(keyword)) {
      score += 0.7;
    } else if (driftTokens.has(keyword)) {
      score += 0.35;
    } else if ([...fieldTokens, ...wordTokens].some((token) => stemMatch(token, keyword))) {
      score += 0.4;
    } else if ([...driftTokens].some((token) => stemMatch(token, keyword))) {
      score += 0.2;
    }
  }
  return Math.min(1, score / keywordTokens.length);
}

function stemMatch(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return longer.startsWith(shorter.slice(0, Math.max(4, shorter.length - 2)));
}

/** Generic brandability for the fallback pool when no keyword matches. */
function brandability(entry: CorpusEntry): number {
  const layerCount = Object.keys(entry.layers).length;
  const syllableFit = entry.syllables && entry.syllables >= 2 && entry.syllables <= 3 ? 1 : 0;
  return layerCount + entry.candidates.length * 0.5 + syllableFit;
}

interface RootPick {
  layerKey: string;
  language: string;
  form: string;
  stem: string;
  gloss: string;
}

function rootsFor(entry: CorpusEntry): RootPick[] {
  const picks: RootPick[] = [];
  for (const layerKey of LAYER_PRIORITY) {
    const form = entry.layers[layerKey];
    if (!form) continue;
    const stem = toStem(form);
    if (stem.length < 3) continue;
    picks.push({
      layerKey,
      language: languageLabel(layerKey),
      form,
      stem,
      gloss: entry.semanticField,
    });
  }
  return picks;
}

function onsetHead(stem: string): string {
  return stem.match(/^[^aeiouy]*[aeiouy]+[^aeiouy]?/)?.[0] ?? stem.slice(0, 3);
}

function codaTail(stem: string): string {
  return stem.match(/[^aeiouy]?[aeiouy]+[^aeiouy]*$/)?.[0] ?? stem.slice(-3);
}

/** Collapse a doubled letter or an over-long consonant run at a blend seam. */
function healSeam(left: string, right: string): string {
  let joined = left + right;
  if (left.length && right.length && left[left.length - 1] === right[0]) {
    joined = left + right.slice(1);
  }
  return joined.replace(/([^aeiouy])\1*([^aeiouy])([^aeiouy])/g, "$1$2$3");
}

function bestSuffix(stem: string): string {
  let best = SUFFIXES[0];
  let bestScore = -1;
  for (const suffix of SUFFIXES) {
    // Avoid stacking identical vowels at the seam ("aura" + "a").
    if (stem.endsWith(suffix[0]) && /[aeiouy]/.test(suffix[0])) continue;
    const candidate = stem + suffix;
    const syllables = estimateSyllables(candidate);
    const score = pronounceability(candidate) - Math.abs(2.5 - syllables) * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = suffix;
    }
  }
  return best;
}

function brevity(slug: string, syllables: number): number {
  const length = slug.length;
  const lengthScore = length >= 4 && length <= 9
    ? 1
    : Math.max(0, 1 - Math.abs(length - 6.5) / 6);
  const syllableScore = syllables >= 2 && syllables <= 3
    ? 1
    : syllables === 1 || syllables === 4
      ? 0.7
      : Math.max(0, 1 - Math.abs(syllables - 2.5) / 3);
  return lengthScore * 0.5 + syllableScore * 0.5;
}

function distinctiveness(slug: string, strategy: NameStrategy, sourceSlugs: string[]): number {
  if (CORPUS_WORD_SLUGS.has(slug) || sourceSlugs.includes(slug)) return 0.35;
  if (strategy === "curated") return 0.82;
  if (strategy === "truncation") return 0.78;
  return 0.92;
}

function compositeScore(scores: Omit<NameScores, "composite">): number {
  const floor = (value: number) => Math.max(0.05, value);
  return (
    floor(scores.meaningFit) ** 0.35 *
    floor(scores.pronounceability) ** 0.3 *
    floor(scores.brevity) ** 0.2 *
    floor(scores.distinctiveness) ** 0.15
  );
}

function makeName(
  slug: string,
  strategy: NameStrategy,
  roots: NameProvenanceRoot[],
  note: string,
  sources: string[],
  meaningFit: number,
): GeneratedName | null {
  const clean = normalizeLetters(slug);
  if (clean.length < 3 || clean.length > 14) return null;

  const syllables = estimateSyllables(clean);
  const sourceSlugs = sources.map(normalizeLetters);
  const partial = {
    meaningFit,
    pronounceability: pronounceability(clean),
    brevity: brevity(clean, syllables),
    distinctiveness: distinctiveness(clean, strategy, sourceSlugs),
  };
  if (partial.pronounceability < 0.28) return null;

  return {
    term: titleCase(clean),
    slug: clean,
    syllables,
    provenance: { strategy, roots, note, sources },
    scores: { ...partial, composite: compositeScore(partial) },
  };
}

function round(scores: NameScores): NameScores {
  const to2 = (value: number) => Math.round(value * 100) / 100;
  return {
    meaningFit: to2(scores.meaningFit),
    pronounceability: to2(scores.pronounceability),
    brevity: to2(scores.brevity),
    distinctiveness: to2(scores.distinctiveness),
    composite: to2(scores.composite),
  };
}

/**
 * Generate a ranked set of brand-name candidates for a brief. Deterministic:
 * identical input yields identical output.
 */
export function generateNames(brief: NameBrief): GeneratedName[] {
  const keywordTokens = [...new Set(brief.keywords.flatMap(tokenize))];
  const maxSyllables = brief.maxSyllables ?? 4;
  const count = Math.max(1, Math.min(brief.count ?? 12, 40));

  const ranked = entries
    .map((entry) => ({ entry, score: relevance(entry, keywordTokens) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);

  const pool = ranked.length
    ? ranked.slice(0, 16)
    : [...entries]
        .sort((left, right) => brandability(right) - brandability(left))
        .slice(0, 12)
        .map((entry) => ({ entry, score: 0.4 }));

  const results = new Map<string, GeneratedName>();
  const add = (name: GeneratedName | null) => {
    if (!name) return;
    const existing = results.get(name.slug);
    if (!existing || name.scores.composite > existing.scores.composite) {
      results.set(name.slug, name);
    }
  };

  // Single-root strategies: curated marks, affixation, truncation.
  for (const { entry, score } of pool) {
    for (const candidate of entry.candidates) {
      const primary = rootsFor(entry)[0];
      add(makeName(
        candidate,
        "curated",
        primary ? [{ language: primary.language, form: primary.form, gloss: primary.gloss }] : [],
        `Hand-picked mark for ${entry.semanticField.toLowerCase()}` +
          (primary ? `, rooted in ${primary.language} ${primary.form}.` : "."),
        [entry.word],
        Math.max(score, 0.6),
      ));
    }

    const [root] = rootsFor(entry);
    if (root) {
      const suffix = bestSuffix(root.stem);
      add(makeName(
        root.stem + suffix,
        "affixation",
        [{ language: root.language, form: root.form, gloss: root.gloss }],
        `From ${root.language} ${root.form} '${root.gloss.toLowerCase()}' + -${suffix}.`,
        [entry.word],
        score,
      ));

      if (root.stem.length >= 6) {
        const truncated = onsetHead(root.stem) + codaTail(root.stem.slice(onsetHead(root.stem).length));
        add(makeName(
          truncated,
          "truncation",
          [{ language: root.language, form: root.form, gloss: root.gloss }],
          `A shortened form of ${root.language} ${root.form} '${root.gloss.toLowerCase()}'.`,
          [entry.word],
          score,
        ));
      }
    }
  }

  // Cross-family blends: recombine roots from two different source entries.
  const blendPool = pool.slice(0, 9);
  for (let i = 0; i < blendPool.length; i += 1) {
    for (let j = i + 1; j < blendPool.length; j += 1) {
      const a = blendPool[i];
      const b = blendPool[j];
      const [rootA] = rootsFor(a.entry);
      const [rootB] = rootsFor(b.entry);
      if (!rootA || !rootB) continue;

      const meaningFit = (a.score + b.score) / 2;
      const roots = [
        { language: rootA.language, form: rootA.form, gloss: rootA.gloss },
        { language: rootB.language, form: rootB.form, gloss: rootB.gloss },
      ];
      const sources = [a.entry.word, b.entry.word];

      add(makeName(
        healSeam(onsetHead(rootA.stem), codaTail(rootB.stem)),
        "portmanteau",
        roots,
        `A blend of ${rootA.language} ${rootA.form} '${rootA.gloss.toLowerCase()}' ` +
          `and ${rootB.language} ${rootB.form} '${rootB.gloss.toLowerCase()}'.`,
        sources,
        meaningFit,
      ));

      add(makeName(
        healSeam(rootA.stem.slice(0, 5), rootB.stem.slice(0, 5)),
        "compound",
        roots,
        `A compound of ${rootA.language} ${rootA.form} '${rootA.gloss.toLowerCase()}' ` +
          `and ${rootB.language} ${rootB.form} '${rootB.gloss.toLowerCase()}'.`,
        sources,
        meaningFit,
      ));
    }
  }

  return [...results.values()]
    .filter((name) => name.syllables <= maxSyllables)
    .sort((left, right) => right.scores.composite - left.scores.composite)
    .slice(0, count)
    .map((name) => ({ ...name, scores: round(name.scores) }));
}
