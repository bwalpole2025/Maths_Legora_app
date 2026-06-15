// Integration-test helpers for the docker-compose pgvector DB.
//
// Embeddings use a "basis vector" trick: each chunk's embedding is a unit vector
// on one axis, and the fake embedder returns a unit vector on one axis too. Cosine
// distances are then exactly {0, 1}, so ordering is fully deterministic — no HNSW
// recall flakiness, no floating-point ties.
import { Prisma, prisma, type Ownership, type SourceType } from '@imaia/db';
import { EMBEDDING_DIM } from '../../src/embedder.js';
import { vectorParam } from '../../src/sql.js';

export { prisma };

// Returns true only if Postgres is reachable AND the CorpusChunk table exists
// (i.e. migrations have been applied). Times out fast so a missing DB skips
// rather than hangs.
export async function testDbAvailable(timeoutMs = 2_000): Promise<boolean> {
  const probe = (async () => {
    try {
      await prisma.$queryRawUnsafe('SELECT 1 FROM "CorpusChunk" LIMIT 1');
      return true;
    } catch {
      return false;
    }
  })();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([probe, timeout]);
}

export function basisVector(index: number): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  v[index] = 1;
  return v;
}

export interface SeedChunk {
  id: string;
  text: string;
  curriculumTags: string[];
  citationLabel: string;
  sourceRef: string;
  sourceType: SourceType;
  sourceId: string;
  licence: string;
  ownership: Ownership;
  concept: number; // basis-vector axis for the embedding
}

export async function truncateCorpus(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "CorpusChunk" RESTART IDENTITY CASCADE');
}

export async function seedChunks(chunks: SeedChunk[]): Promise<void> {
  for (const c of chunks) {
    // create() runs the provenanceGuard; embedding is backfilled via raw SQL
    // because Prisma has no first-class vector type.
    await prisma.corpusChunk.create({
      data: {
        id: c.id,
        text: c.text,
        curriculumTags: c.curriculumTags,
        citationLabel: c.citationLabel,
        sourceRef: c.sourceRef,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        licence: c.licence,
        ownership: c.ownership,
      },
    });
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "CorpusChunk" SET embedding = ${vectorParam(basisVector(c.concept))} WHERE id = ${c.id}`,
    );
  }
}
