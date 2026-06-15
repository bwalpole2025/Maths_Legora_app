import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expiresAt, isExpired, minimise, minimiseStudentTurn } from '../src/retention.js';
import { DAY_MS, type DataCategory } from '../src/policy.js';

interface Fixtures {
  retention: { category: DataCategory; createdAtMs: number; nowMs: number; expired: boolean }[];
  minimise: { record: string; in: Record<string, unknown>; out: Record<string, unknown> }[];
}
const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/policy-fixtures.json', import.meta.url), 'utf8'),
) as Fixtures;

describe('retention (matches policy fixtures)', () => {
  for (const f of fixtures.retention) {
    it(`${f.category}: expired=${f.expired} at now=${f.nowMs}`, () => {
      expect(isExpired(f.category, f.createdAtMs, f.nowMs)).toBe(f.expired);
    });
  }

  it('expiresAt offsets by the retention window', () => {
    expect(expiresAt('trace', 0)).toBe(30 * DAY_MS);
    expect(expiresAt('studentMessage', 1234)).toBe(1234); // ephemeral
  });
});

describe('minimise (matches policy fixtures)', () => {
  for (const f of fixtures.minimise) {
    it(`drops personal-data fields from a ${f.record}`, () => {
      expect(minimiseStudentTurn(f.in)).toEqual(f.out);
    });
  }

  it('drops only the named fields', () => {
    expect(minimise({ a: 1, secret: 'x', b: 2 }, ['secret'])).toEqual({ a: 1, b: 2 });
  });
});
