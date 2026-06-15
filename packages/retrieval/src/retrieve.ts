// Hybrid retrieval — INTERFACES.md §1.
//
// retrieve(query) runs two arms over CorpusChunk — semantic (pgvector cosine) and
// keyword/symbol (literal ILIKE) — applies the curriculum filter to BOTH, fuses
// with Reciprocal Rank Fusion, and returns the top k as RetrievedChunks carrying
// citation + curriculumTags + provenance + score. It is the relevance layer: NO
// model calls, NO correctness claims. The query embedding comes from an injected
// Embedder port (the seam to prompt-06's embedding service).
import { assertProvenance, type DbClient } from '@imaia/db';
import {
  RetrievalQuerySchema,
  type RetrievalQuery,
  type RetrievalResult,
  type RetrievedChunk,
} from '@imaia/contracts';
import type { Embedder } from './embedder.js';
import { curriculumWhere } from './curriculum.js';
import { keywordTerms } from './tokens.js';
import { keywordArmSql, semanticArmSql, RetrievalError, type ChunkRow } from './sql.js';
import { reciprocalRankFusion, type RankedRow } from './rrf.js';

const DEFAULT_K = 8; // INTERFACES.md: RetrievalQuery.k defaults to 8

export interface RetrieveDeps {
  db: DbClient;
  embed: Embedder;
  fanout?: number; // per-arm candidate LIMIT; default max(50, k*5)
}

export async function retrieve(query: RetrievalQuery, deps: RetrieveDeps): Promise<RetrievalResult> {
  const parsed = RetrievalQuerySchema.parse(query);
  const k = parsed.k ?? DEFAULT_K;
  const fanout = deps.fanout ?? Math.max(50, k * 5);
  const where = curriculumWhere(parsed.curriculumFilter);

  // Semantic arm. Embedder failure PROPAGATES — never silently degrade to
  // keyword-only, which would hide a quality regression behind a 200.
  const queryVec = await deps.embed(parsed.text);
  const semanticRows = await deps.db.$queryRaw<ChunkRow[]>(
    semanticArmSql(queryVec, where, fanout),
  );

  // Keyword/symbol arm. Skipped only when the query has no literal terms.
  const terms = keywordTerms(parsed.text);
  const keywordRows =
    terms.length > 0
      ? await deps.db.$queryRaw<ChunkRow[]>(keywordArmSql(terms, where, fanout))
      : [];

  // Dedup rows across arms (a chunk in both appears once), keep the row data.
  const rowById = new Map<string, ChunkRow>();
  for (const r of semanticRows) rowById.set(r.id, r);
  for (const r of keywordRows) if (!rowById.has(r.id)) rowById.set(r.id, r);

  const toRanked = (rows: ChunkRow[]): RankedRow[] =>
    rows.map((r, i) => ({ id: r.id, rank: i + 1 }));
  const fused = reciprocalRankFusion(toRanked(semanticRows), toRanked(keywordRows));

  const chunks: RetrievedChunk[] = fused.slice(0, k).map((f) => {
    const row = rowById.get(f.id);
    if (!row) throw new RetrievalError(`fused id ${f.id} missing from candidate rows`);
    return toRetrievedChunk(row, f.score);
  });

  return { chunks, query: parsed };
}

// Map a DB row to the contract shape, enforcing the hard guarantee: never return
// a chunk without provenance / citation (it shouldn't exist post-ingestion, but
// we assert it here regardless of how the row got into the table).
function toRetrievedChunk(row: ChunkRow, score: number): RetrievedChunk {
  assertProvenance({ licence: row.licence, ownership: row.ownership });
  if (!row.citationLabel?.trim() || !row.sourceRef?.trim() || !row.sourceId?.trim()) {
    throw new RetrievalError(`CorpusChunk ${row.id} is missing citation/source fields.`);
  }
  return {
    text: row.text,
    citation: { label: row.citationLabel, sourceRef: row.sourceRef },
    curriculumTags: row.curriculumTags,
    provenance: {
      sourceType: row.sourceType as RetrievedChunk['provenance']['sourceType'],
      sourceId: row.sourceId,
      licence: row.licence,
      ownership: row.ownership as RetrievedChunk['provenance']['ownership'],
    },
    score,
  };
}
