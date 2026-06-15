import { describe, expect, it } from 'vitest';
import { extractTokens, keywordTerms } from '../src/tokens.js';

describe('extractTokens', () => {
  it('captures LaTeX commands as symbols, not split into words', () => {
    const t = extractTokens('\\frac{1}{2}');
    expect(t.symbols).toContain('\\frac');
    expect(t.words).toEqual([]);
    expect(t.numbers).toEqual(['1', '2']);
  });

  it('pulls symbol, identifier, word, and numbers from an integral', () => {
    const t = extractTokens('\\int_0^1 x^2 dx');
    expect(t.symbols).toContain('\\int');
    expect(t.identifiers).toContain('x'); // single-letter variable
    expect(t.words).toContain('dx');
    expect(t.numbers).toEqual(['0', '1', '2']);
  });

  it('drops stopwords but keeps single-letter identifiers', () => {
    const t = extractTokens('solve for x');
    expect(t.words).toContain('solve');
    expect(t.words).not.toContain('for'); // stopword
    expect(t.identifiers).toContain('x');
  });

  it('returns empty arrays for blank input', () => {
    expect(extractTokens('   ')).toEqual({ symbols: [], identifiers: [], numbers: [], words: [] });
  });
});

describe('keywordTerms', () => {
  it('orders high-signal symbols first and de-duplicates', () => {
    const terms = keywordTerms('\\int x x \\int');
    expect(terms[0]).toBe('\\int');
    expect(terms.filter((t) => t === '\\int')).toHaveLength(1);
    expect(terms.filter((t) => t === 'x')).toHaveLength(1);
  });

  it('is empty for a query with no literal terms', () => {
    expect(keywordTerms('   ')).toEqual([]);
  });

  it('caps the number of terms', () => {
    // 50 distinct letter-only words (no digits, no stopwords).
    const many = Array.from(
      { length: 50 },
      (_, i) => String.fromCharCode(97 + Math.floor(i / 5)) + String.fromCharCode(97 + (i % 5)) + 'q',
    ).join(' ');
    expect(keywordTerms(many, { maxTerms: 5 })).toHaveLength(5);
  });
});
