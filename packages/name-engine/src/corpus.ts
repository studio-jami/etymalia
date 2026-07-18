import corpusData from "./corpus.json";

export interface CorpusEntry {
  word: string;
  semanticField: string;
  layers: Record<string, string>;
  driftNotes: string;
  candidates: string[];
  tone: string;
  syllables: number | null;
}

interface CorpusFile {
  version: number;
  generatedAt: string;
  layerLabels: Record<string, string>;
  entries: CorpusEntry[];
  source?: { rowCount: number; populatedLanguageCells: number; curatedCandidateCount: number; sha256: string };
}

const corpus = corpusData as unknown as CorpusFile;

export const layerLabels = corpus.layerLabels;
export const entries: readonly CorpusEntry[] = corpus.entries;

export const corpusMeta = {
  version: corpus.version,
  generatedAt: corpus.generatedAt,
  entryCount: corpus.entries.length,
  languageFormCount: corpus.source?.populatedLanguageCells ?? 0,
  curatedCandidateCount: corpus.source?.curatedCandidateCount ?? 0,
  sourceSha256: corpus.source?.sha256 ?? "",
} as const;

/** Human-readable language label for a corpus layer key. */
export function languageLabel(layerKey: string): string {
  return layerLabels[layerKey] ?? layerKey;
}

/**
 * Extract a blendable Latin-script stem from a corpus layer form such as
 * "perisseia (περισσεία)" -> "perisseia" or "al-kīmiyā (الكيمياء)" -> "alkimiya".
 */
export function toStem(form: string): string {
  const latin = form.split("(")[0] ?? form;
  return latin
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "");
}
