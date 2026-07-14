// Converts the curated Etymaria seed corpus (a hand-authored CSV spanning PIE
// through thirteen language layers) into a clean, structured JSON corpus that
// the name engine consumes at runtime. This is a build-time developer tool; it
// is not shipped or imported by the application.
//
//   node scripts/build-corpus.mjs
//
// Re-run whenever the source CSV changes. The output is committed so the
// package has no build step and no CSV parser dependency at runtime.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  here,
  "../../../docs/references/etymology-table/etymology_brand_table - Etymology Source.csv",
);
const OUTPUT = resolve(here, "../src/corpus.json");

/** RFC 4180-style parser: handles quoted fields, embedded commas and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const EMPTY = new Set(["", "—", "-", "–", "n/a", "N/A"]);

function clean(value) {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  return EMPTY.has(trimmed) ? "" : trimmed;
}

// Column order in the source sheet (headers span several physical lines).
const LAYER_COLUMNS = [
  ["protoGermanic", 3],
  ["oldEnglish", 4],
  ["oldNorse", 5],
  ["middleEnglish", 6],
  ["classicalLatin", 7],
  ["vulgarLatin", 8],
  ["ancientGreek", 9],
  ["oldFrench", 10],
  ["sanskrit", 11],
  ["arabic", 12],
  ["persian", 13],
  ["hebrew", 14],
  ["celtic", 15],
];

// Human-readable language labels used in generated provenance notes.
const LAYER_LABELS = {
  pie: "Proto-Indo-European",
  protoGermanic: "Proto-Germanic",
  oldEnglish: "Old English",
  oldNorse: "Old Norse",
  middleEnglish: "Middle English",
  classicalLatin: "Latin",
  vulgarLatin: "Medieval Latin",
  ancientGreek: "Ancient Greek",
  oldFrench: "Old French",
  sanskrit: "Sanskrit",
  arabic: "Arabic",
  persian: "Persian",
  hebrew: "Hebrew",
  celtic: "Celtic",
};

function splitCandidates(value) {
  return clean(value)
    .split(/[·|,/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const rows = parseCsv(await readFile(SOURCE, "utf8"));
// The header occupies the first logical row; every subsequent row is an entry.
const entries = [];
for (const columns of rows.slice(1)) {
  const word = clean(columns[0]);
  if (!word) continue;

  const layers = {};
  const pie = clean(columns[2]);
  if (pie) layers.pie = pie;
  for (const [key, index] of LAYER_COLUMNS) {
    const form = clean(columns[index]);
    if (form) layers[key] = form;
  }

  const syllables = Number.parseInt(clean(columns[19]), 10);

  entries.push({
    word,
    semanticField: clean(columns[1]),
    layers,
    driftNotes: clean(columns[16]),
    candidates: splitCandidates(columns[17]),
    tone: clean(columns[18]),
    syllables: Number.isFinite(syllables) ? syllables : null,
  });
}

const corpus = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  layerLabels: LAYER_LABELS,
  entries,
};

await writeFile(OUTPUT, `${JSON.stringify(corpus, null, 2)}\n`, "utf8");
console.log(`Wrote ${entries.length} corpus entries to ${OUTPUT}`);
