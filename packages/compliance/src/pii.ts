// PII detection + redaction.
//
// Patterns are deliberately specific so they catch real student contact details
// (email, phone, postcode, URL, @handle) without false-positiving on corpus refs
// like "edexcel-9ma0#6.2" or on LaTeX maths. Used to (a) scrub any text before it
// could be logged and (b) PROVE a value (e.g. the orchestrator trace) carries no
// PII before it is returned/persisted.

interface PiiPattern {
  name: string;
  re: RegExp;
}

const PATTERNS: PiiPattern[] = [
  { name: 'email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { name: 'url', re: /https?:\/\/[^\s]+/g },
  { name: 'ukPostcode', re: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi },
  // 9+ chars of phone-ish runs (digits/space/()+-.), bounded so it won't grab a
  // lone digit out of "9ma0#6.2".
  { name: 'phone', re: /(?<!\d)\+?\d[\d ().-]{7,}\d(?!\d)/g },
  { name: 'handle', re: /(?<![\w@])@[A-Za-z0-9_]{2,}\b/g },
  { name: 'longDigits', re: /\b\d{7,}\b/g },
];

/** Replace any detected PII in a string with "[redacted]". */
export function redactPii(text: string): string {
  let out = text;
  for (const { re } of PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

/** Names of the PII kinds found anywhere within a value (deep-walked). */
export function findPii(value: unknown): string[] {
  const hits: string[] = [];
  walk(value, hits);
  return hits;
}

export function containsPii(value: unknown): boolean {
  return findPii(value).length > 0;
}

/** Throw if `value` (deep-walked) contains any PII. Use to gate logs/traces. */
export function assertNoPii(value: unknown, label = 'value'): void {
  const hits = findPii(value);
  if (hits.length > 0) {
    const kinds = [...new Set(hits)].join(', ');
    throw new Error(`PII violation: ${label} contains ${kinds} (AADC / UK-GDPR).`);
  }
}

function walk(value: unknown, hits: string[]): void {
  if (typeof value === 'string') {
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0; // /g patterns are stateful with .test — reset each use.
      if (re.test(value)) hits.push(name);
    }
  } else if (Array.isArray(value)) {
    for (const v of value) walk(v, hits);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) walk(v, hits);
  }
}
