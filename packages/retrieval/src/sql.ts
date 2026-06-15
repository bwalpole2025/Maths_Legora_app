// Raw SQL for the two retrieval arms. Everything dynamic is a BOUND parameter via
// Prisma.sql / Prisma.join — never $queryRawUnsafe, never string interpolation
// into SQL text. The only "raw" text is the fixed SQL we author here.
import { Prisma } from '@imaia/db';
import { EMBEDDING_DIM } from './embedder.js';

export interface ChunkRow {
  id: string;
  text: string;
  curriculumTags: string[];
  citationLabel: string;
  sourceRef: string;
  sourceType: string;
  sourceId: string;
  licence: string;
  ownership: string;
}

export class RetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetrievalError';
  }
}

// pgvector literal '[a,b,...]' bound as ONE string parameter, cast ::vector in
// SQL. The numbers are validated finite + correct dimension first, so we never
// emit NaN/Infinity (which would be an invalid literal) or a wrong-width vector.
export function vectorParam(vec: number[]): Prisma.Sql {
  if (vec.length !== EMBEDDING_DIM) {
    throw new RetrievalError(
      `Query embedding must have ${EMBEDDING_DIM} dimensions, got ${vec.length}.`,
    );
  }
  for (const n of vec) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new RetrievalError('Query embedding contains a non-finite value.');
    }
  }
  const literal = `[${vec.join(',')}]`;
  return Prisma.sql`${literal}::vector`;
}

const SELECT_COLS = Prisma.sql`
  id, text, "curriculumTags", "citationLabel", "sourceRef",
  "sourceType"::text AS "sourceType", "sourceId", licence,
  "ownership"::text AS "ownership"
`;

export function semanticArmSql(queryVec: number[], where: Prisma.Sql, limit: number): Prisma.Sql {
  return Prisma.sql`
    SELECT ${SELECT_COLS}
    FROM "CorpusChunk"
    WHERE ${where} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorParam(queryVec)} ASC, id ASC
    LIMIT ${limit}
  `;
}

// Escape LIKE wildcards so maths notation matches LITERALLY. Backslash is the
// default LIKE escape char, so "\frac"/"\int" would silently mis-match without
// this — the single most error-prone spot in the feature. We escape \ % _ and
// pair every ILIKE with ESCAPE '\'.
export function escapeLike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function keywordArmSql(terms: string[], where: Prisma.Sql, limit: number): Prisma.Sql {
  if (terms.length === 0) {
    throw new RetrievalError('keywordArmSql requires at least one term.');
  }
  const hitExprs = terms.map(
    (t) => Prisma.sql`(CASE WHEN text ILIKE ${'%' + escapeLike(t) + '%'} ESCAPE '\\' THEN 1 ELSE 0 END)`,
  );
  const scoreExpr = Prisma.join(hitExprs, ' + ');
  return Prisma.sql`
    SELECT ${SELECT_COLS}, (${scoreExpr}) AS hits
    FROM "CorpusChunk"
    WHERE ${where} AND (${scoreExpr}) > 0
    ORDER BY hits DESC, id ASC
    LIMIT ${limit}
  `;
}
