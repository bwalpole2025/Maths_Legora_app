// Reciprocal Rank Fusion — the (heuristic, no-model) reranker that merges the
// semantic and keyword arms. RRF fuses by RANK, so it sidesteps the fact that the
// two arms' raw scores are incomparable (cosine distance vs literal hit counts):
//   fused(id) = Σ over arms containing id of 1/(C + rank)  [+ bonus if in both]
// A small both-arms bonus favours chunks that are semantically close AND contain
// the literal notation — the best citations for a maths answer.

export interface RankedRow {
  id: string;
  rank: number; // 1-based position within its arm
}

export interface FusedRow {
  id: string;
  score: number;
  inSemantic: boolean;
  inKeyword: boolean;
}

export interface RrfOptions {
  c?: number; // RRF constant; default 60 (standard)
  bothArmsBonus?: number; // default 0.5 / (c + 1)
}

export function reciprocalRankFusion(
  semantic: RankedRow[],
  keyword: RankedRow[],
  opts: RrfOptions = {},
): FusedRow[] {
  const c = opts.c ?? 60;
  const bothArmsBonus = opts.bothArmsBonus ?? 0.5 / (c + 1);

  const acc = new Map<string, FusedRow>();
  const add = (rows: RankedRow[], arm: 'semantic' | 'keyword'): void => {
    for (const { id, rank } of rows) {
      const cur = acc.get(id) ?? { id, score: 0, inSemantic: false, inKeyword: false };
      cur.score += 1 / (c + rank);
      if (arm === 'semantic') cur.inSemantic = true;
      else cur.inKeyword = true;
      acc.set(id, cur);
    }
  };
  add(semantic, 'semantic');
  add(keyword, 'keyword');

  const fused = [...acc.values()];
  for (const row of fused) {
    if (row.inSemantic && row.inKeyword) row.score += bothArmsBonus;
  }
  // Deterministic order: score desc, ties broken by id asc.
  fused.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return fused;
}
