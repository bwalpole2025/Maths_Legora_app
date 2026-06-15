import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from '../src/rrf.js';

describe('reciprocalRankFusion', () => {
  it('scores a single arm by 1/(c+rank), preserving order', () => {
    const fused = reciprocalRankFusion(
      [
        { id: 'a', rank: 1 },
        { id: 'b', rank: 2 },
      ],
      [],
      { c: 60, bothArmsBonus: 0 },
    );
    expect(fused.map((f) => f.id)).toEqual(['a', 'b']);
    expect(fused[0].score).toBeCloseTo(1 / 61);
    expect(fused[1].score).toBeCloseTo(1 / 62);
  });

  it('ranks a both-arms chunk above a same-rank single-arm chunk', () => {
    // 'x' is rank 2 in both arms; 'a' is rank 1 in semantic only.
    const fused = reciprocalRankFusion(
      [
        { id: 'a', rank: 1 },
        { id: 'x', rank: 2 },
      ],
      [{ id: 'x', rank: 2 }],
    );
    const x = fused.find((f) => f.id === 'x');
    const a = fused.find((f) => f.id === 'a');
    expect(x).toBeDefined();
    expect(x!.inSemantic && x!.inKeyword).toBe(true);
    expect(x!.score).toBeGreaterThan(a!.score);
    expect(fused[0].id).toBe('x');
  });

  it('breaks score ties by id ascending', () => {
    const fused = reciprocalRankFusion(
      [
        { id: 'b', rank: 1 },
        { id: 'a', rank: 1 },
      ],
      [],
      { bothArmsBonus: 0 },
    );
    expect(fused.map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('returns empty for empty inputs', () => {
    expect(reciprocalRankFusion([], [])).toEqual([]);
  });
});
