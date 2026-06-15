// Maths-aware token extraction for the keyword/symbol retrieval arm.
//
// Maths needs LITERAL matching of notation and identifiers (\frac, \int, x, dx)
// that semantic similarity alone misses. We pull out LaTeX commands, identifiers,
// numbers, and ordinary words; a tiny maths-safe stopword list trims only
// high-frequency English glue and NEVER symbols, identifiers, or single letters.

export interface ExtractedTokens {
  symbols: string[]; // LaTeX commands: \frac, \int, \sqrt, ...
  identifiers: string[]; // single-letter variables: x, n, ...
  numbers: string[]; // numeric literals
  words: string[]; // alphabetic words (length >= 2), lowercased, minus stopwords
}

// Small and maths-safe: only common English glue. Deliberately excludes single
// letters and maths words (e.g. never "e" — Euler's number; "sum"; "x").
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'by',
  'is', 'are', 'be', 'as', 'at', 'that', 'this', 'these', 'those', 'it',
  'find', 'given', 'where', 'using', 'use',
]);

const LATEX_CMD = /\\[a-zA-Z]+/g;
const ALPHA = /[A-Za-z]+/g;
const NUMBER = /\d+(?:\.\d+)?/g;

export function extractTokens(text: string): ExtractedTokens {
  const symbols = text.match(LATEX_CMD) ?? [];
  // Strip LaTeX commands before pulling letter-runs so we don't re-capture their
  // command letters (e.g. "frac" out of "\frac").
  const deLatex = text.replace(LATEX_CMD, ' ');
  const alpha = deLatex.match(ALPHA) ?? [];
  const numbers = deLatex.match(NUMBER) ?? [];

  const identifiers: string[] = [];
  const words: string[] = [];
  for (const tok of alpha) {
    if (tok.length === 1) {
      identifiers.push(tok); // single-letter variable
    } else if (!STOPWORDS.has(tok.toLowerCase())) {
      words.push(tok.toLowerCase());
    }
  }
  return { symbols, identifiers, numbers, words };
}

export interface KeywordTermsOptions {
  maxTerms?: number; // cap the keyword SQL size; default 24
}

// Flat, de-duplicated, ordered (high-signal symbols first) term list for the
// keyword SQL arm. Everything is matched literally; numbers are included.
export function keywordTerms(text: string, opts: KeywordTermsOptions = {}): string[] {
  const { maxTerms = 24 } = opts;
  const { symbols, identifiers, numbers, words } = extractTokens(text);
  const ordered = [...symbols, ...words, ...identifiers, ...numbers];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of ordered) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= maxTerms) break;
  }
  return out;
}
