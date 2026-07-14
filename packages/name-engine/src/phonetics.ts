// Deterministic phonetic heuristics for scoring generated names. These are
// intentionally lightweight (no CMUdict dependency yet) but tuned to reward
// pronounceable, brandable forms and penalise unpronounceable consonant runs.

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);
const SOFT_ENDINGS = new Set(["a", "e", "o", "i", "n", "r", "s", "l", "x"]);

/** Reduce a term to comparable lowercase Latin letters for scoring. */
export function normalizeLetters(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "");
}

/** Estimate syllables by counting maximal vowel groups. */
export function estimateSyllables(term: string): number {
  const letters = normalizeLetters(term);
  if (!letters) return 0;
  const groups = letters.match(/[aeiouy]+/g)?.length ?? 0;
  // A trailing silent "e" (e.g. "lume") rarely adds a syllable.
  const adjusted = /[^aeiouy]e$/.test(letters) ? groups - 1 : groups;
  return Math.max(1, adjusted);
}

/**
 * Score how pronounceable a term is on a 0..1 scale. Rewards vowel/consonant
 * alternation and gentle endings; penalises hard consonant clusters and forms
 * with too few or too many vowels.
 */
export function pronounceability(term: string): number {
  const letters = normalizeLetters(term);
  if (letters.length < 2) return 0;

  let vowels = 0;
  let run = 0;
  let clusterPenalty = 0;
  for (const char of letters) {
    if (VOWELS.has(char)) {
      vowels += 1;
      run = 0;
    } else {
      run += 1;
      if (run >= 3) clusterPenalty += 0.28;
      else if (run === 2) clusterPenalty += 0.06;
    }
  }

  const vowelRatio = vowels / letters.length;
  // Ideal vowel ratio sits around 0.45; fall off smoothly on either side.
  const ratioScore = 1 - Math.min(1, Math.abs(vowelRatio - 0.45) / 0.4);
  const endingScore = SOFT_ENDINGS.has(letters[letters.length - 1]) ? 1 : 0.7;
  const noVowelPenalty = vowels === 0 ? 1 : 0;

  const raw =
    ratioScore * 0.6 +
    endingScore * 0.4 -
    clusterPenalty -
    noVowelPenalty;

  return Math.max(0, Math.min(1, raw));
}
