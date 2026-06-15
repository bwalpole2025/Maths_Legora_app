import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POLICY, type CategoryPolicy, type DataCategory } from '../src/policy.js';

type FixturePolicy = Record<DataCategory, Pick<CategoryPolicy, 'personalData' | 'retentionDays' | 'lawfulBasis'>>;
const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/policy-fixtures.json', import.meta.url), 'utf8'),
) as { policy: FixturePolicy };

describe('POLICY matches the golden policy fixtures', () => {
  const categories = Object.keys(fixtures.policy) as DataCategory[];

  it('declares exactly the fixture categories', () => {
    expect(new Set(Object.keys(POLICY))).toEqual(new Set(categories));
  });

  for (const category of Object.keys(fixtures.policy) as DataCategory[]) {
    it(`${category}: personalData / retentionDays / lawfulBasis match`, () => {
      const expected = fixtures.policy[category];
      const actual = POLICY[category];
      expect(actual.personalData).toBe(expected.personalData);
      expect(actual.retentionDays).toBe(expected.retentionDays);
      expect(actual.lawfulBasis).toBe(expected.lawfulBasis);
    });
  }

  it('treats the trace as non-personal (so it is safe to persist)', () => {
    expect(POLICY.trace.personalData).toBe(false);
  });
});
