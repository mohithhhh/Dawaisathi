// Jan Aushadhi (PMBJP) generic-medicine matcher.
//
// Purpose: given a medicine name extracted via OCR (often a brand name, or a
// generic name with inconsistent formatting/typos), find the closest match
// in the official PMBJP price list so the app can surface the government
// generic price alongside the branded one — e.g. "same medicine, ₹40 instead
// of ₹300 at your nearest Jan Aushadhi Kendra".
//
// Data source: data/janaushadhi-products.json — 2439 rows extracted from the
// official PMBJP product list PDF (Sr. No. / Drug Code / Generic Name / Unit
// Size / MRP). Extraction notes: ~99% of rows parsed cleanly; a small number
// of non-medicine SKUs (bandages, diapers, branded nutrition products with
// multi-line unit descriptions) may have minor unit_size noise — this does
// not affect generic_name quality for standard "<Drug> <Strength> Tablets/
// Capsules/Injection" entries, which is what OCR matching needs.
//
// This does NOT identify a medicine from a photo — that's a separate OCR
// step (see lib/ai.ts). This only answers "does the extracted text correspond
// to a Jan Aushadhi generic, and if so, which one" — matching, not vision.

import products from "@/data/janaushadhi-products.json";

export interface JanaushadhiProduct {
  sr_no: number;
  drug_code: string;
  generic_name: string;
  unit_size: string;
  mrp: number;
}

export interface JanaushadhiMatch {
  product: JanaushadhiProduct;
  score: number; // 0..1, higher is better
}

const DATA = products as JanaushadhiProduct[];

// Words that carry no identifying signal for matching purposes — dosage
// forms, pharmacopoeia markers, and generic packaging boilerplate. Strength
// values (100mg, 0.5% w/w, ...) are deliberately NOT stripped: two products
// that share a drug name but differ in strength are different SKUs, and
// collapsing them would make the match confidently wrong instead of just
// approximate.
const STOPWORDS = new Set([
  "ip", "bp", "usp", "tablets", "tablet", "capsules", "capsule", "injection",
  "syrup", "suspension", "oral", "eye", "ear", "drops", "drop", "cream",
  "ointment", "gel", "lotion", "solution", "powder", "sachet", "vial",
  "and", "for", "with", "of", "in", "the",
]);

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[()%.,\/]/g, " ")
    // "500mg" and "500 mg" must tokenize identically — OCR output and this
    // dataset are inconsistent about the space, and that inconsistency was
    // otherwise enough to rank combination drugs above an exact plain match.
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

// Classic edit distance — fine at this string length (few dozen chars) and
// this corpus size (2439 rows); no need for a trie/BK-tree at this scale.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    prev = curr;
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Token-set Jaccard overlap — catches word-order differences and partial
// name matches ("Paracetamol 500mg" vs "Paracetamol Tablets IP 500 mg")
// that raw edit distance scores poorly.
function tokenOverlap(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersection++;
  });
  const union = new Set(aTokens.concat(bTokens)).size;
  return intersection / union;
}

const NORMALIZED_CACHE: { tokens: string[]; normalized: string }[] = DATA.map((p) => ({
  tokens: tokenize(p.generic_name),
  normalized: normalize(p.generic_name),
}));

/**
 * Find the best Jan Aushadhi generic matches for an OCR-extracted or
 * user-typed medicine name/description.
 *
 * @param query   Raw text to match — e.g. "Paracetamol 500mg" or a fuller
 *                OCR string like "Crocin 500mg Tablet".
 * @param topN    Max number of candidates to return (default 3).
 * @param minScore Minimum combined score [0,1] to include (default 0.35 —
 *                deliberately permissive; the caller decides what's a
 *                confident-enough match to surface to a user).
 */
export function matchJanaushadhi(
  query: string,
  topN = 3,
  minScore = 0.35
): JanaushadhiMatch[] {
  const queryTokens = tokenize(query);
  const queryNormalized = normalize(query);

  const scored = DATA.map((product, i) => {
    const { tokens, normalized } = NORMALIZED_CACHE[i];
    const overlap = tokenOverlap(queryTokens, tokens);
    const editSim = similarity(queryNormalized, normalized);
    // Weighted toward token overlap: it's robust to strength/pack-size
    // differences and word reordering, which is the dominant source of
    // variance between OCR text and the official generic-name phrasing.
    const score = overlap * 0.7 + editSim * 0.3;
    return { product, score };
  });

  return scored
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
