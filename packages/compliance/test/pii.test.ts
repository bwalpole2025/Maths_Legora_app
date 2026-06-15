import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertNoPii, containsPii, redactPii } from '../src/pii.js';

interface Fixtures {
  redaction: { in: string; out: string }[];
  containsPii: { value: string; isPii: boolean }[];
}
const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/policy-fixtures.json', import.meta.url), 'utf8'),
) as Fixtures;

describe('redactPii (matches policy fixtures)', () => {
  for (const { in: input, out } of fixtures.redaction) {
    it(`redacts: ${input}`, () => {
      expect(redactPii(input)).toBe(out);
    });
  }
});

describe('containsPii (matches policy fixtures)', () => {
  for (const { value, isPii } of fixtures.containsPii) {
    it(`${isPii ? 'flags' : 'ignores'}: ${value}`, () => {
      expect(containsPii(value)).toBe(isPii);
    });
  }

  it('does not flag a corpus sourceRef or LaTeX', () => {
    expect(containsPii(['edexcel-9ma0#6.2', 'dfe-content-store#3.1'])).toBe(false);
    expect(containsPii({ a: '(x+1)^2 = x^2 + 2x + 1' })).toBe(false);
  });

  it('deep-walks nested objects and arrays', () => {
    expect(containsPii({ outer: { inner: ['hi', 'mail kid@example.com'] } })).toBe(true);
  });
});

describe('assertNoPii', () => {
  it('passes for a PII-free trace-shaped object', () => {
    const trace = { retrievalHits: ['edexcel-9ma0#6.2'], verificationCalls: [{ kind: 'verifyAnswer', status: 'correct' }], routing: 'full_solution' };
    expect(() => assertNoPii(trace, 'trace')).not.toThrow();
  });

  it('throws naming the field when PII is present', () => {
    expect(() => assertNoPii({ retrievalHits: ['kid@example.com'] }, 'trace')).toThrow(/PII.*trace/i);
  });
});
